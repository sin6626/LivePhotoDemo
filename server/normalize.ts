import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { link, mkdir, mkdtemp, open, rmdir, stat, unlink } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';
import { isMp4Brand } from '../app/lib/motion-photo.ts';

const run = promisify(execFile);
const MB = 1024 * 1024;
class MediaError extends Error {
  status: number;
  constructor(message: string, status = 422) { super(message); this.status = status; }
}
type Track = { codec_type?: string; codec_tag_string?: string; codec_name?: string; profile?: string; level?: number; pix_fmt?: string; width?: number; height?: number; avg_frame_rate?: string; color_transfer?: string; channels?: number; disposition?: { attached_pic?: number }; side_data_list?: { side_data_type: string }[] };
type Probe = { streams?: Track[]; format?: { duration?: string; tags?: { major_brand?: string } } };
export function videoPlan(probe: Probe) {
  const tracks = probe.streams ?? [];
  const v = tracks.find(t => t.codec_type === 'video' && !t.disposition?.attached_pic);
  if (!v) throw new MediaError('A video track is required.');
  const duration = Number(probe.format?.duration);
  if (!(duration > 0 && duration <= 30)) throw new MediaError('Choose a video of 30 seconds or less.');
  const w = v.width ?? 0, h = v.height ?? 0;
  if (!(w > 0 && h > 0) || Math.max(w, h) > 4096 || w * h > 4096 * 2160) throw new MediaError('Choose a video up to 4K.');
  if (['dvh1','dvhe'].includes(v.codec_tag_string ?? '') || ['smpte2084', 'arib-std-b67'].includes(v.color_transfer ?? '') || v.side_data_list?.some(d => /dovi|dolby vision/i.test(d.side_data_type))) throw new MediaError('HDR and Dolby Vision need tone mapping. Export an SDR copy first.');
  if (/(10|12|14|16)(le|be)$/.test(v.pix_fmt ?? '') && (!v.color_transfer || v.color_transfer === 'unknown')) throw new MediaError('High-bit-depth video needs an explicit SDR color transfer. Export an SDR copy first.');
  const [n, d] = (v.avg_frame_rate ?? '').split('/').map(Number);
  const fps = n / d;
  const a = tracks.find(t => t.codec_type === 'audio');
  const copyVideo = v.codec_name === 'h264' && ['Baseline','Constrained Baseline','Main','High'].includes(v.profile ?? '') && (v.level ?? 0) > 0 && (v.level ?? 99) <= 41 && v.pix_fmt === 'yuv420p' && Math.max(w,h) <= 1920 && Math.min(w,h) <= 1080 && w % 2 === 0 && h % 2 === 0 && fps > 0 && fps <= 30.001;
  const copyAudio = !a || (a.codec_name === 'aac' && a.profile === 'LC' && (a.channels ?? 0) > 0 && (a.channels ?? 0) <= 2);
  const original = isMp4Brand((probe.format?.tags?.major_brand ?? '').slice(0,4)) && tracks.length === (a ? 2 : 1);
  return { action: copyVideo && copyAudio ? (original ? 'original' : 'remuxed') : 'converted', copyVideo, copyAudio } as const;
}
async function tool(name: string, args: string[], signal: AbortSignal) {
  try { return (await run(name, args, { signal, killSignal: 'SIGKILL', timeout: 90000, maxBuffer: 1024 * 1024 })).stdout; }
  catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') throw new MediaError(`${name} is not installed on the demo host.`, 503);
    if (signal.aborted || (e instanceof Error && 'killed' in e && e.killed)) throw new MediaError('Media processing timed out or was cancelled.', 408);
    throw new MediaError(`Could not process this file with ${name}. Check that the file is valid.`);
  }
}
const movInput = ['-max_pixels',String(4096*2160),'-protocol_whitelist','file','-enable_drefs','0','-use_absolute_path','0','-f','mov'];
async function probeVideo(input: string, signal: AbortSignal): Promise<Probe> {
  return JSON.parse(await tool('ffprobe',['-v','error','-threads','2',...movInput,'-show_format','-show_streams','-of','json',input],signal));
}
async function normalize(kind: 'image'|'video', input: string, output: string, signal: AbortSignal) {
  const handle = await open(input, 'r');
  const prefix = Buffer.alloc(64);
  try { await handle.read(prefix, 0, prefix.length, 0); } finally { await handle.close(); }
  const atom = prefix.toString('ascii',4,8);
  if (kind === 'image' ? atom !== 'ftyp' : !['ftyp','wide','free','moov','mdat'].includes(atom)) throw new MediaError('Unsupported media container.');
  if (kind === 'image') {
    const info = await tool('sips',['-g','format','-g','pixelWidth','-g','pixelHeight',input],signal);
    if (!/format:\s*hei[cf]\b/i.test(info)) throw new MediaError('Choose a valid HEIC or HEIF image.');
    const w = Number(/pixelWidth:\s*(\d+)/.exec(info)?.[1]);
    const h = Number(/pixelHeight:\s*(\d+)/.exec(info)?.[1]);
    if (!(w > 0 && h > 0 && w*h <= 24_000_000)) throw new MediaError('Images must be no larger than 24 megapixels.');
    await tool('sips',['-s','format','jpeg','-s','formatOptions','92',input,'--out',output],signal);
    return 'converted';
  }
  const source = await probeVideo(input, signal);
  const plan = videoPlan(source);
  if (plan.action === 'original' && isMp4Brand(prefix.toString('ascii',8,12))) return 'original';
  const scale = "scale=w='min(iw,if(gte(iw,ih),1920,1080))':h='min(ih,if(gte(iw,ih),1080,1920))':force_original_aspect_ratio=decrease:force_divisible_by=2:out_range=tv";
  await tool('ffmpeg',['-nostdin','-v','error','-threads','2',...movInput,'-i',input,'-map','0:V:0','-map','0:a:0?',
    ...(plan.copyVideo ? ['-c:v','copy'] : ['-filter_threads','1','-vf',scale,'-c:v','libx264','-threads:v','2','-preset','veryfast','-crf','20','-maxrate','20M','-bufsize','40M','-pix_fmt','yuv420p','-profile:v','high','-level:v','4.1','-color_range','tv','-fpsmax','30']),
    ...(plan.copyAudio ? ['-c:a','copy'] : ['-c:a','aac','-ac','2','-b:a','128k']),
    '-map_metadata','-1','-map_chapters','-1','-t','30','-movflags','+faststart','-f','mp4','-n',output],signal);
  const derived = await probeVideo(output, signal);
  if (videoPlan(derived).action !== 'original' || Math.abs(Number(source.format?.duration)-Number(derived.format?.duration)) > 0.15) throw new MediaError('The converted clip did not pass format and duration checks.');
  return plan.copyVideo && plan.copyAudio ? 'remuxed' : 'converted';
}
async function removeTemporary(path: string) {
  try { await unlink(path); } catch (e) { if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e; }
}
async function archive(file: string, destination: string) {
  // 同文件系统内原子创建，不覆盖已有原件；清理临时名称不会删除归档的内容。
  try { await link(file,destination); } catch (e) { if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST')) throw e; }
}
export function localMediaPlugin(): Plugin {
  const root = fileURLToPath(new URL('../.local-media/', import.meta.url));
  let busy = false;
  async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (req.url?.split('?')[0] !== '/api/media/normalize') return next();
    res.setHeader('Cache-Control','no-store');
    const fail = (status: number, message: string) => { if (!res.destroyed && !res.headersSent) { res.writeHead(status, { 'Content-Type':'text/plain; charset=utf-8' }); res.end(message); } };
    const host = req.headers.host ?? '';
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host) || req.headers.origin !== `http://${host}`) return fail(403,'Only same-origin requests on this Mac are allowed.');
    if (req.method !== 'POST') return fail(405,'Use POST.');
    const kind = req.headers['x-media-kind'];
    if ((kind !== 'image' && kind !== 'video') || req.headers['content-type'] !== 'application/octet-stream') return fail(415,'Expected an image or video file.');
    let name: string;
    try { name = decodeURIComponent(String(req.headers['x-media-name'] ?? '')); } catch { return fail(400,'Invalid filename.'); }
    if (!name || /[/\\:\x00-\x1f\x7f]/.test(name) || /^\.+$/.test(name) || Buffer.byteLength(name)>255) return fail(400,'Invalid filename.');
    const limit = (kind === 'image' ? 20 : 100) * MB;
    const length = Number(req.headers['content-length']);
    if (!Number.isSafeInteger(length) || length <= 0 || length > limit) return fail(413,'Invalid file size or upload exceeds the limit.');
    if (busy) return fail(429,'Another file is being processed. Please try again shortly.');
    busy = true;
    const cancel = new AbortController();
    const abort = () => { if (!res.writableFinished) cancel.abort(); };
    res.once('close', abort);
    const signal = AbortSignal.any([cancel.signal, AbortSignal.timeout(120000)]);
    let dir: string | undefined;
    const ext = kind === 'image' ? 'jpg' : 'mp4';
    try {
      await mkdir(root,{recursive:true,mode:0o700});
      dir = await mkdtemp(join(root,'.job-'));
      const input = join(dir,'input'), output = join(dir,`output.${ext}`);
      const hash = createHash('sha256'); let bytes = 0;
      await pipeline(req,new Transform({ transform(chunk: Buffer, _, cb) { bytes += chunk.length; if (bytes > limit) return cb(new MediaError('File too large.',413)); hash.update(chunk); cb(null,chunk); } }),createWriteStream(input,{flags:'wx',mode:0o600}),{signal});
      if (bytes !== length) throw new MediaError('Incomplete upload.');
      const id = hash.digest('hex');
      const folder = join(root,id);
      const compatible = join(folder,`compatible.${ext}`);
      let action: string;
      try { await link(compatible,output); action = 'cached'; }
      catch (e) {
        if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT')) throw e;
        action = await normalize(kind,input,output,signal);
      }
      const size = action === 'original' ? bytes : (await stat(output)).size;
      if (size <= 0 || size > limit) throw new MediaError('Converted file exceeds the size limit.');
      signal.throwIfAborted();
      await mkdir(join(folder,'original'),{recursive:true,mode:0o700});
      await archive(input,join(folder,'original',name));
      if (action !== 'original' && action !== 'cached') await archive(output,compatible);
      res.setHeader('X-Media-Id',id);
      res.setHeader('X-Media-Action',action);
      if (action === 'original') { res.writeHead(204); res.end(); }
      else { res.writeHead(200,{'Content-Type':kind==='image'?'image/jpeg':'video/mp4','Content-Length':size}); await pipeline(createReadStream(output),res,{signal}); }
    } catch (e) { fail(e instanceof MediaError ? e.status : signal.aborted ? 408 : 500, e instanceof MediaError ? e.message : signal.aborted ? 'Request cancelled.' : 'Local conversion failed. Check disk space and file permissions.'); }
    finally {
      try {
        if (dir) {
          await removeTemporary(join(dir,'input'));
          await removeTemporary(join(dir,`output.${ext}`));
          await rmdir(dir);
        }
      } catch { console.error('Unable to clean up a LivePhotoDemo temporary job.'); }
      res.off('close',abort); busy = false;
    }
  }
  return { name:'demo-local-media', configureServer(server) { server.middlewares.use(handle); }, configurePreviewServer(server) { server.middlewares.use(handle); } };
}
