# LivePhotoDemo

## 用户要求与协作
- 中文沟通，Conventional Commits，提交说明用中文。默认本地提交，不擅自推送/部署；GitHub 用本机 gh，PR 先 Draft。
- 禁止批量删除文件或目录；只允许删除一个明确路径文件。可清理本任务自己的 worktree，不干扰其他工作。
- 控制资源占用：只保留用户需要的开发服务，测试后关闭自启浏览器和临时预览；构建使用 2 GB Node 堆限制，不并行跑多个构建/转码。
- 当前项目是 Demo，博客源码仅作参考，不修改 SinPersonalSpace、不接真实博客 API、不读写相册，不改用户原始图片/视频。
- 有后端接口未知字段先问用户，不猜；业务接口开发日志记录方法、URL、参数、请求头和响应，敏感字段脱敏，生产不打印。本项目目前无业务 API。
- UI 还原须使用真实素材，缺图向用户说明，不用 CSS/SVG 冒充图片。这里以原编辑器图片节点的实际 UI 为基准。
- 上下文压缩前更新本文件；只提交本任务路径，禁止 git add -A。

## 当前目标与实现
用户批准：页面只放 rich editor，使用博客同款编辑器；实况图看起来和编辑器里的普通图片一致，仅按住才播放视频，享有相同选区与原图片操作。

- React Router 7 Framework SPA、TypeScript、StyleX；Haklex ShiroEditor 0.0.85 + Lexical 0.41.0，保留原工具栏、菜单、样式。
- `LivePhotoNode extends ImageNode`，继承 src/altText/caption/尺寸/缩略信息等字段与 API，额外保存 videoSrc、fileName。不再使用旧 assetId 独立播放器模型。
- 直接复用 `ImageEditRenderer`。`@haklex__rich-renderer-image@0.0.85.patch` 增加覆盖层、额外工具按钮、下载回调插槽；原 Duplicate 改用 `$copyNode`，保留子类和视频，不复制另一套图片 UI。
- `ImageSelectionPlugin` 同时处理普通图片和实况图的点击/Shift/选区高亮。删除、剪贴板、历史、块拖动由原 Lexical/Haklex 处理。
- 原操作栏：Edit details、Replace image、Open source、Duplicate、Download、Remove image；实况仅加替换视频和声音开关。无常驻底栏、无额外一整行插入按钮。
- 长按 250ms 播放，移动超过 8px、拖动、离开、松开、失焦/隐藏时停止；不捕获指针，不用大 button 覆盖图片。LIVE 小标识支持键盘播放。长按时抑制触屏原生菜单，普通右键保持正常。
- 普通图片上传保留原格式/透明度/动画；实况封面及导出使用 JPEG（质量 0.92、透明填白）。视频保持原始字节，不转码。
- `session.files` 保存 Blob URL→Blob，页面卸载释放；为撤销保留资源，累计输入资源最多 256 MB。图片最多 20 MB/2400 万像素，视频最多 100 MB/30 秒。
- 替换封面保留视频，替换视频保留封面，各自可撤销。下载用当前资源重新生成 Motion Photo；Open source 与普通图一样打开当前封面。
- 仍是本地会话，刷新清空；博客保存、发布页渲染、跨页面持久化尚未接入。节点结构升级后需要刷新重新插入。
- 原图片没有拖拽缩放手柄，本次不另加实况专用缩放；沿用相同尺寸规则。
- 2026-11-06 用户指出竖图过高：博客 CodeMirror Markdown 所见即所得编辑器的块图已有 max-height:400px / max-width:100%；Haklex 富文本本身只有宽度约束，阅读页另有 min(70vh,42rem)。不要混淆这三层。
- 当前 Demo 两种图片统一由 `app/editor/image-layout.css` 限制为 max-height:min(70vh,400px)、正文宽度以内；加载后解除行内占位宽度/比例，让图片等比缩小且不放大小图。视频用 contain，不裁切。属于第三方组件布局覆盖，不改节点原始尺寸和文件。

## 服务与构建
- `npm run dev` 固定 127.0.0.1:5173；`npm start` 固定 127.0.0.1:4173。
- **不要把 5173 从开发切成生产预览。** 已打开的页面仍请求 `/app/editor/live-photo-view.tsx`，生产 HTML 兜底会导致 Failed to fetch dynamically imported module / An error was thrown。
- `node scripts/check-dev-server.mjs` 验证延迟模块实际返回 JavaScript，曾在错误服务下实测失败、恢复后通过。
- Vite optimizeDeps 显式包含延迟加载的编辑器入口，避免第一次插入导致整页刷新丢失素材。
- StyleX cssInjectionTarget 指向必载的 `assets/root-*.css`，否则可能注入延迟白板 CSS，生产页/弹窗无样式。开发用 `virtual:stylex:runtime`。
- StyleX 边框用 borderWidth/borderStyle/borderColor，不用会被丢弃的 border 简写。
- 保留 lucide-react 0.574.0 去重与 Excalidraw 的 Radix Tabs 1.1.2 覆盖；重复图标库曾使构建超过 2 GB。
- 依赖补丁由 `npm run postinstall` 幂等应用。更新补丁后用 `npm run dev -- --force` 重建 Vite 缓存。修改 overrides 后必要时 npm dedupe --include=dev，再执行 postinstall。

## 编辑器实现易错点
- React onClick 设置 NodeSelection 后会被 Lexical 默认 CLICK_COMMAND 清空，要在优先级更高的编辑器命令里统一处理。
- selected 也可能表示 RangeSelection 包含节点，不能据此拦截 Backspace/Delete 只删图片；否则文字混合选区会残留。
- DOM→Lexical 节点读取需要 `editor.read()` 的活动编辑器上下文，不是仅 editorState.read。图像 load/error 后也要重绘选区高亮。
- 原 BlockExitPlugin 对合法 RootNode 选区调用 getTopLevelElementOrThrow 会报错；同版本核心补丁对上下方向键/快捷退出分支加根节点判断，交回默认逻辑。
- `video.play()` 被正常暂停打断的 AbortError 不显示为失败；原图片加载后才挂载 video，暂停必须读取最新 ref，ref 移除时也要暂停旧播放器。

## 验证（2026-11-06）
- `npm test` 4 项通过：JPEG/XMP/视频字节边界、错误输入、继承/JSON 往返、复制与替换保留实况数据。
- 类型检查通过；生产构建在 `NODE_OPTIONS=--max-old-space-size=2048 npm run build` 下通过。
- `tests/editor-selection.browser.mjs`：单选、全选、混合删除/撤销、跨块拖选、编辑器内复制粘贴、Shift 多选通过。
- `tests/native-image.browser.mjs`：普通 PNG 保留格式、两种图片框尺寸与 8px 圆角一致、原六项工具按钮保留、Duplicate 保留视频、图注、替换封面/视频、撤销/重做、最新资源下载、长按/移动取消、块手柄排序、普通图与实况混选删除/撤销通过。图片框现受统一的 400px/70vh 限高。
- 390px 无横向溢出。原图片不存在的能力不能宣称已实现；白板/嵌入等外围功能未整套重测。
- 图片限高修复：用户 1024×2270 竖图由约 668×1481 显示为 180×400；在 500px 高窗口为约 158×350，两类节点一致、比例保持，视频覆盖层也跟随尺寸。
- 用户 Downloads 的 mmexport1793954552951.jpg/mp4 已在生产 4173 复验：两种图片尺寸一致，HEVC 864px 视频按住播放、松开暂停并隐藏，无控制台错误；下载视频/音轨与原文件逐字节一致。原文件不修改、不提交。
- 浏览器测试用忽略提交的 artifacts/ 素材，生成命令见 README；必须关闭测试 TaskSpace。不要将截图/临时文件称为实机相册兼容验证。
- 依赖沿用博客版本，npm audit 报告 21 项既有问题，未执行破坏性自动升级；本地体验不是生产发布验收。
