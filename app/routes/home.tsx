import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ArrowRight, Check, CircleHelp, Download, Film, Fingerprint, ImagePlus, Layers2, LoaderCircle, LockKeyhole, Plus, Radio, RotateCcw, Volume2 } from 'lucide-react';
import { AboutDialog, Button, Switch } from '../components/ui';
import { createMotionPhoto, extractMotionPhoto } from '../lib/motion-photo';
import { readImage, readVideo } from '../lib/media';

export function meta() { return [{ title: 'Motion Lab · 把瞬间，变成实况' }, { name: 'description', content: '在浏览器本地将 PNG/JPG 和 MP4 合成为 Motion Photo。' }]; }
function useBlobUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!blob) { setUrl(''); return; } const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
type Result = { blob: Blob; image: Blob; video: Blob; name: string };

export default function Home() {
  const [photo, setPhoto] = useState<Awaited<ReturnType<typeof readImage>>>();
  const [clip, setClip] = useState<Awaited<ReturnType<typeof readVideo>>>();
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState('');
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const photoUrl = useBlobUrl(result?.image ?? photo?.blob);
  const videoUrl = useBlobUrl(result?.video ?? clip?.blob);
  const downloadUrl = useBlobUrl(result?.blob);

  function stop() { player.current?.pause(); setPlaying(false); }
  useEffect(() => {
    const pause = () => { player.current?.pause(); setPlaying(false); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); };
  }, []);

  async function select(file: File | undefined, kind: 'photo' | 'video') {
    if (!file || lock.current) return;
    lock.current = true; stop(); setBusy('正在读取素材'); setError(''); setResult(undefined);
    try { kind === 'photo' ? setPhoto(await readImage(file)) : setClip(await readVideo(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '素材读取失败。'); }
    finally { lock.current = false; setBusy(''); }
  }
  async function generate() {
    if (!photo || !clip || lock.current) return;
    lock.current = true; stop(); setBusy('正在合成并检查文件'); setError('');
    try {
      const blob = await createMotionPhoto(photo.blob, clip.blob);
      const extracted = await extractMotionPhoto(blob);
      const name = photo.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]/gu, '_') || 'photo';
      setResult({ blob, ...extracted, name: `${name}_MP.jpg` });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '合成失败，请重新选择素材。'); }
    finally { lock.current = false; setBusy(''); }
  }
  function play() {
    if (!player.current || !photo || busy) return;
    player.current.currentTime = 0;
    setPlaying(true);
    void player.current.play().catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setPlaying(false); setError('视频播放失败，请检查浏览器是否支持此编码。');
    });
  }
  function reset() { stop(); setPhoto(undefined); setClip(undefined); setResult(undefined); setError(''); }

  return <div {...stylex.props(s.page)}>
    <header {...stylex.props(s.header)}><a href="/" {...stylex.props(s.brand)}><span {...stylex.props(s.brandIcon)}><Radio size={22} /></span>motion<span {...stylex.props(s.brandLight)}>lab</span><span {...stylex.props(s.demo)}>DEMO</span></a><div {...stylex.props(s.headerRight)}><span {...stylex.props(s.local)}><span {...stylex.props(s.dot)} />本地处理</span><AboutDialog /></div></header>
    <main {...stylex.props(s.main)}>
      <div {...stylex.props(s.intro)}><div><p {...stylex.props(s.eyebrow)}>A LITTLE MOTION. A LOT OF LIFE.</p><h1 {...stylex.props(s.heading)}>把瞬间，变成实况<span {...stylex.props(s.headingDot)}>。</span></h1><p {...stylex.props(s.subtitle)}>一张照片，一小段视频。让静止的画面，再多一点生动。</p></div><span {...stylex.props(s.formatBadge)}><Layers2 size={15} /> Motion Photo 实验室</span></div>
      <div {...stylex.props(s.workspace)}>
        <section {...stylex.props(s.inputs)} aria-label="合成素材">
          <div {...stylex.props(s.sectionHeading)}><h2 {...stylex.props(s.sectionTitle)}>准备你的素材</h2><span {...stylex.props(s.step)}>01 / INPUT</span></div>
          <div {...stylex.props(s.uploadGroup)}><div {...stylex.props(s.fieldTitle)}><span>封面图片</span><span {...stylex.props(s.meta)}>PNG / JPG</span></div><label {...stylex.props(s.dropzone, !!photo && s.dropzoneReady)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'photo'); }}><input aria-label="选择封面图片" type="file" accept="image/png,image/jpeg,.jpg,.jpeg,.png" disabled={!!busy} {...stylex.props(s.fileInput)} onChange={event => { void select(event.target.files?.[0], 'photo'); event.target.value = ''; }} /><span {...stylex.props(s.uploadIcon)}>{photo ? <Check size={22} /> : <ImagePlus size={24} />}</span><strong {...stylex.props(s.fileName)}>{photo?.name ?? '点击选择或拖入一张图片'}</strong><span {...stylex.props(s.meta)}>{photo ? `${photo.width} × ${photo.height} · ${size(photo.blob.size)}` : '保留画面的第一眼 · 最大 20 MB'}</span></label></div>
          <div {...stylex.props(s.between)}><Plus size={16} /></div>
          <div {...stylex.props(s.uploadGroup)}><div {...stylex.props(s.fieldTitle)}><span>动态视频</span><span {...stylex.props(s.meta)}>MP4</span></div><label {...stylex.props(s.dropzone, !!clip && s.dropzoneReady)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'video'); }}><input aria-label="选择动态视频" type="file" accept="video/mp4,.mp4" disabled={!!busy} {...stylex.props(s.fileInput)} onChange={event => { void select(event.target.files?.[0], 'video'); event.target.value = ''; }} /><span {...stylex.props(s.uploadIcon)}>{clip ? <Check size={22} /> : <Film size={24} />}</span><strong {...stylex.props(s.fileName)}>{clip?.name ?? '点击选择或拖入一段视频'}</strong><span {...stylex.props(s.meta)}>{clip ? `${clip.duration.toFixed(1)} 秒 · ${size(clip.blob.size)}` : '建议 2–5 秒 · 最大 100 MB / 30 秒'}</span></label></div>
          <div {...stylex.props(s.setting)}><div {...stylex.props(s.settingLabel)}><Volume2 size={17} /><label htmlFor="sound">预览时播放声音</label></div><Switch id="sound" checked={sound} onCheckedChange={setSound} /></div>
          <p {...stylex.props(s.smallNote)}>视频原声会保留在文件中；此开关仅控制预览。</p>
          <div {...stylex.props(s.actions)}><Button disabled={!photo || !clip || !!busy} onClick={() => void generate()}>{busy ? <LoaderCircle size={18} /> : <Layers2 size={18} />}{busy || (result ? '重新合成 Motion Photo' : '合成 Motion Photo')}{!busy && <ArrowRight size={18} />}</Button></div>
          <p {...stylex.props(s.privacy)}><LockKeyhole size={12} /> 素材不上传，所有处理都在当前浏览器中完成</p>
        </section>
        <section {...stylex.props(s.previewSection)} aria-label="实况预览">
          <div {...stylex.props(s.sectionHeading)}><h2 {...stylex.props(s.sectionTitle)}>实况预览</h2><span {...stylex.props(s.previewBadge)}><span {...stylex.props(s.dot)} />{result ? '已合成' : 'PREVIEW'}</span></div>
          <button type="button" aria-label="按住预览实况" disabled={!photo || !clip || !!busy} {...stylex.props(s.preview)} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); play(); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={event => event.preventDefault()} onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); play(); } }} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); stop(); } }} onBlur={stop}>
            {photoUrl ? <img src={photoUrl} alt="实况图封面" draggable={false} {...stylex.props(s.media)} /> : <div {...stylex.props(s.empty)}><span {...stylex.props(s.emptyIcon)}><ImagePlus size={36} strokeWidth={1.1} /></span><h3 {...stylex.props(s.emptyTitle)}>你的下一张实况图</h3><p {...stylex.props(s.emptyText)}>从左侧添加一张喜欢的照片<br />让它的故事，继续播放。</p><span {...stylex.props(s.emptyLabel)}>STILL + MOTION</span></div>}
            {videoUrl && <video ref={player} src={videoUrl} muted={!sound} playsInline preload="metadata" onEnded={stop} onError={() => { stop(); setError('视频预览无法加载，请更换为 H.264 MP4。'); }} {...stylex.props(s.media, s.video, playing && s.visible)} />}
            {photo && <span {...stylex.props(s.live)}><Radio size={15} /> {playing ? 'PLAYING' : 'MOTION'}</span>}
          </button>
          <div {...stylex.props(s.previewCaption)}><Fingerprint size={17} /><span>{result ? '按住预览 · 当前播放从生成文件中读取的视频' : '按住画面播放，松开回到照片'}</span>{(photo || clip) && <button aria-label="清空素材" disabled={!!busy} onClick={reset} {...stylex.props(s.reset)}><RotateCcw size={14} />重置</button>}</div>
          {result ? <div {...stylex.props(s.result)}><div {...stylex.props(s.resultRow)}><span {...stylex.props(s.successIcon)}><Check size={19} /></span><div {...stylex.props(s.resultText)}><strong {...stylex.props(s.fileName)}>你的 Motion Photo 已生成</strong><span {...stylex.props(s.meta)}>{result.name} · {size(result.blob.size)}</span></div><Button asChild secondary><a href={downloadUrl} download={result.name}><Download size={16} />下载 JPG</a></Button></div><p {...stylex.props(s.resultNote)}>图片与视频结构检查通过。相册识别效果，仍需在目标设备验证。</p></div> : <div {...stylex.props(s.recipe)}><span><ImagePlus size={16} /> 静态图片</span><Plus size={14} /><span><Film size={16} /> 一段视频</span><ArrowRight size={15} /><strong><Radio size={16} /> 一张实况图</strong></div>}
        </section>
      </div>
      <div role="status" aria-live="polite" {...stylex.props(s.status)}>{busy}</div>
      {error && <div role="alert" {...stylex.props(s.error)}><CircleHelp size={18} />{error}</div>}
      <div {...stylex.props(s.bottom)}><div {...stylex.props(s.bottomIcon)}><CircleHelp size={18} /></div><p><strong>一个 JPG 文件，两种观看方式。</strong><br />普通查看器显示照片；支持 Motion Photo 的相册可以播放视频。推荐 H.264 MP4，导出后请用原文件验证。</p><span {...stylex.props(s.bottomTag)}>浏览器本地合成<br />JPEG + XMP + MP4</span></div>
      <footer {...stylex.props(s.footer)}><span>MOTION LAB <span {...stylex.props(s.footerDot)}>·</span> 让每一帧，多停留一会儿。</span><a href="https://developer.android.com/media/platform/motion-photo-format" target="_blank" rel="noreferrer">基于 Motion Photo 格式 ↗</a></footer>
    </main>
  </div>;
}

const s = stylex.create({
  page: { minHeight: '100vh' },
  header: { height: 80, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#e3e7df', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: { default: '5%', '@media (max-width: 600px)': 20 }, backgroundColor: '#fafbf8' },
  brand: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 24, fontWeight: 700, textDecoration: 'none', letterSpacing: '-1px' },
  brandLight: { fontWeight: 400 },
  brandIcon: { display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, backgroundColor: '#285b46', color: '#fff', marginRight: 8 },
  demo: { fontSize: 9, fontWeight: 500, letterSpacing: 1, padding: '4px 6px', borderWidth: 1, borderStyle: 'solid', borderColor: '#d8ded4', borderRadius: 4, marginLeft: 8, color: '#66725f' },
  headerRight: { display: 'flex', gap: { default: 28, '@media (max-width: 600px)': 4 }, alignItems: 'center' },
  local: { display: { default: 'inline-flex', '@media (max-width: 600px)': 'none' }, gap: 8, alignItems: 'center', fontSize: 12, color: '#62745f' },
  dot: { width: 6, height: 6, borderRadius: 8, backgroundColor: '#64886b', display: 'inline-block' },
  main: { maxWidth: 1160, marginInline: 'auto', padding: { default: '52px 32px 24px', '@media (max-width: 600px)': '32px 16px 20px' } },
  intro: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 36 },
  eyebrow: { color: '#6b7d66', fontSize: 11, letterSpacing: 2, marginBottom: 14, fontWeight: 600 },
  heading: { fontSize: { default: 36, '@media (max-width: 600px)': 29 }, lineHeight: 1.35, fontWeight: 600, letterSpacing: '-1px' },
  headingDot: { color: '#719567' },
  subtitle: { color: '#66725e', fontSize: 13, lineHeight: 1.8, marginTop: 12 },
  formatBadge: { display: { default: 'flex', '@media (max-width: 800px)': 'none' }, gap: 8, alignItems: 'center', color: '#697b64', fontSize: 11, borderWidth: 1, borderStyle: 'solid', borderColor: '#dbe2d6', borderRadius: 20, padding: '8px 12px', marginBottom: 4 },
  workspace: { display: 'grid', gridTemplateColumns: { default: '390px 1fr', '@media (max-width: 960px)': '340px 1fr', '@media (max-width: 760px)': '1fr' }, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#e1e5dc', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px #263c1805' },
  inputs: { padding: { default: 28, '@media (max-width: 600px)': 24 }, borderRightWidth: { default: 1, '@media (max-width: 760px)': 0 }, borderRightStyle: 'solid', borderRightColor: '#e7ebe3', borderBottomWidth: { default: 0, '@media (max-width: 760px)': 1 }, borderBottomStyle: 'solid', borderBottomColor: '#e7ebe3' },
  sectionHeading: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 600 },
  step: { fontSize: 11, color: '#66725e', letterSpacing: 1, fontFamily: 'monospace' },
  uploadGroup: { display: 'flex', flexDirection: 'column', gap: 12 },
  fieldTitle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 500 },
  meta: { color: '#66725e', fontSize: 11, fontWeight: 400, lineHeight: 1.7, overflowWrap: 'anywhere' },
  dropzone: { position: 'relative', borderWidth: 1, borderStyle: 'dashed', borderColor: '#cdd6c8', borderRadius: 12, minHeight: 148, backgroundColor: { default: '#fafbf8', ':hover': '#f2f6ef', ':focus-within': '#edf4e8' }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 16, cursor: 'pointer', transition: 'background-color 160ms' },
  dropzoneReady: { borderStyle: 'solid', borderColor: '#b4cbb0', backgroundColor: '#f5f8f1' },
  fileInput: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  uploadIcon: { color: '#7c9272', marginBottom: 4, display: 'flex' },
  fileName: { fontSize: 12, fontWeight: 500, overflowWrap: 'anywhere', lineHeight: 1.6, maxWidth: '100%' },
  between: { height: 32, display: 'grid', placeItems: 'center', color: '#94a08b' },
  setting: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  settingLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#53614e' },
  smallNote: { fontSize: 11, lineHeight: 1.6, color: '#66725e', marginTop: 8 },
  actions: { display: 'grid', marginTop: 24 },
  privacy: { display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#66725e', marginTop: 12 },
  previewSection: { padding: { default: 28, '@media (max-width: 600px)': 20 }, backgroundColor: '#fdfefb', minWidth: 0 },
  previewBadge: { fontSize: 9, color: '#6c8062', padding: '5px 8px', borderRadius: 4, backgroundColor: '#edf3e7', display: 'flex', gap: 6, alignItems: 'center', letterSpacing: 0.5 },
  preview: { position: 'relative', padding: 0, width: '100%', height: { default: 384, '@media (max-width: 600px)': 320 }, borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e9dd', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f3eb', userSelect: 'none', touchAction: 'pan-y', display: 'block' },
  media: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  video: { position: 'absolute', inset: 0, opacity: 0, backgroundColor: '#f0f3eb', pointerEvents: 'none' },
  visible: { opacity: 1 },
  empty: { display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a28a', padding: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#e6ecdf', display: 'grid', placeItems: 'center', marginBottom: 24 },
  emptyTitle: { fontWeight: 500, color: '#6e7e63', fontSize: 16, marginBottom: 12 },
  emptyText: { fontSize: 12, lineHeight: 1.9, color: '#66725e' },
  emptyLabel: { fontSize: 9, letterSpacing: 2, marginTop: 32, color: '#66725e' },
  live: { position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6, alignItems: 'center', borderRadius: 5, padding: '6px 8px', backgroundColor: '#15291fcc', color: '#fff', fontSize: 11, letterSpacing: 1 },
  previewCaption: { minHeight: 48, display: 'flex', alignItems: 'center', gap: 6, color: '#66725e', fontSize: 10 },
  reset: { marginLeft: 'auto', borderWidth: 0, backgroundColor: 'transparent', display: 'flex', gap: 4, alignItems: 'center', color: '#66725e', fontSize: 11, padding: 6, flexShrink: 0 },
  recipe: { display: 'flex', gap: { default: 12, '@media (max-width: 960px)': 6 }, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '22px 8px', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#e9ede2', color: '#66725e', fontSize: 11 },
  result: { padding: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#dce7d5', borderRadius: 10, backgroundColor: '#f5f8f0' },
  resultRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  successIcon: { color: '#4a7145', display: 'flex' },
  resultText: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 120 },
  resultNote: { fontSize: 11, color: '#697c5e', marginTop: 10, lineHeight: 1.7 },
  status: { fontSize: 12, color: '#446f3f', ':empty': { display: 'none' }, marginTop: 12 },
  error: { marginTop: 16, padding: 16, borderRadius: 10, backgroundColor: '#fff0e8', color: '#974022', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 },
  bottom: { display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, padding: '20px 24px', borderWidth: 1, borderStyle: 'solid', borderColor: '#e1e6db', borderRadius: 12, fontSize: 11, lineHeight: 1.9, color: '#66725e' },
  bottomIcon: { color: '#7b8e6e', flexShrink: 0 },
  bottomTag: { display: { default: 'block', '@media (max-width: 760px)': 'none' }, marginLeft: 'auto', flexShrink: 0, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: '#75866a' },
  footer: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 28, color: '#66725e', fontSize: 11, letterSpacing: 0.4 },
  footerDot: { marginInline: 8 },
});
