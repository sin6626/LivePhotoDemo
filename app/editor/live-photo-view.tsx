import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ImageEditExtensionsProvider, ImageEditRenderer } from '@haklex/rich-renderer-image';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, HISTORY_PUSH_TAG, type NodeKey } from 'lexical';
import { Film, Radio, Volume2, VolumeX } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { LivePhotoNode, type LivePhotoData } from './live-photo-node';
import { useMediaSession } from './media-session';
import { readImage, readVideo } from '../lib/media';
import { createMotionPhoto } from '../lib/motion-photo';

export default function LivePhotoView({ data, nodeKey }: { data: LivePhotoData; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const session = useMediaSession();
  const video = useRef<HTMLVideoElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hold = useRef<{ x: number; y: number; timer: number } | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const downloadCache = useRef<{ image: string; video: string; url: string } | null>(null);
  const busy = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    if (video.current !== element) video.current?.pause();
    video.current = element;
  }, []);

  function stop() {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
    video.current?.pause(); setPlaying(false);
  }
  function play() {
    const player = video.current;
    if (!player) return;
    setError(''); player.currentTime = 0; setPlaying(true);
    void player.play().catch((cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      if (active.current) { setPlaying(false); setError('视频无法播放，封面仍可正常编辑。'); }
    });
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey || !(event.target instanceof Element) || !event.target.closest('.rr-image-frame')) return;
    stop();
    hold.current = { x: event.clientX, y: event.clientY, timer: window.setTimeout(play, 250) };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const origin = hold.current;
    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) stop();
  }
  useEffect(() => {
    const pause = () => { if (hold.current) clearTimeout(hold.current.timer); hold.current = null; video.current?.pause(); setPlaying(false); };
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause(); });
    if (wrapper.current) observer.observe(wrapper.current);
    window.addEventListener('pointerup', pause);
    window.addEventListener('pointercancel', pause);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', pause);
    return () => { observer.disconnect(); window.removeEventListener('pointerup', pause); window.removeEventListener('pointercancel', pause); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); pause(); };
  }, [data.videoSrc]);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort(); if (downloadCache.current) URL.revokeObjectURL(downloadCache.current.url); };
  }, []);

  async function replaceVideo(file: File | undefined) {
    if (!file || busy.current) return;
    busy.current = true; stop(); setError('');
    try {
      const clip = await readVideo(file);
      if (!active.current) return;
      const videoSrc = session.addFile(clip.blob);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (node instanceof LivePhotoNode) node.setVideoSrc(videoSrc);
      }, { tag: HISTORY_PUSH_TAG });
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : '替换视频失败。'); }
    finally { busy.current = false; }
  }
  async function download() {
    if (busy.current) return;
    busy.current = true; setError('');
    try {
      if (downloadCache.current?.image !== data.src || downloadCache.current?.video !== data.videoSrc) {
        controller.current = new AbortController();
        const timeout = window.setTimeout(() => controller.current?.abort(), 15000);
        try {
          const read = async (src: string) => {
            const local = session.files.get(src);
            if (local) return local;
            const response = await fetch(src, { signal: controller.current?.signal });
            if (!response.ok) throw new Error('无法读取资源，检查地址和跨域设置。');
            return response.blob();
          };
          const [cover, clip] = await Promise.all([read(data.src), read(data.videoSrc)]);
          if (cover.size > 20 * 1024 * 1024 || clip.size > 100 * 1024 * 1024) throw new Error('素材超过图片 20 MB / 视频 100 MB 的限制。');
          const image = (await readImage(new File([cover], 'cover.jpg'))).blob;
          const blob = await createMotionPhoto(image, clip);
          if (!active.current) return;
          if (downloadCache.current) URL.revokeObjectURL(downloadCache.current.url);
          downloadCache.current = { image: data.src, video: data.videoSrc, url: URL.createObjectURL(blob) };
        } finally { clearTimeout(timeout); }
      }
      if (downloadCache.current) {
        const link = document.createElement('a'); link.href = downloadCache.current.url; link.download = data.fileName; link.click();
      }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : '实况图导出失败。'); }
    finally { busy.current = false; }
  }

  return <ImageEditExtensionsProvider value={{
    onDownload: download,
    mediaOverlay: <>
      <video ref={attachVideo} src={data.videoSrc} playsInline muted={muted} preload="none" onEnded={stop} onError={() => { stop(); setError('视频加载失败，请从图片操作栏替换视频。'); }} {...stylex.props(s.video, playing && s.visible)} />
      <button type="button" data-image-action aria-label="按住播放实况图" title="按住播放实况图" {...stylex.props(s.badge)}
        onKeyDown={event => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); event.stopPropagation(); play(); } }}
        onKeyUp={event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); stop(); } }} onBlur={stop}><Radio size={12} />{playing ? '播放中' : 'LIVE'}</button>
    </>,
    renderToolbarActions: className => <>
      <button type="button" className={className} title="Replace video" aria-label="替换视频" onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }} onClick={() => fileInput.current?.click()}><Film size={14} /></button>
      <button type="button" className={className} title={muted ? 'Unmute live photo' : 'Mute live photo'} aria-label={muted ? '开启实况声音' : '静音'} aria-pressed={!muted} onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
    </>,
  }}>
    <div ref={wrapper} onPointerDownCapture={pointerDown} onPointerMoveCapture={pointerMove} onPointerLeave={stop} onDragStartCapture={stop} onContextMenuCapture={event => { if (hold.current) event.preventDefault(); }}>
      <ImageEditRenderer src={data.src} altText={data.altText} width={data.width} height={data.height} caption={data.caption} thumbhash={data.thumbhash} accent={data.accent} />
      <input ref={fileInput} type="file" hidden aria-label="选择替换视频" accept="video/mp4,.mp4" onChange={event => { void replaceVideo(event.target.files?.[0]); event.target.value = ''; }} />
      {error && <p role="alert" {...stylex.props(s.error)}>{error}</p>}
    </div>
  </ImageEditExtensionsProvider>;
}
const s = stylex.create({
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, pointerEvents: 'none', backgroundColor: '#f5f5f5' },
  visible: { opacity: 1 },
  badge: { position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 6px', borderRadius: 4, borderWidth: 0, color: '#fff', backgroundColor: '#20202099', lineHeight: 1.5, cursor: 'pointer' },
  error: { fontSize: 12, lineHeight: 1.7, color: '#b42318', marginTop: 8 },
});
