import { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { $getNodeByKey, COMMAND_PRIORITY_LOW, HISTORY_PUSH_TAG, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, type NodeKey } from 'lexical';
import { Download, Radio, Trash2, Volume2, VolumeX } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import type { LivePhotoData } from './live-photo-node';
import { useMediaSession } from './media-session';

export default function LivePhotoView({ data, nodeKey }: { data: LivePhotoData; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const [selected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const { assets } = useMediaSession();
  const asset = assets.get(data.assetId);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const frame = useRef<HTMLElement>(null);

  function stop() { video.current?.pause(); setPlaying(false); }
  function play() {
    const player = video.current;
    if (!player) return;
    setError(''); player.currentTime = 0; setPlaying(true);
    void player.play().catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setPlaying(false); setError('此浏览器无法播放视频，请使用 H.264 MP4。');
    });
  }
  useEffect(() => {
    const element = frame.current;
    const player = video.current;
    const pause = () => { player?.pause(); setPlaying(false); };
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause(); });
    if (element) observer.observe(element);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => { observer.disconnect(); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); player?.pause(); };
  }, [asset]);
  useEffect(() => {
    const remove = (event: KeyboardEvent) => {
      if (!selected) return false;
      event.preventDefault(); $getNodeByKey(nodeKey)?.remove(); return true;
    };
    const backspace = editor.registerCommand(KEY_BACKSPACE_COMMAND, remove, COMMAND_PRIORITY_LOW);
    const del = editor.registerCommand(KEY_DELETE_COMMAND, remove, COMMAND_PRIORITY_LOW);
    return () => { backspace(); del(); };
  }, [editor, nodeKey, selected]);

  if (!asset) return <div contentEditable={false} {...stylex.props(s.missing)}>这张实况图的本地素材已失效，请重新插入。</div>;
  return <figure ref={frame} contentEditable={false} {...stylex.props(s.figure, selected && s.selected)} onClick={() => { clearSelection(); setSelected(true); }}>
    <button type="button" aria-label="按住播放实况图" {...stylex.props(s.preview)}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); play(); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onBlur={stop} onContextMenu={event => event.preventDefault()}
      onKeyDown={event => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); event.stopPropagation(); play(); } }}
      onKeyUp={event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); stop(); } }}>
      <img src={asset.imageUrl} alt={data.fileName} draggable={false} {...stylex.props(s.image)} />
      <video ref={video} src={asset.videoUrl} playsInline muted={muted} preload="none" onEnded={stop} onError={() => { stop(); setError('视频加载失败，请重新插入素材。'); }} {...stylex.props(s.video, playing && s.visible)} />
      <span {...stylex.props(s.badge)}><Radio size={14} />{playing ? '播放中' : 'LIVE'}</span>
    </button>
    <figcaption {...stylex.props(s.caption)}>
      <span {...stylex.props(s.hint)}>{playing ? '松开回到照片' : '按住播放实况'}</span>
      <button type="button" title={muted ? '开启声音' : '静音'} aria-label={muted ? '开启声音' : '静音'} aria-pressed={!muted} onClick={event => { event.stopPropagation(); setMuted(!muted); }} {...stylex.props(s.iconButton)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      <a href={asset.downloadUrl} download={data.fileName} title="下载 Motion Photo" aria-label="下载实况图" onClick={event => event.stopPropagation()} {...stylex.props(s.iconButton)}><Download size={16} /></a>
      <button type="button" aria-label="删除实况图" title="删除实况图" onClick={event => { event.stopPropagation(); editor.update(() => { const node = $getNodeByKey(nodeKey); node?.selectNext(); node?.remove(); }, { tag: HISTORY_PUSH_TAG }); }} {...stylex.props(s.iconButton)}><Trash2 size={16} /></button>
    </figcaption>
    {error && <p role="alert" {...stylex.props(s.error)}>{error}</p>}
  </figure>;
}
const s = stylex.create({
  figure: { margin: '24px auto', width: 'fit-content', maxWidth: '100%', borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  selected: { borderColor: '#748bdb', boxShadow: '0 0 0 2px #748bdb26' },
  preview: { display: 'block', position: 'relative', borderWidth: 0, padding: 0, backgroundColor: '#f5f5f5', maxWidth: '100%', touchAction: 'pan-y', userSelect: 'none', cursor: 'pointer' },
  image: { display: 'block', maxWidth: '100%', maxHeight: 'min(60vh, 480px)', width: 'auto', height: 'auto', objectFit: 'contain', minWidth: 200 },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#f5f5f5', opacity: 0, pointerEvents: 'none' },
  visible: { opacity: 1 },
  badge: { position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 8px', borderRadius: 5, color: '#fff', backgroundColor: '#202020b8', lineHeight: 1.5 },
  caption: { display: 'flex', alignItems: 'center', padding: '4px 8px 4px 14px', gap: 4, minHeight: 40 },
  hint: { flex: 1, fontSize: 11, color: '#71717a', whiteSpace: 'nowrap', marginRight: 8 },
  iconButton: { display: 'grid', placeItems: 'center', width: 32, height: 32, padding: 0, borderWidth: 0, borderRadius: 5, backgroundColor: { default: 'transparent', ':hover': '#f1f1f3' }, color: '#71717a', cursor: 'pointer' },
  error: { padding: '0 12px 12px', fontSize: 12, color: '#b42318' },
  missing: { padding: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#d4d4d8', color: '#71717a', fontSize: 13 },
});
