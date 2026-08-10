import { useMemo, useState } from 'react'
import { Button, Tooltip, message } from 'antd'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons'

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 简易 JSON 语法高亮，无第三方依赖。 */
export function highlightJson(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return escapeHtml(text).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'j-num'
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'j-key' : 'j-str'
      else if (/true|false/.test(match)) cls = 'j-bool'
      else if (/null/.test(match)) cls = 'j-null'
      return `<span class="${cls}">${match}</span>`
    },
  )
}

export default function JsonBlock({ value, maxHeight = 420, copyable = true }) {
  const [copied, setCopied] = useState(false)
  const html = useMemo(() => highlightJson(value), [value])
  const raw = useMemo(
    () => (typeof value === 'string' ? value : JSON.stringify(value, null, 2)),
    [value],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw)
      setCopied(true)
      message.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      message.warning('当前环境不支持剪贴板，请手动复制')
    }
  }

  return (
    <div className="json-block">
      {copyable && (
        <Tooltip title="复制 JSON">
          <Button
            className="json-copy"
            size="small"
            type="text"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={copy}
          />
        </Tooltip>
      )}
      <pre style={{ maxHeight }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
