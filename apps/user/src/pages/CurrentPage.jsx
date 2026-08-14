import { useEffect, useState } from 'react'
import { App as AntApp, Switch, Empty, Tag } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'

/**
 * 当前任务 —— 列出「执行中」 + 最近 60s 内刚跑过的订阅
 */
export default function CurrentPage({ refreshTick, onOpenDetail, onChanged }) {
  const { message } = AntApp.useApp()
  const [subs, setSubs] = useState([])

  const load = async () => {
    try {
      const r = await api.listCurrentTasks()
      setSubs(r)
    } catch (e) {
      message.error(e.message || '加载失败')
    }
  }

  useEffect(() => { load() }, [refreshTick])

  // 每秒刷新
  useEffect(() => {
    const t = setInterval(load, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="ua-card-wrap">
      <div className="ua-card">
        {subs.length === 0 ? (
          <div className="ua-empty">
            <div className="ua-empty-emoji">🌙</div>
            <div>当前没有正在执行的任务</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
              试试点任务详情里的「立即执行」按钮
            </div>
          </div>
        ) : (
          subs.map((sub) => (
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
                  <span><span className="ua-meta-key">频率:</span> <span className="ua-meta-val">{sub.frequencyText || '未设置'}</span></span>
                  <span><span className="ua-meta-key">最近触发:</span> <span className="ua-meta-val">{formatTimeAgo(sub.lastRunAt || sub.runningSince)}</span></span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60 * 1000) return '刚刚'
  return `${Math.floor(diff / 60000)} 分钟前`
}
