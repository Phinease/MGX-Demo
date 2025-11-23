import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { viteSourceLocator } from '@metagptx/vite-plugin-source-locator';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    viteSourceLocator({
      prefix: 'mgx',
    }),
    react(),
  ],
  server: {
    host: '0.0.0.0', // 监听所有网络接口（Docker 容器需要）
    port: 5173,
    watch: { usePolling: true, interval: 800 /* 300~1500 */ },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Polyfill Node.js modules for browser
      'node:async_hooks': path.resolve(__dirname, './src/lib/polyfills/async_hooks.ts'),
    },
  },
  optimizeDeps: {
    include: ['langchain', '@langchain/core', '@langchain/openai'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
}));
