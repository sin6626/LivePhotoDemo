import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type LivePhotoAsset = { imageUrl: string; videoUrl: string; downloadUrl: string; size: number };
function createSession() {
  const assets = new Map<string, LivePhotoAsset>();
  const urls = new Set<string>();
  let usedBytes = 0;
  function retain(blob: Blob) { const url = URL.createObjectURL(blob); urls.add(url); return url; }
  function reserve(bytes: number) {
    // ponytail: 会话内保留资源以支持撤销；超过 256 MB 时提示刷新，持久化接入后改用资源 ID。
    if (usedBytes + bytes > 256 * 1024 * 1024) throw new Error('当前会话素材已接近 256 MB，请下载需要的实况图后刷新页面再试。');
    usedBytes += bytes;
  }
  return {
    assets,
    addLivePhoto({ image, video, blob }: { image: Blob; video: Blob; blob: Blob }) {
      reserve(blob.size);
      const id = crypto.randomUUID();
      assets.set(id, { imageUrl: retain(image), videoUrl: retain(video), downloadUrl: retain(blob), size: blob.size });
      return id;
    },
    addImage(blob: Blob) { reserve(blob.size); return retain(blob); },
    dispose() { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); assets.clear(); usedBytes = 0; },
  };
}
const SessionContext = createContext<ReturnType<typeof createSession> | null>(null);
export function MediaSessionProvider({ children }: { children: ReactNode }) {
  const session = useMemo(createSession, []);
  useEffect(() => () => session.dispose(), [session]);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
export function useMediaSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('缺少实况图素材会话。');
  return session;
}
export function useBlobUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const url = URL.createObjectURL(blob); setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return url;
}
