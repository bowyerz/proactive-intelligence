import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 相对基址：部署到 GitHub Pages 的 <仓库名>/manage/ 子路径时，资源也能正确加载
  base: './',
  plugins: [react()],
  resolve: {
    // 共享内核：store / api / theme / brand / TriggerIcon
    alias: {
      '@shared': fileURLToPath(new URL('../../packages/shared', import.meta.url)),
    },
    // Rollup 默认不会向父目录外的 node_modules 找包；显式 dedupe 让共享层能复用 root node_modules
    dedupe: ['react', 'react-dom', 'react-router-dom', 'antd', '@ant-design/icons'],
  },
  optimizeDeps: {
    include: [
      '@shared/api.js',
      '@shared/store.js',
      '@shared/brand.js',
      '@shared/theme.css',
      '@shared/components/TriggerIcon.jsx',
    ],
    entries: ['src/main.jsx'],
  },
  build: { outDir: '../../dist/manage', emptyOutDir: true },
})
