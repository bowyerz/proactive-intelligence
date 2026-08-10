/**
 * 轻量 Markdown 渲染器。
 * 只支持 Demo 需要的语法：标题、无序/有序列表、引用、粗体、行内代码、代码块、分隔线。
 * 不引第三方依赖，避免离线环境构建失败。
 */
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inline = (s) =>
  escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

export function markdownToHtml(src = '') {
  const lines = String(src).replace(/\r\n/g, '\n').split('\n')
  const out = []
  let list = null // 'ul' | 'ol'
  let inCode = false
  let quote = []

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }
  const closeQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${quote.map(inline).join('<br/>')}</blockquote>`)
      quote = []
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (/^```/.test(line)) {
      closeList()
      closeQuote()
      out.push(inCode ? '</code></pre>' : '<pre class="md-pre"><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(escapeHtml(raw) + '\n')
      continue
    }
    if (!line.trim()) {
      closeList()
      closeQuote()
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      closeList()
      closeQuote()
      out.push('<hr/>')
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      closeQuote()
      const lvl = Math.min(h[1].length + 1, 6)
      out.push(`<h${lvl} class="md-h">${inline(h[2])}</h${lvl}>`)
      continue
    }
    if (/^>\s?/.test(line)) {
      closeList()
      quote.push(line.replace(/^>\s?/, ''))
      continue
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      closeQuote()
      if (list !== 'ul') {
        closeList()
        out.push('<ul class="md-ul">')
        list = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      continue
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ol) {
      closeQuote()
      if (list !== 'ol') {
        closeList()
        out.push('<ol class="md-ul">')
        list = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      continue
    }
    closeList()
    closeQuote()
    out.push(`<p class="md-p">${inline(line)}</p>`)
  }
  closeList()
  closeQuote()
  if (inCode) out.push('</code></pre>')
  return out.join('')
}

export default function Markdown({ children, className = '' }) {
  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(children || '') }}
    />
  )
}
