# Live Photo Editor Demo

使用 SinPersonalSpace 博客同款 **Haklex ShiroEditor 0.0.85 + Lexical 0.41.0**，在富文本正文中插入可按住播放的实况图。

```sh
npm install --include=dev
npm run dev
# http://127.0.0.1:5173
```

页面仅包含富文本编辑器。点击「插入实况图」，或在正文输入 `/` 搜索「实况图」，选择 PNG/JPG + MP4 后插入。正文中的实况图支持按住播放、松开回到封面、声音切换、下载 Motion Photo、删除和撤销/重做。空格、Enter 也可按住播放。

**这是本地会话 Demo，刷新页面会清空正文和素材；不连接博客 API，不上传，不保存到博客或系统相册。**

## 编辑器复用范围

- 来源：`SinPersonalSpace/apps/admin/src/components/editor/rich/RichEditor.tsx` 的 React 编辑器组合。
- 直接使用同版本 ShiroEditor、ToolbarPlugin、DialogStackProvider 和 NestedDocPlugin，保留库自身样式、浮动工具栏、斜杠菜单、块菜单。
- 不复制后台 Vue 桥接、登录、上传接口或其他业务代码。
- `patches/` 复制博客相同版本的 11 份 Haklex/Lexical 修复；`scripts/apply-editor-patches.mjs` 安装后幂等应用。依赖和补丁保存在 Demo 内，不引用或修改博客的 node_modules。
- 保留 Haklex 自带 CSS（原编辑器的一部分）；页面壳、实况图节点和插入弹窗用 StyleX，弹窗使用 Radix，按钮为 shadcn/ui 组合方式的 StyleX 适配。
- React Router 7 Framework Mode / SPA、React 19、TypeScript。

## Live Photo 节点

`app/editor/live-photo-node.ts` 注册 `live-photo` DecoratorNode，并通过 Haklex 的 commandItems 同时进入工具栏、斜杠菜单、块菜单。

节点 JSON 只存 `assetId / fileName / width / height`，不会把视频 base64 塞进正文。资源由页面会话持有，以便删除后仍可撤销；关闭页面或卸载编辑器会释放 Blob URL。会话累计素材上限 256 MB。接入真实业务时，应把临时 assetId 换成持久化资源引用，并提供阅读端渲染器。

图片限 20 MB、2400 万像素；MP4 限 100 MB、30 秒。PNG/JPG 经过 Canvas 转为 JPEG（质量 0.92，透明区域填白，原 EXIF/HDR 不保留）。将 XMP 目录写入 JPEG 后追加原始 MP4，合成后回读输出文件以确认资源边界。视频不转码，建议 2–5 秒 H.264 MP4。

视频 `preload="none"`，按住才播放；松开、失焦、离开视口和卸载时暂停。下载产物为 Google 风格 Motion Photo JPG，不是苹果 Live Photo，手机相册识别仍需实测。内部解析器只支持 Demo 自己生成的布局。

格式依据：[Google Motion Photo format](https://developer.android.com/media/platform/motion-photo-format)。

## 验证

```sh
npm test
npm run typecheck
npm run build
npm start # 静态生产预览，Ctrl+C 关闭
```

Node 原生测试覆盖：XMP 长度与视频字节一致性、错误输入、Live Photo 节点与正文混排及 JSON 往返。
浏览器已验证输入正文、插入、后续继续输入、按住播放、下载、删除、撤销/重做、斜杠菜单和 390px 手机宽度。
下载文件提取的视频与输入 MP4 逐字节一致。去重后生产构建在 2 GB Node 堆限制内通过。
本轮没有重测白板、嵌入等所有第三方功能。依赖锁定博客版本，npm audit 目前报告 21 项依赖漏洞（3 low、4 moderate、14 high），未为此 Demo 擅自升级整套博客依赖；不能把本地体验视为生产发布验收。
`artifacts/` 是不提交的本地测试文件与截图。

开发注意：Vite 需提前预构建延迟加载的编辑器依赖，避免用户首次插入实况图时触发整页刷新。修改素材会话模块时请刷新页面，HMR 不保证保留当前会话。保持 lucide-react 去重与 Excalidraw 的 Radix Tabs 版本覆盖，避免重复打包和旧版 React peer 冲突。
