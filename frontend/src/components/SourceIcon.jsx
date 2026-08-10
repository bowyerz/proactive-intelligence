import {
  MailOutlined,
  MessageOutlined,
  GithubOutlined,
  AlertOutlined,
  ApiOutlined,
} from '@ant-design/icons'

const MAP = {
  邮件: { Icon: MailOutlined, bg: '#e8f6ed', color: '#18a058' },
  飞书: { Icon: MessageOutlined, bg: '#e8f0fe', color: '#2563eb' },
  GitHub: { Icon: GithubOutlined, bg: '#eeeef1', color: '#24292f' },
  运维: { Icon: AlertOutlined, bg: '#fff2e6', color: '#e07b17' },
  自定义: { Icon: ApiOutlined, bg: '#f3ecfd', color: '#7c3aed' },
}

export default function SourceIcon({ source, size = 40 }) {
  const { Icon, bg, color } = MAP[source] || MAP['自定义']
  return (
    <span
      className="source-icon"
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        fontSize: Math.round(size * 0.46),
      }}
    >
      <Icon />
    </span>
  )
}

export const SOURCE_TAG_COLOR = {
  飞书: 'blue',
  邮件: 'green',
  GitHub: 'default',
  运维: 'orange',
  自定义: 'purple',
}
