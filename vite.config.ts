import { reactRouter } from '@react-router/dev/vite';
import stylex from '@stylexjs/unplugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [stylex.vite({
    useCSSLayers: true,
    // 编辑器包含按需加载的第三方 CSS，StyleX 必须注入每次都会加载的根样式。
    cssInjectionTarget: fileName => /(^|\/)root-[^/]+\.css$/.test(fileName),
  }), reactRouter()],
  // 编辑器和节点都按需加载，提前预构建，避免首次插入触发整页刷新而丢掉素材。
  optimizeDeps: { include: [
    '@haklex/rich-kit-shiro', '@haklex/rich-editor-ui', '@haklex/rich-plugin-toolbar',
    '@haklex/rich-ext-nested-doc', '@lexical/react/LexicalComposerContext',
    '@lexical/react/useLexicalNodeSelection', '@lexical/utils', 'lexical', 'lucide-react', 'radix-ui',
  ] },
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/artifacts/**'] } },
  preview: { port: 4173, strictPort: true, host: '127.0.0.1' },
});
