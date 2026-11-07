import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const query = new URL(import.meta.url).searchParams;
const task = query.has('space') ? await takeOverTaskSpace(Number(query.get('space'))) : await taskSpace('LivePhotoDemo browser checks');
const page = task.page('p1');
await page.cdp('Emulation.setDeviceMetricsOverride', {width:1440,height:1600,deviceScaleFactor:1,mobile:false});
const file = name => fileURLToPath(new URL(`../artifacts/mac-formats/${name}`, import.meta.url));
await page.goto(`http://127.0.0.1:${query.has('preview') ? 4173 : 5173}/`);
await page.waitForSelector('[contenteditable=true]', {state:'visible'});
await page.click('button[aria-label="Image"]');
await page.setInputFiles('[role=dialog] input[type=file]', [file('sample.heic')]);
await page.waitForSelector('.rr-image-loaded', {state:'visible', timeout:15000});
assert.equal(await page.evaluate(async()=> (await (await fetch(document.querySelector('.rr-image-img').src)).blob()).type), 'image/jpeg');
await page.click('button[aria-label="Live photo"]');
await page.setInputFiles('input[aria-label="Cover image"]', [file('sample.heic')]);
await page.waitForFunction(()=>document.querySelector('[role=dialog]')?.innerText.includes('Converted to JPEG'), undefined, {timeout:15000});
await page.setInputFiles('input[aria-label="Video clip"]', [file('sample-hevc.mov')]);
await page.waitForFunction(()=>[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent==='Insert' && !b.disabled),undefined,{timeout:120000});
await page.click('button:text-is("Insert")');
await page.waitForSelector('[data-live-photo] .rr-image-loaded',{state:'visible'});
const info = await page.evaluate(async()=>{const e=document.querySelector('[data-live-photo]'), img=e.querySelector('img'), v=e.querySelector('video');return {image:(await (await fetch(img.src)).blob()).type,video:(await (await fetch(v.src)).blob()).type,width:img.naturalWidth,height:img.naturalHeight}});
assert.deepEqual(info,{image:'image/jpeg',video:'video/mp4',width:1024,height:2270});
await page.focus('[data-live-photo] button[aria-label="Press and hold to play"]');
await page.keyboard.down('Space');
try { await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.2,undefined,{timeout:10000}); }
finally { await page.keyboard.up('Space'); }
assert.ok(await page.evaluate(()=>document.querySelector('video').paused));
const pending = page.waitForEvent('download',{timeout:15000});
// 此检查覆盖转换与文件导出；浮动工具栏的指针命中由 native-image.browser 独立验证。
await page.evaluate(()=>document.querySelector('[data-live-photo] button[title=Download]').click());
await (await pending).saveAs(file('automatic_MP.jpg'));
const oldCover = await page.evaluate(()=>document.querySelector('[data-live-photo] img').src);
await page.evaluate(()=>document.querySelector('[data-live-photo] button[title="Replace image"]').click());
await page.setInputFiles('input[type=file][accept^="image/*"]', [file('sample.heic')]);
await page.waitForFunction(src=>Boolean(document.querySelector('[data-live-photo] img')?.naturalWidth) && document.querySelector('[data-live-photo] img').src !== src,oldCover,{timeout:15000});
const old = await page.evaluate(()=>document.querySelector('video').src);
await page.setInputFiles('input[aria-label="Replacement video"]',[file('sample-h264.mov')]);
await page.waitForFunction(src=>{const v=document.querySelector('video');return v && v.src!==src},old,{timeout:15000});
console.log({ordinaryHeic:true,live:info,heldPlayback:true,motionPhotoDownload:true,movReplacement:true});
