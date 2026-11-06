# Motion Lab

验证「一张图片 + 一段视频 → 一个 Motion Photo 文件」的本地 Demo。

```sh
npm install --include=dev
npm run dev
# http://127.0.0.1:5173
```

选择 PNG/JPG 和 MP4，按住画面预览，点击合成并下载 `_MP.jpg`。空格和 Enter 也可按住播放。声音开关只影响预览，导出保留原始音轨。

## 实现

- React Router 7 **Framework Mode / SPA**、React 19、TypeScript。
- StyleX 官方 Vite 插件；仅 reset 使用全局 CSS，组件使用 StyleX。
- shadcn/ui 的 Button、Switch 组合方式适配为 StyleX，底层使用 Radix 的 Slot、Switch、Dialog。没有引入 Tailwind，也没有额外的服务端接口。
- Canvas 将封面重新编码为 JPEG（质量 0.92，透明区域填白），去掉原有 EXIF/XMP，避免已有实况元数据冲突。
- 在 JPEG SOI 后写入 APP1 XMP，包含 Google Camera 字段及 Container 目录；JPEG EOI 后直接追加原始 MP4。视频不转码。
- 合成后重新解析输出文件，以 XMP 的长度找到末尾视频；结果预览使用从输出中提取的资源。

格式依据：[Google Motion Photo format 1.0](https://developer.android.com/media/platform/motion-photo-format)。StyleX 集成依据：[官方 Vite 文档](https://stylexjs.com/docs/learn/installation/vite/)，当前安装版本默认 full 模式使用 `virtual:stylex:runtime`。
组件结构参考：[shadcn/ui Switch](https://ui.shadcn.com/docs/components/switch)。

## 范围

图片上限 20 MB、2400 万像素；视频上限 100 MB、30 秒。建议 2–5 秒的 H.264 MP4。
只检查 MP4 容器标识和浏览器可解码的视频轨道，不对所有编码进行标准兼容性认证。不转码 MOV/WebM，不做剪辑，不保留图片 EXIF、透明通道或 HDR。内部提取器只针对本 Demo 生成的布局，不是任意实况图的导入器。

这是 Google 风格的 Motion Photo 文件，**不是苹果 Live Photo，也不保证所有相册都识别**。普通图片查看器只展示 JPEG。用原始文件传到目标手机测试，聊天软件压缩后的图片可能丢失末尾视频。

所有素材仅在当前页面内存中处理。刷新即清空；不上传、不写入系统相册。替换素材和卸载组件时释放 Blob URL，关闭位图及临时视频资源。

## 验证

```sh
npm test
npm run typecheck
npm run build
npm start # 静态生产预览，Ctrl+C 关闭
```

Node 原生测试覆盖 XMP APP1 长度、图片/视频边界、视频字节一致性和错误输入。
浏览器已验证 PNG 上传、MP4 读取、合成下载、按住/松开播放、声音开关、说明弹窗、390px 窄屏及错误格式提示。
下载后的文件另外经 Python XML 解析与字节比较，提取视频经 ffprobe 确认为 H.264、640×480、3 秒。
真实手机相册识别效果尚未验证。`artifacts/` 是忽略提交的本地测试文件与截图，不包含用户素材。
