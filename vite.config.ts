import { reactRouter } from '@react-router/dev/vite';
import stylex from '@stylexjs/unplugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [stylex.vite({ useCSSLayers: true }), reactRouter()],
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/artifacts/**'] } },
});
