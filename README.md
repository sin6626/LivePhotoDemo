# Live Photo Editor Demo

在 SinPersonalSpace 博客同款 **Haklex ShiroEditor 0.0.85 + Lexical 0.41.0** 中，把实况图作为原图片节点的扩展来编辑。

```sh
npm install --include=dev
npm run dev
# http://127.0.0.1:5173
```

工具栏的「Image」插入普通图片；「Live photo」图标或 `/live` 插入 PNG/JPG/HEIC/HEIF + MP4/MOV/M4V。新增界面统一英文，实况图插入弹窗直接复用 Haklex 原生 Dialog/ActionButton。实况图使用原图片的尺寸、图注、加载状态及浮动操作栏，仅额外显示小 LIVE 标识。

- 单击选中，Shift 点击多选，可与正文和普通图片一起拖选、剪切/复制/粘贴、删除、撤销和重做。
- 使用原左侧块手柄拖动排序。
- 按住 250ms 播放视频；移动超过 8px、拖动、离开、松开、失焦或离开视口停止，不劫持图片的指针和拖动行为。
- 原操作栏的 Edit details、Replace image、Open source、Duplicate、Download、Remove image 保留。新增同样样式的「替换视频」和声音开关。
- 替换封面保留视频；替换视频保留封面；复制一份保留实况图类型、视频和图注。
- Download 根据当前封面和视频生成 Motion Photo JPG；Open source 与普通图片一样打开当前封面。

**正文仍为本地会话，刷新清空。需要标准化的文件只发送到同端口的本机 Demo 服务，不发送到博客或云端。归档的原件和兼容副本不会随刷新删除。**

## 实现边界

- `LivePhotoNode extends ImageNode`，继承原图片数据和编辑 API。JSON 在原图片字段外增加 `videoSrc`、`fileName`，不放视频 base64。
- 直接使用原 `ImageEditRenderer`，没有复制一套图片卡片或工具栏。小补丁提供视频覆盖层、额外按钮、下载回调插槽，并将原 Duplicate 改为 Lexical `$copyNode`，保留子类及其数据。
- `ImageSelectionPlugin` 同时服务普通图片和实况图；删除、历史、剪贴板和块排序由原编辑器处理。
- 素材 Blob 由页面会话保管，为撤销保留资源，卸载时释放。累计输入资源最多 256 MB。视频仅按住时加载，卸载/替换时停止播放。
- React Router Framework SPA、TypeScript；页面壳和新增覆盖层使用 StyleX，图片和插入弹窗复用 Haklex 的组件、主题变量与样式。
- 复用博客原有 11 份 Haklex/Lexical 修复，增加图片渲染扩展补丁，并修正原图片插入后根节点选区按方向键报错的边界。补丁由 `scripts/apply-editor-patches.mjs` 幂等应用；不修改博客仓库。

图片上限 20 MB、2400 万像素；视频上限 100 MB、30 秒。浏览器可读的普通图片保留原始格式、透明度与动画，HEIC/HEIF 生成 JPEG 副本；实况封面/导出转为质量 0.92 的 JPEG，透明区域填白，不保留 EXIF/HDR。建议 2–5 秒的短片。视频会先检查实际容器和音视频编码，再选择直通、换容器或转码。通过 URL 替换的远程封面，导出时需要对方允许跨域读取。

此版本原图片没有拖拽缩放手柄，本次没有给实况图另加一套缩放；两者沿用同样的尺寸规则。博客后端保存、发布页渲染和跨页面持久化仍是后续接入范围。

编辑区图片最大宽度为正文宽度，最大高度为 `min(70vh, 400px)`，等比缩小且不放大小图。普通图和实况图共用 `app/editor/image-layout.css`，仅调整显示，不修改原图尺寸或导出文件。400px 来自博客 Markdown 所见即所得编辑器的块图规则；Haklex 本身没有限高，博客阅读页另有 `min(70vh, 42rem)`，这三层不同。

输出为 Google 风格 Motion Photo，**不是苹果 Live Photo，不保证所有相册识别**。格式依据：[Google Motion Photo format](https://developer.android.com/media/platform/motion-photo-format)。本 Demo 只解析自己生成的布局。

Mac HEIC/MOV/HEVC 的实际解码、转换结果和架构建议见 [媒体标准化评估](docs/media-normalization.md)。网页已接入本机自动转换。见下方当前规则；评估文档中的 11 月 6 日数据为接入前的基线。

## 本机自动转换

在 macOS 运行，需能从 PATH 找到 `sips`、`ffprobe`、`ffmpeg`（含 libx264、AAC）。使用 `npm run dev` 或构建后 `npm start`，转换中间件和网页共用端口；单独托管 `build/client` 不提供转换服务。

| 输入 | 处理 |
|---|---|
| HEIC/HEIF 照片 | sips 验证图片格式、像素数，再生成 JPEG；普通图片和实况封面均可用 |
| 兼容 MP4 | H.264 8-bit yuv420p、可选 AAC-LC 音轨，符合尺寸、帧率、级别等限制时直接使用原字节 |
| H.264/AAC MOV | 换为 MP4 容器，不重编符合条件的音视频轨道 |
| HEVC MOV/MP4 等可解码 SDR 视频 | FFmpeg 将不兼容的轨道转为 H.264/AAC，兼容音轨直接复制；视频最大 1080p（支持竖屏）、30 fps |

成功处理的 HEIF 图片和所有上传检查的视频按输入 SHA-256 归档在项目私有 `.local-media/<SHA-256>/original/<原文件名>`；生成的副本在同目录 `compatible.jpg` 或 `compatible.mp4`。相同内容复用已生成的副本；直通 MP4 仅保留原件。普通 PNG/JPEG 等无需转换的图片仍在浏览器处理。不会改动所选源文件。归档为持久本地文件，占用磁盘；不加入 Git、不对外提供静态访问。页面的 256 MB 是会话限制，不是磁盘归档配额。

接口 `POST /api/media/normalize` 只接受回环连接和同源 Origin，body 为原始文件字节，类型 `application/octet-stream`，头 `X-Media-Kind: image|video`、`X-Media-Name: encodeURIComponent(file.name)`。响应 `200` 为兼容副本，`204` 表示复用原 File；`X-Media-Id` 为原件哈希，`X-Media-Action` 为 `original / remuxed / converted / cached`。错误返回英文文本。开发控制台记录请求方法、URL、应用设置的头、文件参数、状态码和响应摘要，不记录二进制或凭据；生产关闭请求日志。

每个服务一次处理一个文件，忙时返回 429。限制输入和输出大小、时长、像素；仅选择主视频和第一条音轨，转换有超时，断开请求会终止进程并逐个清理临时文件。检测到 HDR/Dolby Vision 或色彩信息不明的高位深视频时拒绝，不假装做过正确的色调映射。

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

转换回归使用 `artifacts/mac-formats/` 中上次格式实验的 HEIC、HEVC MOV、H.264 MOV、H.264 MP4 样本。`node tests/normalize-api.mjs` 检查原件哈希、兼容副本、拒绝非法请求、单任务与断开清理。`tests/auto-normalize.browser.mjs` 实测普通 HEIC 及 HEIC+MOV 的插入/播放/下载、替换，支持 `?preview=1`。

测试覆盖原图片继承、JSON 往返、复制/替换保留视频、图片框与工具栏一致、原生操作栏、长按、选区、删除与历史。导出后的图片尺寸和视频字节也独立检查。结束后关闭测试 TaskSpace。

开发服务固定 5173，生产预览固定 4173，不能把已打开开发页面对应的服务换成生产预览，否则首次加载节点会请求不到旧 `.tsx` 模块。修改依赖补丁后执行 `npm run postinstall`，用 `npm run dev -- --force` 重建 Vite 预构建缓存。

保留 lucide-react 去重和 Excalidraw Radix Tabs 覆盖；StyleX 的 `cssInjectionTarget` 指向 root CSS，确保生产环境必载。修改节点结构或素材会话模块后刷新重新插入，HMR 不承诺保留旧会话。

本轮没有重测白板、嵌入等所有第三方功能。依赖锁定博客版本，npm audit 仍报告 21 项依赖漏洞（3 low、4 moderate、14 high）；本地体验不是生产发布验收。
