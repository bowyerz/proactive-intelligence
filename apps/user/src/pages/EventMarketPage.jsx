import { useEffect, useState } from 'react'
import { App as AntApp, Tag } from 'antd'
import { ArrowRightOutlined, ClockCircleOutlined, FlagOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'

const ICONS = { ClockCircleOutlined, FlagOutlined }
function EventGlyph({ icon }) {
  const C = ICONS[icon] || ClockCircleOutlined
  return <C />
}

/**
 * 事件市场 —— 以「事件」为核心展示。
 * 列出 2 个固定事件（会议开始前 30 分钟 / 会议结束），
 * 每个事件下挂载用户已订阅、绑定到该事件的任务。点击任务进入详情。
 */
export default function EventMarketPage({ refreshTick, onOpenDetail, onChanged }) {
  const { message } = AntApp.useApp()
  const [events, setEvents] = useState([])
  const [subs, setSubs] = useState([])

  const load = async () => {
    try {
      const evs = await api.listEvents()
      const r = await api.listSubscriptions()
      setEvents(evs)
      setSubs(r.items)
    } catch (e) {
      message.error(e.message || '加载失败')
    }
  }

  useEffect(() => { load() }, [refreshTick])

  // 每秒刷新一次（让「执行中」角标自动出现 / 消失）
  useEffect(() => {
    const t = setInterval(load, 1000)
    return () => clearInterval(t)
  }, [])

  const subsByEvent = (eventId) => subs.filter((s) => s.eventId === eventId)

  return (
    <div className="ua-card-wrap">
      {events.map((ev) => {
        const bound = subsByEvent(ev.id)
        return (
          <div className="ua-market-event" key={ev.id}>
            <div className="ua-market-event-head" style={{ background: ev.bg }}>
              <div className="ua-market-event-icon" style={{ color: ev.color }}>
                <EventGlyph icon={ev.icon} />
              </div>
              <div className="ua-market-event-info">
                <div className="ua-market-event-name">
                  {ev.name}
                  <Tag className="ua-market-src" style={{ color: ev.color, borderColor: ev.color }}>{ev.source}</Tag>
                </div>
                <div className="ua-market-event-desc">{ev.desc}</div>
                <div className="ua-market-chips">
                  {ev.checklist.split('·').map((c) => c.trim()).filter(Boolean).map((c, i) => (
                    <span className="ua-market-chip" key={i}>{c}</span>
                  ))}
                </div>
              </div>
              <div className="ua-market-count">{bound.length} 个任务</div>
            </div>

            {bound.length === 0 ? (
              <div className="ua-market-empty">还没有订阅该事件的任务 — 点下方「与龙虾对话」创建</div>
            ) : (
              bound.map((sub) => (
                <div
                  key={sub.id}
                  className={`ua-task ${sub.isRunning ? 'is-running' : ''}`}
                  onClick={() => onOpenDetail(sub.id)}
                >
                  <div className="ua-task-main">
                    <div className="ua-task-title">
                      {sub.name}
                      {sub.isRunning && (
                        <span className="ua-running-badge">
                          <span className="ua-running-dot" />
                          执行中
                        </span>
                      )}
                      <ArrowRightOutlined className="ua-task-arrow" />
                    </div>
                    <div className="ua-task-meta">
                      <span><span className="ua-meta-key">任务数:</span> <span className="ua-meta-val">{sub.taskCount}</span></span>
                      <span><span className="ua-meta-key">上次执行:</span> <span className="ua-meta-val">{formatTimestamp(sub.lastRunAt)}</span></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatTimestamp(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
