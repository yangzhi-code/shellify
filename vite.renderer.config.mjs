/**
 * Vite 配置 - 渲染进程 (renderer)
 *
 * 渲染进程即前端界面，基于 Vue3 构建。
 * 配置了 @renderer alias 指向 src/renderer/src，以及 Vue 插件。
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // src/main/index.js 中通过 join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`) 加载，
      // 而 renderer 构建产物会放在 .vite/renderer/main_window/ 目录下
      '@renderer': resolve(__dirname, 'src/renderer/src'),
    },
  },
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html'),
    },
  },
});
