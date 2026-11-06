import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// 用 ego-browser nodejs 的模块入口执行。素材使用 artifacts/test.png 与 test.mp4。
const spaceId = Number(new URL(import.meta.url).searchParams.get('space'));
const task = spaceId ? await takeOverTaskSpace(spaceId) : await taskSpace('LivePhotoDemo browser checks');
const page = task.page('p1');
const failures = [];
await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('[contenteditable=true]', { state: 'visible' });
await page.click('[contenteditable=true]');
await page.keyboard.paste('Before photo');
await page.click('button[aria-label="Live photo"]');
await page.setInputFiles('input[aria-label="Cover image"]', [fileURLToPath(new URL('../artifacts/test.png', import.meta.url))]);
await page.waitForFunction(() => !document.querySelector('input[aria-label="Video clip"]').disabled, undefined, { timeout: 10000 });
await page.setInputFiles('input[aria-label="Video clip"]', [fileURLToPath(new URL('../artifacts/test.mp4', import.meta.url))]);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Insert' && !el.disabled), undefined, { timeout: 15000 });
await page.click('button:has-text("Insert")');
await page.waitForFunction(() => !document.querySelector('[role=dialog]'), undefined, { timeout: 5000 });
await page.waitForSelector('[data-live-photo] .rr-image-img', { state: 'visible' });
await page.keyboard.paste('After photo');

await page.click('[data-live-photo] .rr-image-img');
const clickSelected = await page.evaluate(() => {
  const editor = document.querySelector('[contenteditable=true]').__lexicalEditor;
  return editor.getEditorState().read(() => {
    const selection = editor.getEditorState()._selection;
    return selection?.constructor.name.includes('NodeSelection') && selection.getNodes().some(node => node.getType() === 'live-photo');
  });
});
if (!clickSelected) failures.push('单击图片后，没有保留实况图 NodeSelection');

await page.focus('[contenteditable=true]');
await page.keyboard.press('ControlOrMeta+a');
const rangeSelected = await page.evaluate(() => {
  const editor = document.querySelector('[contenteditable=true]').__lexicalEditor;
  return editor.getEditorState().read(() => editor.getEditorState()._selection?.getNodes().some(node => node.getType() === 'live-photo'));
});
if (!rangeSelected) failures.push('正文全选没有包含实况图');
await page.keyboard.press('Backspace');
const deleted = await page.evaluate(() => ({ text: document.querySelector('[contenteditable=true]').innerText.trim(), photos: document.querySelectorAll('[data-live-photo]').length }));
if (deleted.text !== '' || deleted.photos !== 0) failures.push(`删除混合选区后仍有残留：${deleted.text}`);
await page.click('button[aria-label="Undo"]');
const restored = await page.evaluate(() => ({ text: document.querySelector('[contenteditable=true]').innerText, photos: document.querySelectorAll('[data-live-photo]').length }));
if (restored.photos !== 1 || !restored.text.includes('Before photo') || !restored.text.includes('After photo')) failures.push('撤销没有同时恢复文字与实况图');
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
const points = await page.evaluate(() => {
  const paragraphs = [...document.querySelectorAll('[contenteditable=true] > p')];
  const before = paragraphs.find(p => p.textContent === 'Before photo').getBoundingClientRect();
  const after = paragraphs.find(p => p.textContent === 'After photo').getBoundingClientRect();
  return { ax: before.x + 3, ay: before.y + before.height / 2, bx: after.x + 75, by: after.y + after.height / 2 };
});
await page.mouse.move(points.ax, points.ay);
await page.mouse.down();
await page.mouse.move(points.bx, points.by, { steps: 10 });
await page.mouse.up();
await page.waitForFunction(() => document.querySelector('[data-live-photo]')?.dataset.imageSelected === 'true', undefined, { timeout: 1500 }).catch(() => {});
const dragSelected = await page.evaluate(() => document.querySelector('[data-live-photo]').dataset.imageSelected === 'true');
if (!dragSelected) console.log('drag detail', await page.evaluate(() => {
  const editor = document.querySelector('[contenteditable=true]').__lexicalEditor;
  return editor.getEditorState().read(() => ({ native: document.getSelection()?.toString(), nodes: editor.getEditorState()._selection?.getNodes().map(node => node.getType()) }));
}));
if (!dragSelected) failures.push('鼠标跨正文拖选没有选中实况图');

await page.click('[data-live-photo] .rr-image-img');
await page.evaluate(() => {
  const root = document.querySelector('[contenteditable=true]');
  window.__selectionTestClipboard = new DataTransfer();
  root.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: window.__selectionTestClipboard }));
});
await page.keyboard.press('ArrowDown');
await page.evaluate(() => document.querySelector('[contenteditable=true]').dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: window.__selectionTestClipboard })));
await page.waitForFunction(() => document.querySelectorAll('[data-live-photo]').length === 2, undefined, { timeout: 5000 });
await page.click('[data-live-photo] .rr-image-img >> nth=0');
await page.keyboard.down('Shift');
await page.click('[data-live-photo] .rr-image-img >> nth=1');
await page.keyboard.up('Shift');
const multiSelected = await page.evaluate(() => [...document.querySelectorAll('[data-live-photo]')].every(el => el.dataset.imageSelected === 'true'));
if (!multiSelected) failures.push('Shift 点击没有同时选中两张实况图');
await page.keyboard.press('Backspace');
if (await page.evaluate(() => document.querySelectorAll('[data-live-photo]').length !== 0)) failures.push('多节点选区没有整体删除');
console.log({ clickSelected, rangeSelected, dragSelected, multiSelected, deleted, restored, failures });
assert.equal(failures.length, 0, failures.join('\n'));
