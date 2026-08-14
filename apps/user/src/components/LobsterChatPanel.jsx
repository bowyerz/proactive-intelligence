import { useState, useRef, useEffect } from 'react'
import { App as AntApp, Input, Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'

/**
 * 底部抽屉：与龙虾对话。
 * 体验：龙虾招呼 → 5 个预设意图 chip → 用户自由输入 → 选中后自动创建「事件任务」。
 * 事件触发模型：任务绑定在 2 个固定事件之一（会议开始前30分钟 / 会议结束），
 * 事件触发时龙虾自动执行，用户端没有「定时 / cron」概念。
 */
export default function LobsterChatPanel({ onClose, onCreated }) {
  const { message } = AntApp.useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const messagesEndRef = useRef(null)

  // 初始化：龙虾招呼
  useEffect(() => {
    setMessages([
      {
        role: 'lobster',
        text: '你好！我是龙虾 🦞\n告诉我你想在哪个「会议事件」发生后让龙虾做什么，我会帮你拆成「事件 + 任务」一键创建。\n例如：会前帮我准备开场要点、会后自动写纪要。',
      },
    ])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text) => {
    if (!text || !text.trim() || busy) return
    handleUserInput(text.trim())
  }

  // 用户输入：先 push 用户 bubble，再走一个伪「思考」，再决定：
  //   1) 命中预设 chip → 直接创建（带事件绑定）
  //   2) 否则 → 按「会前 / 会后」关键词映射到 2 个事件创建
  const handleUserInput = async (raw) => {
    setMessages((prev) => [...prev, { role: 'user', text: raw }])
    setBusy(true)

    const preset = PRESET_CHIPS.find((c) => c.label === raw)
    if (preset) {
      await createFromPreset(preset)
      setBusy(false); return
    }

    const parsed = parseFreeText(raw)
    setTimeout(async () => {
      try {
        await createFromParsed(parsed, raw)
        setBusy(false)
      } catch (e) {
        setMessages((prev) => [...prev, { role: 'lobster', text: `创建失败：${e.message || '未知错误'}` }])
        message.error(e.message || '创建失败')
        setBusy(false)
      }
    }, 600)
  }

  const createFromPreset = async (preset) => {
    setTimeout(async () => {
      try {
        setMessages((prev) => [...prev, { role: 'lobster', text: preset.replyText }])
        await api.createTaskFromChat({
          name: preset.taskName,
          eventId: preset.eventId,
          tasks: [{ name: preset.taskName, description: preset.taskDesc, actionPreview: preset.actionPreview }],
        })
        setMessages((prev) => [...prev, {
          role: 'lobster',
          text: `✅ 事件任务「${preset.taskName}」已创建，立即启用。会议事件触发时龙虾会自动执行。`,
        }])
        message.success('已创建并启用')
        setTimeout(() => onCreated?.(), 1000)
      } catch (e) {
        setMessages((prev) => [...prev, { role: 'lobster', text: `创建失败：${e.message || '未知错误'}` }])
        message.error(e.message || '创建失败')
      } finally {
        setBusy(false)
      }
    }, 700)
  }

  const createFromParsed = async (parsed, raw) => {
    setMessages((prev) => [...prev, { role: 'lobster', text: parsed.replyText }])
    await api.createTaskFromChat({
      name: parsed.taskName,
      eventId: parsed.eventId,
      tasks: [{ name: parsed.taskName, description: parsed.taskDesc, actionPreview: parsed.actionPreview }],
    })
    setMessages((prev) => [...prev, {
      role: 'lobster',
      text: `✅ 事件任务已创建，立即启用。绑定到「${parsed.eventName}」，触发时龙虾会自动执行。`,
    }])
    message.success('已创建并启用')
    setTimeout(() => onCreated?.(), 1000)
  }

  return (
    <div className="ua-chat-panel">
      {/* 消息区 */}
      <div className="ua-chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ua-chat-bubble ${m.role === 'user' ? 'ua-mine' : ''}`}>
            {m.role === 'lobster' && <span className="ua-avatar">🦞</span>}
            <div className="ua-bubble-text">{m.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 预设意图 chip */}
      <div className="ua-chat-suggest">
        {PRESET_CHIPS.map((c) => (
          <span key={c.label} className="ua-chip" onClick={() => send(c.label)}>
            {c.label}
          </span>
        ))}
      </div>

      {/* 输入 */}
      <div className="ua-chat-input">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={() => send(input)}
          placeholder="跟我说说想做的任务，例如：「会前帮我准备开场要点」"
          disabled={busy}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
        />
      </div>
    </div>
  )
}

// ============== 预设意图（事件触发，绑定 2 个固定事件） ==============
const PRESET_CHIPS = [
  {
    label: '会前帮我准备开场要点',
    taskName: '会议前·开场要点',
    taskDesc: '开会前先过一遍要点',
    actionPreview: '基于参会人背景 + 历史议题，整理 3 条要点提醒我',
    eventId: 'meeting-start-30min',
    replyText: '好的！绑定到「会议开始前 30 分钟」事件，会前自动给你整理开场要点。',
  },
  {
    label: '会前预读议程与背景',
    taskName: '会议前·议程预读',
    taskDesc: '会前把议程与背景读一遍',
    actionPreview: '读取本次会议议程 + 参会人历史会议，输出背景速览',
    eventId: 'meeting-start-30min',
    replyText: '收到！会前自动预读议程与参会人背景。',
  },
  {
    label: '会后自动写纪要',
    taskName: '会议后·自动纪要',
    taskDesc: '会后第一时间出纪要',
    actionPreview: '基于会议录音/笔记自动生成议题、结论、待办的结构化纪要',
    eventId: 'meeting-end',
    replyText: '好！「会议结束」后自动帮你整理结构化纪要。',
  },
  {
    label: '会后归档行动项',
    taskName: '会议后·行动项归档',
    taskDesc: '把会议待办归到我名下',
    actionPreview: '提取所有 action item 的 owner + deadline，自动写入我的待办',
    eventId: 'meeting-end',
    replyText: '明白！会后自动提取行动项并归档到你的待办。',
  },
  {
    label: '会后收集周报素材',
    taskName: '会议后·周报素材',
    taskDesc: '为周报自动攒素材',
    actionPreview: '汇总本周所有会议的关键结论，生成周报草稿素材',
    eventId: 'meeting-end',
    replyText: 'OK！每次会议结束帮你攒好周报素材。',
  },
]

// 自由文本：不再解析定时器；统一按「会前 / 会后」关键词映射到 2 个固定事件
function resolveEvent(text) {
  const t = text.replace(/\s+/g, '')
  if (/会前|开场|预读|议程|准备|之前|前30|提前|会前30/.test(t)) return 'meeting-start-30min'
  return 'meeting-end'
}

function parseFreeText(text) {
  const eventId = resolveEvent(text)
  const eventName = eventId === 'meeting-start-30min' ? '会议开始前 30 分钟' : '会议结束'
  const taskName = text.length > 1 ? text : `${eventName}自动任务`
  return {
    label: text,
    taskName,
    taskDesc: `由龙虾对话创建 — ${text}`,
    actionPreview: `事件「${eventName}」触发时，龙虾主动执行`,
    eventId,
    eventName,
    replyText: `好的！已绑定到「${eventName}」事件，触发时龙虾自动执行。`,
  }
}
