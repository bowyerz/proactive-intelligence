import {
  ClockCircleOutlined,
  FlagOutlined,
} from '@ant-design/icons'

// v3 模型下，触发器改成「事件」（更精简：2 个固定事件）
const EVENT_ICON_MAP = {
  'meeting-start-30min': { Icon: ClockCircleOutlined, bg: '#fff7e6', color: '#d48806' },
  'meeting-end': { Icon: FlagOutlined, bg: '#e6fffb', color: '#08979c' },
}

export default function TriggerIcon({ trigger, event, size = 40 }) {
  const key = event || trigger
  const { Icon, bg, color } = EVENT_ICON_MAP[key] || EVENT_ICON_MAP['meeting-start-30min']
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

export const EVENT_ICON = EVENT_ICON_MAP

// 兼容旧字段名（其它文件可能仍用 `trigger` 字段做 key）
export const TRIGGER_COLOR = EVENT_ICON_MAP
