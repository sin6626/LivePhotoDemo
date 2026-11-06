# Live Photo Editor Demo

在 SinPersonalSpace 博客同款 **Haklex ShiroEditor 0.0.85 + Lexical 0.41.0** 中，把实况图作为原图片节点的扩展来编辑。

```sh
npm install --include=dev
npm run dev
# http://127.0.0.1:5173
```

工具栏的「Image」插入普通图片；「Live photo」图标或 `/live` 插入 PNG/JPG + MP4。新增界面统一英文，实况图插入弹窗直接复用 Haklex 原生 Dialog/ActionButton。实况图使用原图片的尺寸、图注、加载状态及浮动操作栏，仅额外显示小 LIVE 标识。

- 单击选中，Shift 点击多选，可与正文和普通图片一起拖选、剪切/复制/粘贴、删除、撤销和重做。
- 使用原左侧块手柄拖动排序。
- 按住 250ms 播放视频；移动超过 8px、拖动、离开、松开、失焦或离开视口停止，不劫持图片的指针和拖动行为。
- 原操作栏的 Edit details、Replace image、Open source、Duplicate、Download、Remove image 保留。新增同样样式的「替换视频」和声音开关。
- 替换封面保留视频；替换视频保留封面；复制一份保留实况图类型、视频和图注。
- Download 根据当前封面和视频生成 Motion Photo JPG；Open source 与普通图片一样打开当前封面。

**仅本地会话，刷新会清空正文与素材。不连接博客 API，不上传，不写入博客或相册。**

## 实现边界

- `LivePhotoNode extends ImageNode`，继承原图片数据和编辑 API。JSON 在原图片字段外增加 `videoSrc`、`fileName`，不放视频 base64。
- 直接使用原 `ImageEditRenderer`，没有复制一套图片卡片或工具栏。小补丁提供视频覆盖层、额外按钮、下载回调插槽，并将原 Duplicate 改为 Lexical `$copyNode`，保留子类及其数据。
- `ImageSelectionPlugin` 同时服务普通图片和实况图；删除、历史、剪贴板和块排序由原编辑器处理。
- 素材 Blob 由页面会话保管，为撤销保留资源，卸载时释放。累计输入资源最多 256 MB。视频仅按住时加载，卸载/替换时停止播放。
- React Router Framework SPA、TypeScript；页面壳和新增覆盖层使用 StyleX，图片和插入弹窗复用 Haklex 的组件、主题变量与样式。
- 复用博客原有 11 份 Haklex/Lexical 修复，增加图片渲染扩展补丁，并修正原图片插入后根节点选区按方向键报错的边界。补丁由 `scripts/apply-editor-patches.mjs` 幂等应用；不修改博客仓库。

图片上限 20 MB、2400 万像素；视频上限 100 MB、30 秒。普通图片保留原始格式、透明度与动画；实况封面/导出转为质量 0.92 的 JPEG，透明区域填白，不保留 EXIF/HDR。建议 2–5 秒 H.264 MP4，视频不转码。通过 URL 替换的远程封面，导出时需要对方允许跨域读取。

此版本原图片没有拖拽缩放手柄，本次没有给实况图另加一套缩放；两者沿用同样的尺寸规则。博客后端保存、发布页渲染和跨页面持久化仍是后续接入范围。

编辑区图片最大宽度为正文宽度，最大高度为 `min(70vh, 400px)`，等比缩小且不放大小图。普通图和实况图共用 `app/editor/image-layout.css`，仅调整显示，不修改原图尺寸或导出文件。400px 来自博客 Markdown 所见即所得编辑器的块图规则；Haklex 本身没有限高，博客阅读页另有 `min(70vh, 42rem)`，这三层不同。

输出为 Google 风格 Motion Photo，**不是苹果 Live Photo，不保证所有相册识别**。格式依据：[Google Motion Photo format](https://developer.android.com/media/platform/motion-photo-format)。本 Demo 只解析自己生成的布局。

Mac HEIC/MOV/HEVC 的实际解码、转换结果和架构建议见 [媒体标准化评估](docs/media-normalization.md)。本机转换流程已试验，网页尚未接入自动转码；不要把 MP4 容器等同于 H.264 编码。

## 验证与启动

```sh
npm test
npm run typecheck
NODE_OPTIONS=--max-old-space-size=2048 npm run build
npm start # http://127.0.0.1:4173，Ctrl+C 关闭
node scripts/check-dev-server.mjs # 5173 开发服务运行时检查延迟模块
```

浏览器回归使用 Ego Browser，脚本以 `ego-browser nodejs -e "await import('file:///项目绝对路径/tests/native-image.browser.mjs')"` 执行。另一个脚本 `tests/editor-selection.browser.mjs` 检查选区、剪贴板与历史。需要先在忽略提交的 `artifacts/` 下准备测试素材：

```sh
mkdir -p artifacts
ffmpeg -f lavfi -i testsrc2=size=640x480:rate=24 -t 3 -c:v libx264 -threads 2 -pix_fmt yuv420p -y artifacts/test.mp4
ffmpeg -i artifacts/test.mp4 -frames:v 1 -threads 1 -y artifacts/test.png
ffmpeg -f lavfi -i color=c=0x6655aa:size=320x240 -frames:v 1 -threads 1 -y artifacts/alternate.png
ffmpeg -f lavfi -i testsrc2=size=320x240:rate=12 -t 1.5 -c:v libx264 -threads 2 -pix_fmt yuv420p -y artifacts/alternate.mp4
```

测试覆盖原图片继承、JSON 往返、复制/替换保留视频、图片框与工具栏一致、原生操作栏、长按、选区、删除与历史。导出后的图片尺寸和视频字节也独立检查。结束后关闭测试 TaskSpace。

开发服务固定 5173，生产预览固定 4173，不能把已打开开发页面对应的服务换成生产预览，否则首次加载节点会请求不到旧 `.tsx` 模块。修改依赖补丁后执行 `npm run postinstall`，用 `npm run dev -- --force` 重建 Vite 预构建缓存。

保留 lucide-react 去重和 Excalidraw Radix Tabs 覆盖；StyleX 的 `cssInjectionTarget` 指向 root CSS，确保生产环境必载。修改节点结构或素材会话模块后刷新重新插入，HMR 不承诺保留旧会话。

本轮没有重测白板、嵌入等所有第三方功能。依赖锁定博客版本，npm audit 仍报告 21 项依赖漏洞（3 low、4 moderate、14 high）；本地体验不是生产发布验收。
