// shadcn/ui 的 Button、Switch 组合方式，保留 Radix 行为，Tailwind 样式适配为 StyleX。
// https://ui.shadcn.com/docs/components/switch
import type { ComponentProps } from 'react';
import { Slot, Switch as SwitchPrimitive, Dialog as DialogPrimitive } from 'radix-ui';
import * as stylex from '@stylexjs/stylex';
import { X } from 'lucide-react';

export function Button({ asChild = false, secondary = false, ...props }: ComponentProps<'button'> & { asChild?: boolean; secondary?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp {...stylex.props(s.button, secondary && s.secondary)} {...props} />;
}

export function Switch(props: ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root {...stylex.props(s.switch)} {...props}><SwitchPrimitive.Thumb {...stylex.props(s.thumb)} /></SwitchPrimitive.Root>;
}

export function AboutDialog() {
  return <DialogPrimitive.Root><DialogPrimitive.Trigger asChild><button {...stylex.props(s.help)}>合成原理 ↗</button></DialogPrimitive.Trigger><DialogPrimitive.Portal><DialogPrimitive.Overlay {...stylex.props(s.overlay)} /><DialogPrimitive.Content {...stylex.props(s.dialog)}><DialogPrimitive.Title {...stylex.props(s.title)}>一张照片，两段内容。</DialogPrimitive.Title><DialogPrimitive.Description {...stylex.props(s.description)}>图片在前，视频在后；XMP 元数据告诉相册，视频从哪里开始。</DialogPrimitive.Description><div {...stylex.props(s.diagram)}><span>JPEG 静态图</span><span>＋ XMP 目录</span><span>＋ MP4 视频</span></div><p {...stylex.props(s.description)}>输出仍然是 .jpg 文件。普通图片查看器显示封面，支持 Motion Photo 的相册可以读取末尾的视频。具体手机、相册版本与编码的兼容性需要实测。</p><p {...stylex.props(s.description)}>本 Demo 重新编码封面为 JPEG（质量 92%，透明区域填白，不保留 EXIF），视频保持原始字节。不是苹果 Live Photo，也不会自动保存到系统相册。</p><a href="https://developer.android.com/media/platform/motion-photo-format" target="_blank" rel="noreferrer" {...stylex.props(s.source)}>查看 Google Motion Photo 格式文档 ↗</a><DialogPrimitive.Close aria-label="关闭说明" {...stylex.props(s.close)}><X size={20} /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

const s = stylex.create({
  button: { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 10, minHeight: 48, paddingInline: 20, backgroundColor: { default: '#285b46', ':hover': '#204a39', ':disabled': '#e2e6e0' }, color: { default: 'white', ':disabled': '#7a847c' }, fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'background-color 160ms' },
  secondary: { backgroundColor: { default: '#fff', ':hover': '#f3f5f1' }, borderColor: '#dce2da', color: '#35453b', minHeight: 40, paddingInline: 14 },
  switch: { width: 36, height: 22, borderWidth: 0, padding: 3, borderRadius: 20, backgroundColor: { default: '#b5beb6', ':is([data-state="checked"])': '#285b46' }, flexShrink: 0 },
  thumb: { display: 'block', width: 16, height: 16, borderRadius: 16, backgroundColor: '#fff', transform: { default: 'translateX(0)', ':is([data-state="checked"])': 'translateX(14px)' }, transition: 'transform 160ms' },
  help: { borderWidth: 0, backgroundColor: 'transparent', fontSize: 13, color: '#59665b', padding: 8 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: '#17271cb3', zIndex: 10 },
  dialog: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, calc(100vw - 32px))', padding: 32, backgroundColor: '#fff', borderRadius: 20, zIndex: 11, boxShadow: '0 20px 80px #0003' },
  title: { fontSize: 24, marginBottom: 16 },
  description: { fontSize: 14, lineHeight: 1.85, color: '#5b655d', marginBottom: 16 },
  diagram: { display: 'flex', flexWrap: 'wrap', gap: 16, padding: 20, backgroundColor: '#edf3ed', borderRadius: 8, fontSize: 13, marginBottom: 20 },
  source: { fontSize: 13, color: '#285b46' },
  close: { position: 'absolute', top: 16, right: 16, borderWidth: 0, padding: 4, backgroundColor: 'transparent' },
});
