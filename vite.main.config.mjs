/**
 * Vite 配置 - 主进程 (main)
 *
 * 主进程运行在 Node.js 环境中，需要将原生模块和 .node 文件 external 化，
 * 避免 Vite 尝试将它们打包，否则会报错（如 sshcrypto.node 无法被 JS 解析）。
 *
 * ssh2、better-sqlite3 等包含原生 C++ 扩展的模块必须在运行时从 node_modules 加载，
 * 不能被 rollup 打包。
 */
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['ssh2', 'better-sqlite3', /\.node$/],
    },
  },
});
