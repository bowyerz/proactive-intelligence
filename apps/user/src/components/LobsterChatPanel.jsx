import { useState, useRef, useEffect } from 'react'
import { App as AntApp, Input, Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'

/**
 * 底部抽屉：与龙虾对话。
 * 体验：龙虾招呼 → 5 个预设意图 chip → 用户自由输入 → 选中后自动创建任务。
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
        text: '你好！我是龙虾 🦞\n告诉我你想做什么样的定时任务，我会帮你拆解成「事件 + 任务」一键创建。',
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
  //   1) 命中预设 chip → 直接创建任务
  //   2) 命中启发式解析（每天 HH:MM / 每逢周X HH:MM / 等等）→ 创建
  //   3) 否则 → 创建一个以输入文本为标题的默认任务
  const handleUserInput = async (raw) => {
    setMessages((prev) => [...prev, { role: 'user', text: raw }])
    setBusy(true)

    const preset = PRESET_CHIPS.find((c) => c.label === raw)
    if (preset) {
      await createFromPreset(preset)
      setBusy(false); return
    }

    const parsed = parseFreeText(raw)
    if (parsed) {
      await createFromPreset(parsed)
      setBusy(false); return
    }

    // 兜底：以原文做任务名，频率用「未设置」
    setTimeout(async () => {
      try {
        const sub = await api.createTaskFromChat({
          name: raw,
          frequencyText: '未设置',
          eventId: 'meeting-end',
          tasks: [{ name: raw, description: '从龙虾对话创建', actionPreview: '由龙虾解读并执行' }],
        })
        setMessages((prev) => [...prev, { role: 'lobster', text: `已为你创建任务「${sub.name}」。点首页列表即可查看。` }])
        message.success('已创建')
        setTimeout(() => onCreated?.(), 800)
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
        // 让龙虾「回一句」显得聪明
        setMessages((prev) => [...prev, {
          role: 'lobster',
          text: preset.replyText,
        }])
        await api.createTaskFromChat({
          name: preset.taskName,
          frequencyText: preset.frequencyText,
          eventId: preset.eventId,
          tasks: [{
            name: preset.taskName,
            description: preset.taskDesc,
            actionPreview: preset.actionPreview,
          }],
        })
        setMessages((prev) => [...prev, {
          role: 'lobster',
          text: `✅ 任务「${preset.taskName}」已创建，立即启用。`,
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
          placeholder="跟我说说想做的任务，例如：「每天 13:00 总结昨天会议」"
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

// ============== 预设意图 ==============
const PRESET_CHIPS = [
  {
    label: '每天 13:01 归档会议',
    frequencyText: '每天 13:01',
    taskName: '智能会议·午间归档纪要与申请权限',
    taskDesc: '归档昨日 + 今日会议；自动申请会议纪要权限',
    actionPreview: '查询昨天和今天的会议列表；将会议信息自动写入多维表格；自动申请会议纪要权限',
    eventId: 'meeting-end',
    replyText: '好的！每天 13:01 自动归档会议 → 把会议信息入到多维表格。',
  },
  {
    label: '每天 21:00 晚间归档',
    frequencyText: '每天 21:00',
    taskName: '智能会议·晚间归档纪要与申请权限',
    taskDesc: '晚间把当天会议全部归档',
    actionPreview: '汇总当天的会议纪要，自动归档到云文档',
    eventId: 'meeting-end',
    replyText: '好！21:00 把今天的会议全部归档，方便明天早上直接看。',
  },
  {
    label: '每天 14:17 日度回顾',
    frequencyText: '每天 14:17',
    taskName: '智能会议·日度会议数据回顾',
    taskDesc: '拉取当日已开会议，生成回顾短报告',
    actionPreview: '统计当日已开会议的数据；输出关键结论、待办、风险',
    eventId: 'meeting-end',
    replyText: '理解！每天下午 14:17 出一份当日会议回顾短报告。',
  },
  {
    label: '每周日 18:48 周报',
    frequencyText: '每逢周日 18:48',
    taskName: '智能会议·周度报告推送与会议洞察',
    taskDesc: '汇总上周会议 → 生成洞察 → 推送',
    actionPreview: '汇总上周所有会议 → 输出洞察要点 → 推送给我',
    eventId: 'meeting-end',
    replyText: 'OK，每周日 18:48 自动生成上周会议洞察并推送。',
  },
  {
    label: '每周一 09:00 体重周报',
    frequencyText: '每逢周一 09:00',
    taskName: 'weight-loss-weekly-report',
    taskDesc: '汇总本周体重并推送周报',
    actionPreview: '从体重多维表格读取本周数据 → 生成周报 → 推送到我的邮箱',
    eventId: 'meeting-end',
    replyText: '好！每周一早 09:00 自动汇总体重周报。',
  },
]

// 极简启发式解析——识别"每天 HH:MM"、"每周X HH:MM"、"每逢周X HH:MM"等
function parseFreeText(text) {
  const t = text.replace(/\s+/g, '')
  // 每天 HH:MM
  const m1 = t.match(/^每天(\d{1,2}):(\d{2})(.*)$/)
  if (m1) {
    const hh = m1[1].padStart(2, '0'), mm = m1[2]
    const rest = m1[3] || '自动任务'
    return {
      label: text,
      frequencyText: `每天 ${hh}:${mm}`,
      taskName: rest.length > 1 ? rest : `每天 ${hh}:${mm} 定时任务`,
      taskDesc: `由龙虾对话创建 — ${text}`,
      actionPreview: `每天 ${hh}:${mm} 龙虾主动执行`,
      eventId: 'meeting-end',
      replyText: `好的！固定为每天 ${hh}:${mm} 触发。`,
    }
  }
  // 每周X / 周X HH:MM
  const m2 = t.match(/^(每[周逢]?周([一二三四五六日天])(\d{1,2}):(\d{2}))(.*)$/)
  if (m2) {
    const wk = m2[2], hh = m2[3].padStart(2, '0'), mm = m2[4]
    const rest = m2[5] || '周任务'
    return {
      label: text,
      frequencyText: `每逢周${wk} ${hh}:${mm}`,
      taskName: rest.length > 1 ? rest : `周${wk} ${hh}:${mm} 定时任务`,
      taskDesc: `由龙虾对话创建 — ${text}`,
      actionPreview: `每逢周${wk} ${hh}:${mm} 龙虾主动执行`,
      eventId: 'meeting-end',
      replyText: `好的！固定为每逢周${wk} ${hh}:${mm} 触发。`,
    }
  }
  return null
}
