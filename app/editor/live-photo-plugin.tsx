import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $createParagraphNode, $getRoot, $getSelection, $setSelection, COMMAND_PRIORITY_EDITOR, HISTORY_PUSH_TAG, type BaseSelection } from 'lexical';
import { Dialog } from 'radix-ui';
import { Check, Film, ImagePlus, Radio, X } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../components/ui';
import { readImage, readVideo } from '../lib/media';
import { $createLivePhotoNode, OPEN_LIVE_PHOTO_COMMAND } from './live-photo-node';
import { useBlobUrl, useMediaSession } from './media-session';

export function LivePhotoPlugin() {
  const [editor] = useLexicalComposerContext();
  const session = useMediaSession();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<Awaited<ReturnType<typeof readImage>>>();
  const [clip, setClip] = useState<Awaited<ReturnType<typeof readVideo>>>();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const selection = useRef<BaseSelection | null>(null);
  const photoUrl = useBlobUrl(photo?.blob);
  useEffect(() => editor.registerCommand(OPEN_LIVE_PHOTO_COMMAND, () => {
    selection.current = $getSelection()?.clone() ?? null;
    setOpen(true); return true;
  }, COMMAND_PRIORITY_EDITOR), [editor]);

  function close() { setOpen(false); setPhoto(undefined); setClip(undefined); setError(''); }
  async function select(file: File | undefined, kind: 'photo' | 'video') {
    if (!file || lock.current) return;
    lock.current = true; setBusy('正在读取素材…'); setError('');
    kind === 'photo' ? setPhoto(undefined) : setClip(undefined);
    try { kind === 'photo' ? setPhoto(await readImage(file)) : setClip(await readVideo(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '素材读取失败。'); }
    finally { lock.current = false; setBusy(''); }
  }
  async function insert() {
    if (!photo || !clip || lock.current) return;
    lock.current = true; setBusy('正在合成实况图…'); setError('');
    try {
      const src = session.addFile(photo.blob);
      const videoSrc = session.addFile(clip.blob);
      const name = photo.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]/gu, '_') || 'photo';
      editor.update(() => {
        if (selection.current) $setSelection(selection.current.clone());
        else $getRoot().selectEnd();
        const node = $createLivePhotoNode({ src, videoSrc, altText: photo.name, fileName: `${name}_MP.jpg`, width: photo.width, height: photo.height });
        $insertNodeToNearestRoot(node);
        if (!node.getNextSibling()) node.insertAfter($createParagraphNode());
        node.selectNext();
      }, { tag: HISTORY_PUSH_TAG, discrete: true });
      close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '插入失败，请重试。'); }
    finally { lock.current = false; setBusy(''); }
  }

  return <Dialog.Root open={open} onOpenChange={next => { if (!next && !lock.current) close(); }}><Dialog.Portal>
    <Dialog.Overlay {...stylex.props(s.overlay)} />
    <Dialog.Content {...stylex.props(s.dialog)} onCloseAutoFocus={event => { event.preventDefault(); editor.focus(); }}>
      <Dialog.Title {...stylex.props(s.title)}><Radio size={20} />插入实况图</Dialog.Title>
      <Dialog.Description {...stylex.props(s.description)}>选一张封面和一段视频，插入正文后按住图片播放。</Dialog.Description>
      <div {...stylex.props(s.fields)}>
        <label {...stylex.props(s.upload)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'photo'); }}>
          <input aria-label="实况图封面" type="file" accept="image/png,image/jpeg,.jpg,.jpeg,.png" disabled={!!busy} {...stylex.props(s.input)} onChange={event => { void select(event.target.files?.[0], 'photo'); event.target.value = ''; }} />
          {photoUrl ? <img src={photoUrl} alt="封面预览" {...stylex.props(s.thumbnail)} /> : <ImagePlus size={26} strokeWidth={1.5} />}
          <strong {...stylex.props(s.fileName)}>{photo?.name ?? '选择封面图片'}</strong>
          <span {...stylex.props(s.meta)}>{photo ? `${photo.width} × ${photo.height}` : 'PNG / JPG · 最大 20 MB'}</span>
        </label>
        <label {...stylex.props(s.upload)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'video'); }}>
          <input aria-label="实况图视频" type="file" accept="video/mp4,.mp4" disabled={!!busy} {...stylex.props(s.input)} onChange={event => { void select(event.target.files?.[0], 'video'); event.target.value = ''; }} />
          {clip ? <Check size={26} strokeWidth={1.5} /> : <Film size={26} strokeWidth={1.5} />}
          <strong {...stylex.props(s.fileName)}>{clip?.name ?? '选择动态视频'}</strong>
          <span {...stylex.props(s.meta)}>{clip ? `${clip.duration.toFixed(1)} 秒 · ${(clip.blob.size / 1024 / 1024).toFixed(1)} MB` : 'MP4 · 最大 100 MB / 30 秒'}</span>
        </label>
      </div>
      <p {...stylex.props(s.note)}>仅在本地处理，不上传。建议使用 2–5 秒的 H.264 MP4。</p>
      {error && <p role="alert" {...stylex.props(s.error)}>{error}</p>}
      <div {...stylex.props(s.footer)}><Button secondary disabled={!!busy} onClick={close}>取消</Button><Button disabled={!photo || !clip || !!busy} onClick={() => void insert()}>{busy || '插入正文'}</Button></div>
      <Dialog.Close aria-label="关闭插入窗口" disabled={!!busy} {...stylex.props(s.close)}><X size={18} /></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
const s = stylex.create({
  overlay: { position: 'fixed', inset: 0, backgroundColor: '#0005', zIndex: 100 },
  dialog: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: 28, backgroundColor: '#fff', borderRadius: 14, zIndex: 101, boxShadow: '0 24px 64px #0002' },
  title: { fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  description: { color: '#71717a', fontSize: 13, lineHeight: 1.7, marginBottom: 24 },
  fields: { display: 'grid', gridTemplateColumns: { default: '1fr 1fr', '@media (max-width: 440px)': '1fr' }, gap: 12 },
  upload: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 160, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', borderRadius: 10, backgroundColor: { default: '#fafafa', ':hover': '#f4f4f5', ':focus-within': '#eff3ff' }, color: '#71717a', textAlign: 'center' },
  input: { position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
  thumbnail: { width: 64, height: 64, objectFit: 'contain', borderRadius: 4 },
  fileName: { fontSize: 12, color: '#3f3f46', fontWeight: 500, overflowWrap: 'anywhere', maxWidth: '100%' },
  meta: { fontSize: 11, color: '#71717a' },
  note: { fontSize: 11, lineHeight: 1.8, color: '#71717a', marginTop: 16 },
  error: { color: '#b42318', fontSize: 12, lineHeight: 1.7, marginTop: 12 },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
  close: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, display: 'grid', placeItems: 'center', backgroundColor: 'transparent', color: '#71717a', borderWidth: 0, cursor: 'pointer' },
});
