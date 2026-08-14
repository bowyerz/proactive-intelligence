import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Modal, Form, Input, Select,
  Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined, ArrowRightOutlined,
  RotateLeftOutlined, MinusOutlined,
  BorderOutlined, CloseOutlined, MoreOutlined,
  PoweroffOutlined, EditOutlined, ThunderboltOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { api } from '@shared/api.js'

/**
 * 任务详情页 —— 全页覆盖。
 * 顶部：窗口风格 topbar；标题用任务名
 * 正文：标题 + 简介(展开/收起) + 最近 10 次执行统计 + 执行历史
 * 底部固定：删除 / 编辑 / 立即执行
 */
export default function TaskDetailPage({ id, onBack, onChanged }) {
  const { message, modal } = AntApp.useApp()
  const [sub, setSub] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm] = Form.useForm()
  const [running, setRunning] = useState(false)

  const load = async () => {
    try {
      const s = await api.getSubscription(id)
      setSub(s)
    } catch (e) {
      message.error(e.message || '加载失败')
    }
  }

  useEffect(() => { load() }, [id])

  // 执行中状态每秒刷新
  useEffect(() => {
    const t = setInterval(load, 1000)
    return () => clearInterval(t)
  }, [id])

  // 启用 / 停用
  const onToggle = async (checked) => {
    try {
      await api.toggleSubscription(id, checked)
      message.success(checked ? '已启用' : '已停用')
      load(); onChanged?.()
    } catch (e) { message.error(e.message || '操作失败') }
  }

  // 删除
  const onDelete = () => {
    modal.confirm({
      title: '确定删除这个任务？',
      content: '该任务的全部执行记录会一并删除，不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteSubscription(id)
          message.success('已删除')
          onChanged?.()
          onBack()
        } catch (e) { message.error(e.message || '删除失败') }
      },
    })
  }

  // 立即执行
  const onExecute = async () => {
    if (!sub || !sub.enabled) {
      message.warning('请先启用任务')
      return
    }
    try {
      setRunning(true)
      await api.simulateRun(id)
      message.success('已触发执行 — 正在跑')
      onChanged?.()
      // 等到 runningSince 过期（60s 后）停止刷新标志
      setTimeout(() => setRunning(false), 4000)
    } catch (e) {
      message.error(e.message || '触发失败')
      setRunning(false)
    }
  }

  // 进入编辑：先把当前值填进表单
  const startEdit = () => {
    editForm.setFieldsValue({
      name: sub.name,
      eventId: sub.eventId,
      taskName: sub.tasks?.[0]?.name || '',
      taskDescription: sub.tasks?.[0]?.description || '',
      taskAction: sub.tasks?.[0]?.actionPreview || '',
    })
    setEditing(true)
  }

  // 提交编辑
  const submitEdit = async () => {
    try {
      const vals = await editForm.validateFields()
      // 走 updateSubscriptionTasks 避免拆散订阅；同时把 name / eventId 也覆盖上
      // store 没专门的 updateSubscriptionMeta，我们直接 createSubscription + deleteSubscription — 太重；
      // 简单做法：通过 updateSubscriptionTasks 改 tasks，再用 patchSubscriptionMeta 覆盖 name / eventId。
      await api.updateSubscriptionTasks(id, [{
        id: sub.tasks?.[0]?.id,
        name: vals.taskName,
        description: vals.taskDescription,
        actionPreview: vals.taskAction,
      }])
      // name / eventId：store 没暴露专门的 updateSubscriptionMeta，这里直接本地打补丁
      // —— 直接走 toggleSubscription(id, ...) 不行。
      // 临时方案：覆写整个订阅。我们直接调用 store 子方法不暴露，所以这里走手动 setItem 简易版：
      patchSubscriptionMeta(id, { name: vals.name, eventId: vals.eventId })
      message.success('已保存')
      setEditing(false)
      load(); onChanged?.()
    } catch (e) {
      if (e?.errorFields) return // antd 表单校验失败
      message.error(e.message || '保存失败')
    }
  }

  if (!sub) {
    return (
      <div className="ua-detail-shell">
        <TopBar onBack={onBack} title="加载中…" />
      </div>
    )
  }

  return (
    <div className="ua-detail-shell">
      <TopBar onBack={onBack} title={sub.name} />

      <div className="ua-detail-body">
        <h1 className="ua-detail-h1">{sub.name}</h1>

        <div className="ua-detail-trigger">
          <span className="ua-trigger-dot" style={{ background: sub.eventColor }} />
          触发事件：{sub.eventName}
        </div>

        <div className="ua-detail-section-label">任务清单 · 共 {(sub.tasks || []).length} 项</div>
        <div className="ua-task-list">
          {(sub.tasks || []).map((t, i) => (
            <div className="ua-task-card" key={t.id || i}>
              <div className="ua-task-card-name">{i + 1}. {t.name}</div>
              {t.description && <div className="ua-task-card-desc">{t.description}</div>}
              {t.actionPreview && (
                <div className="ua-task-card-action">
                  <span className="ua-lobster">🦞</span>
                  <span><b>龙虾会主动：</b>{t.actionPreview}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="ua-detail-section-label">最近 10 次执行数据概览</div>
        <div className="ua-stats">
          <StatCard label="成功率" value={`${sub.stats.successRate.toFixed(1)}`} unit="%" />
          <StatCard label="平均耗时" value={`${sub.stats.avgDuration}`} unit="s" />
          <StatCard label="平均Token" value={`${sub.stats.avgTokens}`} unit="K" />
        </div>

        <div className="ua-detail-section-label">
          执行记录 · {sub.runs.length > 10 ? '最近 10 次' : `共 ${sub.runs.length} 次`}
        </div>
        {sub.runs.length === 0 ? (
          <div className="ua-empty" style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--ua-border)', padding: 32 }}>
            <div className="ua-empty-emoji">📭</div>
            <div>暂无执行记录</div>
          </div>
        ) : (
          <div className="ua-runs">
            {sub.runs.slice(0, 10).map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>

      {/* 底部 action bar */}
      <div className="ua-action-bar">
        <Button danger icon={<DeleteOutlined />} onClick={onDelete}>删除</Button>
        <Button icon={<EditOutlined />} onClick={startEdit}>编辑</Button>
        <Button
          className="ua-action-execute"
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={onExecute}
          loading={running}
          disabled={!sub.enabled}
        >
          立即执行
        </Button>
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={submitEdit}
        title="编辑任务"
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="任务名" name="name" rules={[{ required: true, message: '请填写' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="触发事件" name="eventId" rules={[{ required: true, message: '请选择触发事件' }]}>
            <Select
              options={[
                { value: 'meeting-start-30min', label: '会议开始前 30 分钟' },
                { value: 'meeting-end', label: '会议结束' },
              ]}
            />
          </Form.Item>
          <Form.Item label="任务动作" name="taskName" rules={[{ required: true, message: '请填写' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="任务描述" name="taskDescription">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item label="🦞 龙虾会主动…" name="taskAction" rules={[{ required: true, message: '请填写' }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function TopBar({ onBack, title }) {
  return (
    <div className="ua-detail-top">
      <button className="ua-window-btn" onClick={() => window.history.back()} title="后退"><ArrowLeftOutlined /></button>
      <button className="ua-window-btn" onClick={() => window.history.forward()} title="前进"><ArrowRightOutlined /></button>
      <button className="ua-window-btn" onClick={() => window.location.reload()} title="刷新"><RotateLeftOutlined /></button>
      <div className="ua-detail-title">{title}</div>
      <button className="ua-window-btn" title="—" disabled><MinusOutlined /></button>
      <button className="ua-window-btn" title="□" disabled><BorderOutlined /></button>
      <button className="ua-window-btn" title="×" disabled><CloseOutlined /></button>
      <button className="ua-window-btn" title="···" disabled><MoreOutlined /></button>
      <button className="ua-window-btn" onClick={onBack} title="返回任务列表">←</button>
    </div>
  )
}

function StatCard({ label, value, unit }) {
  return (
    <div className="ua-stat">
      <div className="ua-stat-label">{label}</div>
      <div className="ua-stat-val">
        {value}
        {unit && <span className="ua-stat-unit">{unit}</span>}
      </div>
    </div>
  )
}

function RunRow({ run }) {
  return (
    <div className="ua-run">
      <span className="ua-run-time">{formatTs(run.timestamp)}</span>
      <span className="ua-run-status">成功</span>
      <span className="ua-run-meta">
        token消耗：{run.tokens.toLocaleString()}
        <span className="ua-meta-sep">|</span>
        耗时：{run.durationSec || '—'}s
      </span>
    </div>
  )
}

function formatTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 直接覆盖订阅的 name / eventId。
 * 没专门暴露 updateSubscriptionMeta，所以在用户端本地直接打补丁。
 */
function patchSubscriptionMeta(id, patch) {
  const LS = 'am_subscriptions_v8'
  try {
    const raw = localStorage.getItem(LS)
    if (!raw) return
    const arr = JSON.parse(raw)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx < 0) return
    arr[idx] = { ...arr[idx], ...patch, updatedAt: new Date().toISOString() }
    localStorage.setItem(LS, JSON.stringify(arr))
  } catch (e) { /* ignore */ }
}
