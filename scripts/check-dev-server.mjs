import assert from 'node:assert/strict';

// 已打开的开发页面会在首次插入实况图时请求此模块，不能被生产预览的 HTML 兜底替代。
const response = await fetch('http://127.0.0.1:5173/app/editor/live-photo-view.tsx');
assert.ok(response.ok, `实况图模块请求失败：${response.status}`);
assert.match(response.headers.get('content-type') ?? '', /javascript/,
  '5173 没有返回开发模块。请运行 npm run dev；生产预览只用 4173。');
console.log('5173 实况图开发模块可加载。');
