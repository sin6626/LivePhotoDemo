import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

function createSession() {
  const files = new Map<string, Blob>();
  let usedBytes = 0;
  function reserve(bytes: number) {
    // ponytail: 会话内保留资源以支持撤销；超过 256 MB 时提示刷新，持久化接入后改用资源 ID。
    if (usedBytes + bytes > 256 * 1024 * 1024) throw new Error('This session has reached its 256 MB media limit. Download your live photos, then reload to start a new session.');
    usedBytes += bytes;
  }
  return {
    files,
    addFile(blob: Blob) {
      reserve(blob.size);
      const url = URL.createObjectURL(blob);
      files.set(url, blob);
      return url;
    },
    dispose() { files.forEach((_, url) => URL.revokeObjectURL(url)); files.clear(); usedBytes = 0; },
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
  if (!session) throw new Error('The media session is unavailable.');
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
