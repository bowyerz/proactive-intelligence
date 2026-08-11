// 构建编排收尾：把入口门户 public/index.html 拷贝到 dist 根目录，
// 使 GitHub Pages 站点根（/proactive-intelligence/）即为角色选择门户。
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'

const portalSrc = 'public/index.html'
const distDir = 'dist'
const portalDst = `${distDir}/index.html`

if (!existsSync(portalSrc)) {
  console.error(`[copy-portal] 找不到入口门户: ${portalSrc}`)
  process.exit(1)
}

mkdirSync(distDir, { recursive: true })
copyFileSync(portalSrc, portalDst)
console.log(`[copy-portal] 已拷贝入口门户 -> ${portalDst}`)
