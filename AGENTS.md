# LivePhotoDemo

## 项目目标
验证一张图片与一段视频生成实况图的可行性。React Router Framework Mode、TypeScript、StyleX；shadcn/ui 的 Radix 组件将样式适配为 StyleX。

## 工作约定
- 中文沟通，Conventional Commits，提交描述用中文。PR 先 Draft；未经授权不推送或发布。
- 禁止批量删除文件或目录，只能删除一个明确路径文件。允许清理本任务的临时 worktree。
- 控制资源占用；转码一次只处理一个任务，完成后关闭测试进程和浏览器资源。
- 不读取或改动用户相册。生成文件与相册实机验证是两个独立步骤。
- 图片素材不足要说明，不用 CSS/SVG 冒充图片。没有设计稿时采用简洁工作台。
- 后端接口不清楚时向用户确认，不猜枚举值；开发环境记录请求方法、URL、请求头、参数及响应，生产不记录，敏感头需脱敏。
- 上下文压缩前更新本文档的状态和验证结果。

## 设计方向
- 用户新要求：页面只保留 rich editor，复用 SinPersonalSpace 博客编辑器，插入 Live Photo 节点体验。
- 同款 Haklex ShiroEditor 0.0.85 + Lexical 0.41.0，保留原工具栏、菜单和编辑样式。外层简洁白色编辑页面。
- 不改博客仓库、不接博客 API。仅本地会话，刷新清空，页面明确提示。

## 当前状态
用户已明确：先做 Google Motion Photo 原理，图片在前、视频追加在后，不做苹果 Live Photo。
纯浏览器方案，PNG/JPG 重新编码为 JPEG 并写入 XMP Container 目录，然后追加原始 MP4；无业务接口。
React Router 7 Framework SPA、TypeScript、StyleX，shadcn/ui 的 Radix 组件手动适配 StyleX。
`npm run dev` 开发；`npm run build` 构建；`npm start` 预览静态产物；`npm run typecheck` 和 `npm test` 验证。
测试先验证 XMP 长度及视频原始字节回读，再以浏览器测试真实上传与下载；手机相册兼容性仍待用户实机验证。
图片最大 20 MB/2400 万像素；MP4 最大 100 MB/30 秒，不转码。Blob URL、图像位图和临时 video 节点需要释放。

## 已验证与注意事项（2026-11-06）
- `npm test` 2 项通过；TypeScript 检查和生产构建通过。React Router 仅提示 v8 迁移预告。
- 浏览器验证 PNG/JPG、MP4、合成/下载、鼠标按住/松开、空格按住/松开、声音开关、说明弹窗和错误文件拒绝；390px 无横向溢出。
- 下载文件经独立 XML 解析、JPEG 解码、MP4 哈希比较和 ffprobe 检查：图片有效，视频与原文件一致。
- 当前 StyleX 插件默认 full 模式使用 `virtual:stylex:runtime`；不要照新版网页示例误用 css-only 模式的虚拟模块。
- StyleX 中使用 borderWidth/borderStyle/borderColor，不用会被丢弃的 border 简写。
- `video.play()` 被松手 `pause()` 打断会产生 AbortError，属于正常操作，不应提示失败。
- 无云端部署、无 GitHub 推送、无用户相册操作。手机相册识别仍未验证。

## 富文本接入（2026-11-06）
- `app/editor/blog-editor.tsx` 复用博客的 React 编辑器组合，去掉 Vue 与上传 API。复制 11 份同版本补丁并由 postinstall 幂等应用。
- `live-photo-node.ts` 注册独立块节点，JSON 只放素材 ID 和基本信息，支持 commandItems 的工具栏与斜杠菜单入口。
- `media-session.tsx` 持有素材 URL，卸载释放；删除节点后为撤销保留资源，整个会话最多 256 MB。生产持久化未实现。
- 为所有延迟加载的编辑器入口显式配置 optimizeDeps，避免首次插入时 Vite 整页刷新丢失素材。
- StyleX `cssInjectionTarget` 固定到 `assets/root-*.css`；否则生产时可能注入白板等延迟 CSS，页面壳和弹窗无样式。要实际打开生产预览验证，不能只看构建成功。
- 3 项 Node 测试、类型检查通过；实测插入后继续输入、按住/松开播放、下载文件视频字节一致、删除/撤销/重做、斜杠菜单和 390px 无横向溢出。
- 必须保留博客的 lucide-react 0.574.0 去重与 Excalidraw Radix Tabs 1.1.2 覆盖；多份图标库会使打包超 2 GB。npm 更改 overrides 后必要时 `npm dedupe --include=dev`，随后重跑 postinstall，不能只看配置假设已去重。
- 去重后生产构建在 `NODE_OPTIONS=--max-old-space-size=2048` 下通过。只运行一套本地服务，结束验证后关闭测试浏览器；用户体验服务可以按明确要求保留。
- 本轮验证范围为正文与实况图，不代表白板、嵌入等第三方功能全部重测。依赖沿用博客版本，尚未做完整生产安全升级。
