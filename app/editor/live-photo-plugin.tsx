import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $createParagraphNode, $getRoot, $getSelection, $setSelection, COMMAND_PRIORITY_EDITOR, HISTORY_PUSH_TAG, type BaseSelection } from 'lexical';
import { ActionBar, ActionButton, Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from '@haklex/rich-editor-ui';
import { Check, Film, LockKeyhole, Upload, X } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
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
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const selection = useRef<BaseSelection | null>(null);
  const photoUrl = useBlobUrl(photo?.blob);
  useEffect(() => editor.registerCommand(OPEN_LIVE_PHOTO_COMMAND, () => {
    selection.current = $getSelection()?.clone() ?? null;
    setOpen(true); return true;
  }, COMMAND_PRIORITY_EDITOR), [editor]);

  function close() { request.current?.abort(); request.current = null; lock.current = false; setBusy(''); setOpen(false); setPhoto(undefined); setClip(undefined); setError(''); }
  async function select(file: File | undefined, kind: 'photo' | 'video') {
    if (!file || lock.current) return;
    const job = new AbortController(); request.current = job;
    lock.current = true; setBusy(kind === 'photo' ? 'Preparing image…' : 'Preparing video…'); setError('');
    kind === 'photo' ? setPhoto(undefined) : setClip(undefined);
    try {
      if (kind === 'photo') { const image = await readImage(file, job.signal); if (!job.signal.aborted) setPhoto(image); }
      else { const video = await readVideo(file, job.signal); if (!job.signal.aborted) setClip(video); }
    } catch (cause) { if (!job.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not prepare the file.'); }
    finally { if (request.current === job) { request.current = null; lock.current = false; setBusy(''); } }
  }
  async function insert() {
    if (!photo || !clip || lock.current) return;
    lock.current = true; setBusy('Preparing live photo…'); setError('');
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not insert the live photo. Please try again.'); }
    finally { lock.current = false; setBusy(''); }
  }

  return <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
    <DialogPopup showCloseButton={false} style={{ padding: 0, gap: 0, width: 'min(560px, calc(100vw - 2rem))', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
      <div {...stylex.props(s.header)}><DialogTitle>Insert live photo</DialogTitle></div>
      <div {...stylex.props(s.body)}>
        <DialogDescription>Choose a cover image and a short video. Press and hold the image to play.</DialogDescription>
        <div {...stylex.props(s.fields)}>
          <label {...stylex.props(s.upload)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'photo'); }}>
            <input aria-label="Cover image" type="file" accept="image/png,image/jpeg,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif" disabled={!!busy} {...stylex.props(s.input)} onChange={event => { void select(event.target.files?.[0], 'photo'); event.target.value = ''; }} />
            {photoUrl ? <img src={photoUrl} alt="Cover preview" {...stylex.props(s.thumbnail)} /> : <span {...stylex.props(s.icon)}><Upload size={18} /></span>}
            <strong {...stylex.props(s.fileName)}>{photo?.name ?? 'Choose cover image'}</strong>
            <span {...stylex.props(s.meta)}>{photo ? `${photo.width} × ${photo.height}${photo.converted ? ' · Converted to JPEG' : ''}` : 'JPEG, PNG, HEIC/HEIF · 20 MB'}</span>
          </label>
          <label {...stylex.props(s.upload)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void select(event.dataTransfer.files[0], 'video'); }}>
            <input aria-label="Video clip" type="file" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v" disabled={!!busy} {...stylex.props(s.input)} onChange={event => { void select(event.target.files?.[0], 'video'); event.target.value = ''; }} />
            <span {...stylex.props(s.icon)}>{clip ? <Check size={18} /> : <Film size={18} />}</span>
            <strong {...stylex.props(s.fileName)}>{clip?.name ?? 'Choose video'}</strong>
            <span {...stylex.props(s.meta)}>{clip ? `${clip.duration.toFixed(1)} s · ${clip.action === 'original' || clip.action === 'cached' ? 'Compatible MP4' : clip.action === 'remuxed' ? 'Remuxed to MP4' : 'Converted to MP4'}` : 'MP4, MOV · 100 MB / 30s'}</span>
          </label>
        </div>
        {error && <p role="alert" {...stylex.props(s.error)}>{error}</p>}
      </div>
      <div {...stylex.props(s.footer)}>
        <span {...stylex.props(s.note)}><LockKeyhole size={12} />Processed on this Mac. Originals are kept.</span>
        <ActionBar><ActionButton variant="outline" onClick={close}>Cancel</ActionButton><ActionButton variant="accent" disabled={!photo || !clip || !!busy} onClick={() => void insert()}>{busy || 'Insert'}</ActionButton></ActionBar>
      </div>
      {!busy && <DialogClose aria-label="Close dialog" {...stylex.props(s.close)}><X size={16} /></DialogClose>}
    </DialogPopup>
  </Dialog>;
}
const s = stylex.create({
  header: { padding: '14px 16px 12px', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--rc-border)' },
  body: { display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' },
  fields: { display: 'grid', gridTemplateColumns: { default: '1fr 1fr', '@media (max-width: 440px)': '1fr' }, gap: 12 },
  upload: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 190, padding: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: { default: 'var(--rc-border)', ':hover': 'color-mix(in srgb, var(--rc-accent) 35%, transparent)', ':focus-within': 'var(--rc-accent)' }, borderRadius: 'var(--rc-radius-md)', backgroundColor: { default: 'transparent', ':hover': 'color-mix(in srgb, var(--rc-accent) 6%, transparent)' }, color: 'var(--rc-text-secondary)', textAlign: 'center', transition: 'border-color 150ms, background-color 150ms' },
  input: { position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
  icon: { display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 'var(--rc-radius-md)', backgroundColor: 'color-mix(in srgb, var(--rc-text) 6%, transparent)' },
  thumbnail: { width: 40, height: 40, objectFit: 'contain', borderRadius: 'var(--rc-radius-sm)' },
  fileName: { fontSize: 'var(--rc-font-size-sm)', color: 'var(--rc-text)', fontWeight: 600, overflowWrap: 'anywhere', maxWidth: '100%' },
  meta: { fontSize: 'var(--rc-font-size-xs)', color: 'var(--rc-text-secondary)' },
  note: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--rc-font-size-xs)', color: 'var(--rc-text-secondary)' },
  error: { color: 'var(--rc-alert-caution)', fontSize: 'var(--rc-font-size-xs)', lineHeight: 1.7 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '10px 16px', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--rc-border)', backgroundColor: 'color-mix(in srgb, var(--rc-text) 2%, transparent)' },
  close: { position: 'absolute', top: 8, right: 8, display: 'grid', placeItems: 'center', width: 32, height: 32, padding: 0, borderWidth: 0, borderRadius: 'var(--rc-radius-sm)', backgroundColor: { default: 'transparent', ':hover': 'var(--rc-fill-secondary)' }, color: 'var(--rc-text-tertiary)', cursor: 'pointer' },
});
