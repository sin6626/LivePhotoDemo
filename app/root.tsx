import { useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import './reset.css';

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.DEV) void import('virtual:stylex:runtime');
  }, []);
  return <html lang="zh-CN"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="data:," /><Meta /><Links />{import.meta.env.DEV && <link rel="stylesheet" href="/virtual:stylex.css" />}</head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}
export default function App() { return <Outlet />; }
