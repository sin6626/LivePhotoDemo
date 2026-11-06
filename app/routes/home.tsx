import { lazy, Suspense, useEffect, useState } from 'react';

const BlogEditor = lazy(() => import('../editor/blog-editor'));
export function meta() {
  return [{ title: '富文本编辑器 · Live Photo Demo' }];
}
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Suspense fallback={<p style={{ padding: 32 }}>正在加载编辑器…</p>}><BlogEditor /></Suspense> : null;
}
