import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const spaceId = Number(new URL(import.meta.url).searchParams.get('space'));
const task = spaceId ? await takeOverTaskSpace(spaceId) : await taskSpace('LivePhotoDemo browser checks');
const page = task.page('p1');
await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('[contenteditable=true]', { state: 'visible' });
await page.evaluate(() => { const input = document.createElement('input'); input.type = 'file'; input.id = 'codec-probe'; input.hidden = true; document.body.append(input); });
const rows = [];
for (const [name, kind] of [['sample.heic', 'image'], ['compatible.jpg', 'image'], ['original-hevc.mp4', 'video'], ['sample-hevc.mov', 'video'], ['sample-h264.mov', 'video'], ['compatible.mp4', 'video']]) {
  await page.setInputFiles('#codec-probe', [fileURLToPath(new URL(`../artifacts/mac-formats/${name}`, import.meta.url))]);
  rows.push(await page.evaluate(async ({ name, kind }) => {
    const file = document.querySelector('#codec-probe').files[0];
    const result = { name, mime: file.type, bytes: file.size, kind };
    const media = await import('/app/lib/media.ts');
    try { const parsed = kind === 'image' ? await media.readImage(file) : await media.readVideo(file); result.app = { accepted: true, width: parsed.width, height: parsed.height }; }
    catch (error) { result.app = { accepted: false, error: error.message }; }
    if (kind === 'image') {
      try { const bitmap = await createImageBitmap(file); result.bitmap = { decoded: true, width: bitmap.width, height: bitmap.height }; bitmap.close(); }
      catch (error) { result.bitmap = { decoded: false, error: error.message }; }
    }
    const url = URL.createObjectURL(file);
    const element = document.createElement(kind === 'image' ? 'img' : 'video');
    if (kind === 'video') { element.preload = 'auto'; element.muted = true; }
    result.native = await new Promise(resolve => {
      const timer = setTimeout(() => finish({ decoded: false, error: 'timeout' }), 8000);
      const finish = value => { clearTimeout(timer); element.onload = element.onloadeddata = element.onerror = null; resolve(value); };
      element.onload = () => finish({ decoded: true, width: element.naturalWidth, height: element.naturalHeight });
      element.onloadeddata = () => finish({ decoded: true, width: element.videoWidth, height: element.videoHeight, duration: element.duration });
      element.onerror = () => finish({ decoded: false, error: element.error?.message ?? 'image decoding failed' });
      element.src = url;
    });
    element.removeAttribute('src'); if (kind === 'video') element.load(); URL.revokeObjectURL(url);
    return result;
  }, { name, kind }));
}
const environment = await page.evaluate(async () => ({
  userAgent: navigator.userAgent,
  heicImageDecoder: typeof ImageDecoder !== 'undefined' ? await ImageDecoder.isTypeSupported('image/heic') : false,
  h264Encoder: typeof VideoEncoder !== 'undefined' ? (await VideoEncoder.isConfigSupported({ codec: 'avc1.42001f', width: 640, height: 480, bitrate: 1500000, framerate: 30 })).supported : false,
  aacEncoder: typeof AudioEncoder !== 'undefined' ? (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported : false,
}));
for (const row of rows) assert.ok(row.app.accepted, `${row.name}: ${row.app.error}`);
const report = { environment, rows };
await writeFile(fileURLToPath(new URL('../artifacts/mac-formats/automatic-results.json', import.meta.url)), JSON.stringify(report, null, 2));
console.log(report);
await page.evaluate(() => document.querySelector('#codec-probe').remove());
