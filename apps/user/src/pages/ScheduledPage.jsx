import { useEffect, useState } from 'react'
import { App as AntApp, Switch, Empty, Modal, Form, Input } from 'antd'
import { ArrowRightOutlined, LoadingOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'

/**
 * 定时任务列表 —— 默认页签。
 * 列：标题 / 执行周期 / 上次执行 / 启用开关
 */
export default function ScheduledPage({ refreshTick, onOpenDetail, onChanged }) {
  const { message, modal } = AntApp.useApp()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const r = await api.listSubscriptions()
      setSubs(r.items)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshTick])

  // 每秒刷新一次（用于「执行中」角标自动出现 / 消失）
  useEffect(() => {
    const t = setInterval(load, 1000)
    return () => clearInterval(t)
  }, [])

  // 启用 / 停用
  const onToggle = async (sub, checked) => {
    try {
      await api.toggleSubscription(sub.id, checked)
      message.success(checked ? '已启用' : '已停用')
      load(); onChanged?.()
    } catch (e) {
      message.error(e.message || '操作失败')
    }
  }

  const goDetail = (sub) => {
    if (!sub.enabled) {
      message.info('请先启用这个任务，再进入详情')
      return
    }
    onOpenDetail(sub.id)
  }

  return (
    <div className="ua-card-wrap">
      <div className="ua-card">
        {subs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有任何任务 — 点下方「与龙虾对话」试试"
            style={{ padding: '40px 0' }}
          />
        ) : (
          subs.map((sub) => (
            <TaskRow
              key={sub.id}
              sub={sub}
              onClick={() => goDetail(sub)}
              onToggle={(c) => onToggle(sub, c)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * 单个任务行（定时任务列表里渲染）
 */
function TaskRow({ sub, onClick, onToggle }) {
  const lastRunText = sub.lastRunAt
    ? formatTimestamp(sub.lastRunAt)
    : '暂无记录'
  return (
    <div
      className={`ua-task ${sub.isRunning ? 'is-running' : ''}`}
      onClick={(e) => {
        if (e.target.closest('.ant-switch')) return
        onClick()
      }}
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
          <span><span className="ua-meta-key">执行周期:</span> <span className="ua-meta-val">{sub.frequencyText || '未设置'}</span></span>
          <span><span className="ua-meta-key">上次执行:</span> <span className="ua-meta-val">{lastRunText}</span></span>
        </div>
      </div>
      <span className="ua-task-toggle" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={!!sub.enabled}
          onChange={onToggle}
        />
      </span>
    </div>
  )
}

function formatTimestamp(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
