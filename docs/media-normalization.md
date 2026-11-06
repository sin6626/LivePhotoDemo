# Mac 媒体兼容与标准化评估

日期：2026-11-06。结论：图片节点扩展与双资源引用的架构可以保留；要面向不同设备，需在素材进入编辑器前增加独立的格式标准化步骤。当前网页没有接入自动视频转码，不能把本机播放成功当成跨平台兼容证明。

## 实测条件与结果

环境为这台 Mac 上的 Chromium 156（Ego Browser）。真实源视频来自用户 Downloads 中的 MP4，ffprobe 确认视频为 HEVC/H.265，音频为 AAC，8-bit SDR，864×1920，约 2.944 秒。

Downloads 中没有找到 HEIC/MOV 原片。HEIC 是通过 macOS sips 从用户 JPEG 生成的；MOV 是从真实 HEVC MP4 无损换容器生成的。它们是受控格式样本，不代表所有 iPhone 原片、HDR 或辅助图像元数据情况。

| 文件 | 浏览器原生解码 | 当前 Demo 输入 | 结论 |
|---|---|---|---|
| HEIC | HTMLImageElement、createImageBitmap 均失败；ImageDecoder 不支持 image/heic | 拒绝 | 浏览器原生解码不能覆盖这类输入 |
| HEIC 转出的 JPEG | 成功，1024×2270 | 接受 | 本机系统解码后导出 JPEG 可行 |
| 真实 HEVC + AAC MP4 | 成功 | 接受 | MP4 容器不代表已经是 H.264 |
| HEVC + AAC MOV | 成功 | 当前容器白名单拒绝 | 容器与编码是两件事，应用限制与浏览器能力也不同 |
| H.264 + AAC MOV | 成功 | 当前容器白名单拒绝 | 编码合适时可只换成 MP4 容器 |
| H.264 + AAC MP4 | 成功 | 接受 | 作为通用播放衍生文件的候选 |

当前环境还报告 WebCodecs H.264 编码与 AAC 编码可用。这只是能力探测，未实现或验证完整浏览器转码器；WebCodecs 自身不处理容器封装/解封装。不同系统、浏览器和具体编码配置的支持不同。[MDN WebCodecs 概念](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Video_processing_concepts)、[编码选择](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection)。

原始结果在忽略提交的 `artifacts/mac-formats/browser-results.json`；复测脚本为 `tests/mac-formats.browser.mjs`。样本和转换副本都在 artifacts 内，未改原文件。

转换后的 JPEG + H.264/AAC MP4 已实际插入英文版编辑器，按住播放、松开暂停、导出 Motion Photo 均通过；从导出文件提取的视频与转换后的 MP4 逐字节一致。输出视频为 High / Level 4.1、29 fps，音频为 AAC-LC。

H.264/AAC MOV→MP4 的 `-c copy` 重封装也已实测，视频和音频的编码数据 SHA-256 均保持一致，输出通过 Demo 的 MP4 容器检查；记录在 `artifacts/mac-formats/remux-results.json`。

## 推荐分工

```text
原始素材 → 检测容器、编码、尺寸、色彩 → 保留 / 换容器 / 转码
                                     ↓
                         标准图片与视频 + 元数据
                                     ↓
                      编辑器节点 src / videoSrc
                                     ↓
                         按需导出 Motion Photo
```

- 编辑器保持现在的 ImageNode 扩展，只负责显示、选区和编辑，不承担复杂解码/转码任务。
- 正式博客在上传入口调用独立转换逻辑。本机实验可用 sips + FFmpeg；生产环境采用对应系统可用的 HEIF 解码器与 FFmpeg。先用简单、限制并发的处理流程，不必先建复杂任务队列。
- 已符合目标的素材不重复编码。H.264/AAC MOV 可无损换容器；HEVC 等需要转成 H.264 才能满足统一编码目标，改后缀或 `-c copy` 都不会改变编码。
- 实况照片封面用 JPEG；普通图片按用途保留透明 PNG、动画等语义，不能为统一后缀一律压成 JPEG。
- 通用视频衍生文件可采用 MP4 + H.264 + yuv420p，存在音轨时用 AAC，并启用 faststart；同时限制尺寸、帧率和编码级别。H.264 是广泛支持的兼容性选择，不是所有终端的绝对保证。[MDN 编码选择](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection)
- 保留原文件与转换后的展示文件，避免有损转码、透明度、HDR 或元数据丢失后无法重做。
- 当前节点里的 blob URL 只在当前会话有效。正式存储应换成持久化资源 URL/ID，保存标准文件的尺寸、时长、编码和音轨信息。
- Motion Photo 是导出容器，不宜作为图片压缩/CDN 优化管线唯一输入。标准图片和视频分开提供，避免图像重编码剥离尾部视频。

## 本轮本机转换验证

本轮使用 sips 将样本 HEIC 导出为 JPEG；FFmpeg 将 SDR HEVC MOV 转为 H.264 High / Level 4.1、yuv420p、AAC 的 MP4，full-range 转 limited-range，保留约 2.944 秒时长并写 faststart。转换后的文件约 336 KB（JPEG）和 2.03 MB（MP4），这些只是本样本结果，不能推断其他素材的压缩率或性能。

对应操作核心为：

```sh
sips -s format jpeg input.heic --out output.jpg
ffmpeg -i input.mov -map 0:v:0 -map '0:a:0?' \
  -vf scale=in_range=full:out_range=tv \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
  -profile:v high -level:v 4.1 -color_range tv \
  -c:a aac -b:a 128k -movflags +faststart -threads 2 output.mp4
```

这条视频命令针对本轮已确认的 full-range SDR 源文件，不是任意 HDR 输入的通用命令。

## 尚未证明的范围

- 未测试真实相机 HEIC 辅助图、10-bit HDR、HLG/PQ、Dolby Vision、ProRes、RAW。
- 未在 Safari、Firefox、Windows、Android 和手机相册做完整交叉验证。
- 未证明音画同步、色彩和细节在所有输入上都保真；只验证本样本可解码、输出编码/尺寸/时长及在当前 Demo 使用的流程。
- 格式标准化不等于苹果原生 Live Photo，也不保证所有相册能识别 Google Motion Photo。
