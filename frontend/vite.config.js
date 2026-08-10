import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对基址：部署到 GitHub Pages 的 <仓库名>/ 子路径时，资源也能正确加载
  base: './',
  plugins: [react()],
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
