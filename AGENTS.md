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
- 用途：本地验证图片与视频配对，导出后交给相册验证。
- 气质：安静、直接、可检查。
- 视觉：暖白照片工作台、石墨文字、绿色操作按钮。
- 重点：双文件选择和可按住播放的大幅预览。
- 细节：图片与视频两条素材轨道及配对状态。

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
