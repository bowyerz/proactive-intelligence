import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 相对基址：部署到 GitHub Pages 的 <仓库名>/ 子路径时，资源也能正确加载
  base: './',
  plugins: [react()],
  resolve: {
    // 共享内核：store / api / theme / brand / TriggerIcon —— 供将来 user / developer / admin 三子应用复用
    alias: {
      '@shared': fileURLToPath(new URL('../packages/shared', import.meta.url)),
    },
    // Rollup 默认不会向父目录外的 node_modules 找包；显式 dedupe 让共享层能复用 frontend/node_modules
    dedupe: ['react', 'react-dom', 'react-router-dom', 'antd', '@ant-design/icons'],
  },
  optimizeDeps: {
    // 让 Vite 把共享层的文件纳入预打包，依赖解析会从 frontend 目录开始找 node_modules
    include: [
      '@shared/api.js',
      '@shared/store.js',
      '@shared/brand.js',
      '@shared/theme.css',
      '@shared/components/TriggerIcon.jsx',
    ],
    entries: ['src/main.jsx'],
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/healthz': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: false },
})
