import { lazy, Suspense, useEffect, useState } from 'react';

const BlogEditor = lazy(() => import('../editor/blog-editor'));
export function meta() {
  return [{ title: 'Rich text editor · Live Photo Demo' }];
}
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Suspense fallback={<p style={{ padding: 32 }}>Loading editor…</p>}><BlogEditor /></Suspense> : null;
}
