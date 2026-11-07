import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const file = name => fileURLToPath(new URL(`../artifacts/${name}`, import.meta.url));
execFileSync('ffmpeg', ['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=360x800','-frames:v','1','-threads','1','-y',file('drag-portrait.png')]);
const task = await taskSpace('Haklex 图片拖动预览');
try { await verify(task.page('p1')); } finally { await task.finish({keep:[]}); }

async function verify(page) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('[contenteditable=true]', { state: 'visible' });
  await page.click('[contenteditable=true]'); await page.keyboard.paste('Drop target'); await page.keyboard.press('Enter');
  await page.click('button[aria-label="Image"]'); await page.setInputFiles('[role=dialog] input[type=file]', [file('drag-portrait.png')]);
  await page.waitForSelector('.rr-image-loaded', { state: 'visible' }); await page.keyboard.press('ArrowDown');
  await page.click('button[aria-label="Live photo"]'); await page.setInputFiles('input[aria-label="Cover image"]', [file('drag-portrait.png')]);
  await page.waitForFunction(() => !document.querySelector('input[aria-label="Video clip"]').disabled);
  await page.setInputFiles('input[aria-label="Video clip"]', [file('test.mp4')]);
  await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog] button')].some(b => b.textContent === 'Insert' && !b.disabled));
  await page.click('button:text-is("Insert")'); await page.waitForSelector('[data-live-photo] .rr-image-loaded', { state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
  await page.keyboard.paste('End target');
  await page.evaluate(() => {
    const original = DataTransfer.prototype.setDragImage;
    window.dragSamples = [];
    DataTransfer.prototype.setDragImage = function(el, x, y) {
      const key = this.getData('application/x-rich-editor-drag');
      const block = document.querySelector('[contenteditable=true]').__lexicalEditor.getElementByKey(key);
      const cover = block?.querySelector('.rr-image-img');
      if (cover) {
        const r = cover.getBoundingClientRect(), p = el.getBoundingClientRect();
        const raster = el.matches('img,canvas') ? el : el.querySelector('img,canvas');
        // 采样浏览器真正收到的拖影素材；不改写原生拖动操作。
        const pixels = image => {
          const c = document.createElement('canvas'); c.width = Math.round(r.width); c.height = Math.round(r.height);
          const ctx = c.getContext('2d'); ctx.drawImage(image,0,0,c.width,c.height);
          return ctx.getImageData(c.width >> 2,c.height >> 2,c.width >> 1,c.height >> 1).data;
        };
        let matches = false;
        if (raster && (!(raster instanceof HTMLImageElement) || raster.naturalWidth > 0)) {
          const a = pixels(cover), b = pixels(raster); matches = a.every((v,i) => v === b[i]);
        }
        window.dragSamples.push({ live:block.hasAttribute('data-live-photo'), source:[r.width,r.height], preview:[p.width,p.height], matches, key });
        window.lastDragPreview = el;
      }
      return original.call(this,el,x,y);
    };
  });
  for (const selector of ['.rich-image-wrapper:not([data-live-photo]) .rr-image-img','[data-live-photo] .rr-image-img']) {
    await page.hover(selector);
    const order = () => page.evaluate(()=>document.querySelector('[contenteditable=true]').__lexicalEditor.getEditorState().toJSON().root.children.map(n=>n.type).join(','));
    const before = await order();
    await page.dragAndDrop('button[aria-label="Block actions"]', 'p:has-text("End target")', {targetPosition:{x:16,y:17}});
    assert.notEqual(await order(), before, '实际拖动必须改变块顺序');
    assert.equal(await page.evaluate(()=>window.lastDragPreview?.isConnected), false, '放下后须清理拖影');
  }
  const samples = await page.evaluate(()=>window.dragSamples);
  console.log(samples);
  assert.deepEqual(samples.map(s=>s.live),[false,true]);
  for (const s of samples) {
    assert.ok(s.source.every((v,i)=>Math.abs(v-s.preview[i])<1), '拖影尺寸应等于正文中显示的图片');
    assert.ok(s.matches, '拖影必须包含已解码的封面像素');
  }
}
