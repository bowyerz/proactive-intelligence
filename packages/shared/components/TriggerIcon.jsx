import {
  ClockCircleOutlined,
  FlagOutlined,
  ThunderboltOutlined,
  BellOutlined,
  NotificationOutlined,
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons'

// v4 模型：管理后台可创建新事件，TriggerIcon 需要同时支持：
//   1) 系统事件（固定 2 个，id → 内置样式）
//   2) 开发者提案的事件（动态，按事件对象自带的 icon 名 + bg/color 渲染）
const FIXED_EVENT_STYLE = {
  'meeting-start-30min': { Icon: ClockCircleOutlined, bg: '#fff7e6', color: '#d48806' },
  'meeting-end': { Icon: FlagOutlined, bg: '#e6fffb', color: '#08979c' },
}

// 开发者提案事件里可能用到的图标名 → 组件（未匹配则回退到 ThunderboltOutlined）
const ICON_REGISTRY = {
  ClockCircleOutlined,
  FlagOutlined,
  ThunderboltOutlined,
  BellOutlined,
  NotificationOutlined,
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  FileTextOutlined,
  TeamOutlined,
}

const DEFAULT_STYLE = { Icon: ThunderboltOutlined, bg: '#f0f5ff', color: '#2f54eb' }

function resolveStyle(eventId, eventMeta) {
  if (eventMeta && (eventMeta.icon || eventMeta.bg || eventMeta.color)) {
    const Icon = ICON_REGISTRY[eventMeta.icon] || DEFAULT_STYLE.Icon
    return {
      Icon,
      bg: eventMeta.bg || DEFAULT_STYLE.bg,
      color: eventMeta.color || DEFAULT_STYLE.color,
    }
  }
  return FIXED_EVENT_STYLE[eventId] || DEFAULT_STYLE
}

export default function TriggerIcon({ trigger, event, eventMeta, size = 40 }) {
  const key = event || trigger
  const { Icon, bg, color } = resolveStyle(key, eventMeta)
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

export const EVENT_ICON = FIXED_EVENT_STYLE

// 兼容旧字段名（其它文件可能仍用 `trigger` 字段做 key）
export const TRIGGER_COLOR = FIXED_EVENT_STYLE