import {
  MailOutlined,
  MessageOutlined,
  FileTextOutlined,
  AuditOutlined,
  ApiOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const MAP = {
  email: { Icon: MailOutlined, bg: '#e8f6ed', color: '#18a058' },
  chat: { Icon: MessageOutlined, bg: '#e8f0fe', color: '#2563eb' },
  minutes: { Icon: FileTextOutlined, bg: '#fff7e6', color: '#d48806' },
  approval: { Icon: AuditOutlined, bg: '#fff0f6', color: '#c41d7f' },
  webhook: { Icon: ApiOutlined, bg: '#f3ecfd', color: '#7c3aed' },
  custom: { Icon: SettingOutlined, bg: '#e6fffb', color: '#08979c' },
}

export default function TriggerIcon({ trigger, size = 40 }) {
  const { Icon, bg, color } = MAP[trigger] || MAP.webhook
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

export const TRIGGER_COLOR = MAP
