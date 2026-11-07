// 在本机 Demo 启动后运行：node tests/normalize-api.mjs [http://127.0.0.1:4173]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const base = process.argv[2] || 'http://127.0.0.1:5173';
const url = `${base}/api/media/normalize`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const packetHash = (path,stream) => execFileSync('ffmpeg',['-v','error','-i',path,'-map',stream,'-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();
const headers = (name,kind) => ({origin:base,'content-type':'application/octet-stream','x-media-name':encodeURIComponent(name),'x-media-kind':kind});
for (const [name,kind,expected] of [['sample.heic','image','converted'],['normalize-check.mov','video','converted'],['sample-h264.mov','video','remuxed'],['compatible.mp4','video','original']]) {
  const path=resolve('artifacts/mac-formats',name);
  if (name==='normalize-check.mov') execFileSync('ffmpeg',['-nostdin','-v','error','-i','artifacts/mac-formats/sample-hevc.mov','-map','0','-c','copy','-metadata','comment=LivePhotoDemo API fixture','-y',path]);
  const input=await readFile(path),folder=resolve('.local-media',hash(input));
  const res=await fetch(url,{method:'POST',headers:headers(name,kind),body:input});
  const bytes=Buffer.from(await res.arrayBuffer());
  assert.ok(res.ok,`${name} ${res.status}: ${res.ok?'':bytes.toString()}`);
  assert.equal(res.headers.get('x-media-id'),hash(input));
  const action=res.headers.get('x-media-action');assert.ok(action===expected || (expected!=='original' && action==='cached'));
  assert.deepEqual(await readFile(`${folder}/original/${name}`),input);
  assert.deepEqual(await readFile(path),input);
  if (expected==='original') { assert.equal(res.status,204);assert.equal(bytes.length,0); }
  else {
    const output=`${folder}/compatible.${kind==='image'?'jpg':'mp4'}`;
    assert.deepEqual(await readFile(output),bytes);
    if (kind==='image') assert.deepEqual([...bytes.subarray(0,2)],[255,216]);
    else {
      const {streams}=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',output]));
      assert.equal(streams[0].codec_name,'h264');assert.equal(streams[0].pix_fmt,'yuv420p');assert.equal(streams[1].codec_name,'aac');
      assert.equal(packetHash(output,'0:a:0'),packetHash(path,'0:a:0'));
      if (expected==='remuxed') assert.equal(packetHash(output,'0:v:0'),packetHash(path,'0:v:0'));
    }
  }
  console.log(name,action,'original verified');
}
const h=headers('bad.mov','video');
for (const [hs,status] of [[{...h,origin:'https://invalid.example'},403],[{...h,'x-media-name':'..%2Finput'},400],[h,422]]) {
 const res=await fetch(url,{method:'POST',headers:hs,body:'invalid bytes'});assert.equal(res.status,status);await res.text();
}
const jobDirs=async()=>(await readdir('.local-media')).filter(n=>n.startsWith('.job-'));
const stalled=request(url,{method:'POST',headers:{...h,'content-length':'1024'}});stalled.on('error',()=>{});stalled.write('incomplete');
try {
 for(let i=0;i<100 && !(await jobDirs()).length;i++) await delay(10);
 const res=await fetch(url,{method:'POST',headers:h,body:'test'});assert.equal(res.status,429);await res.text();
} finally { stalled.destroy(); }
for(let i=0;i<100 && (await jobDirs()).length;i++) await delay(10);
assert.deepEqual(await jobDirs(),[]);
console.log('invalid inputs, origin, concurrency, disconnect cleanup: passed');
