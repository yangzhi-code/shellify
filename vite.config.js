import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'src/main/index.js',
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3']
            }
          }
        }
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/renderer/src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 在所有 scss 文件编译前注入 element 覆盖与项目变量（使用 @use 风格）
        additionalData: `@use "@/styles/element/index.scss" as *;\n@use \"@/styles/variables.scss\" as *;`
      }
    }
  }
}) 