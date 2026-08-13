import { useEffect, useState } from 'react'
import {
  App as AntApp, Row, Col, Tabs, Button, Switch, Drawer, Modal, Form, Input, Steps,
  Space, Empty, Tag, Popconfirm, Card, Tooltip,
} from 'antd'
import {
  PlusOutlined, BellOutlined, RocketOutlined,
  DeleteOutlined, ArrowRightOutlined, ThunderboltOutlined,
  CheckCircleTwoTone, CheckOutlined,
} from '@ant-design/icons'
import { api, EVENT_MAP } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

export default function MarketPage() {
  const { message: msgApi } = AntApp.useApp()
  const [subs, setSubs] = useState([])
  const [marketEvents, setMarketEvents] = useState([])

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardInitialEventId, setWizardInitialEventId] = useState(null)

  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadAll = async () => {
    try {
      const [s, m] = await Promise.all([
        api.listSubscriptions(),
        api.listMarketEvents(),
      ])
      setSubs(s.items)
      setMarketEvents(m)
    } catch (e) {
      msgApi.error(e.message || '加载失败')
    }
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!detailId) { setDetail(null); return }
    api.getSubscription(detailId).then(setDetail).catch((e) => msgApi.error(e.message))
  }, [detailId])

  // 启用/停用
  const onToggle = async (sub, checked) => {
    try {
      await api.toggleSubscription(sub.id, checked)
      msgApi.success(checked ? '已启用 — 事件一响，龙虾就开始主动执行' : '已停用')
      loadAll()
      if (detailId === sub.id) {
        setDetailId(null); setTimeout(() => setDetailId(sub.id), 0)
      }
    } catch (e) {
      msgApi.error(e.message || '切换失败')
    }
  }

  // 删除
  const onDelete = async (sub) => {
    try {
      await api.deleteSubscription(sub.id)
      msgApi.success('已删除')
      loadAll()
      if (detailId === sub.id) setDetailId(null)
    } catch (e) {
      msgApi.error(e.message || '删除失败')
    }
  }

  // 修改订阅的任务清单（用户在详情抽屉里增删改任务）
  const onSaveTasks = async (id, tasks) => {
    try {
      await api.updateSubscriptionTasks(id, tasks)
      msgApi.success('任务已保存')
      loadAll()
      if (detailId === id) {
        setDetailId(null); setTimeout(() => setDetailId(id), 0)
      }
    } catch (e) {
      msgApi.error(e.message || '保存失败')
    }
  }

  // 打开订阅向导（可指定初始事件）
  const openWizard = (eventId = null) => {
    setWizardInitialEventId(eventId)
    setWizardOpen(true)
  }
  const onWizardDone = () => {
    setWizardOpen(false)
    loadAll()
  }

  return (
    <div>
      {/* 顶部标题区 */}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">事件订阅任务</h1>
          <p className="page-sub">
            先在「事件市场」选一个事件，再订阅它并在你自己的界面定义要执行的任务 — 事件一响，龙虾就替你执行。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => openWizard()}>
          订阅事件（自建任务）
        </Button>
      </Space>

      {/* 品牌概念条 */}
      <div className="hero-concept">
        <div>
          <div className="hc-title">📡 先选事件，再自建任务</div>
          <div className="hc-tag">事件一响，龙虾就动 — 不再轮询，由它主动执行你定义的任务</div>
        </div>
        <div className="hc-flow">
          <span className="hc-node"><BellOutlined /> 事件</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node"><RocketOutlined /> 自建任务</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node"><CheckCircleTwoTone twoToneColor="#52c41a" /> 主动执行</span>
        </div>
      </div>

      {/* Tabs：我的任务 / 事件市场 */}
      <Tabs
        defaultActiveKey="mine"
        items={[
          {
            key: 'mine',
            label: `我的任务（${subs.length}）`,
            children: (
              <div>
                {subs.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="还没有订阅任务 — 切换到「事件市场」选一个事件，再创建你自己的任务"
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  subs.map((sub) => (
                    <SubscriptionRow
                      key={sub.id}
                      sub={sub}
                      onToggle={(c) => onToggle(sub, c)}
                      onOpen={() => setDetailId(sub.id)}
                    />
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'market',
            label: `事件市场（${marketEvents.length}）`,
            children: (
              <div>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>
                  浏览所有可订阅的事件。每个事件点「订阅」后，<b>任务完全由你自己定义</b>。
                </p>
                <Row gutter={[14, 14]}>
                  {marketEvents.map((ev) => (
                    <Col key={ev.id} xs={24} sm={12} md={8}>
                      <EventMarketCard event={ev} onSubscribe={() => openWizard(ev.id)} />
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* 订阅向导：选事件 → 自建任务 */}
      {wizardOpen && (
        <SubscriptionWizard
          open={wizardOpen}
          initialEventId={wizardInitialEventId}
          marketEvents={marketEvents}
          onCancel={() => setWizardOpen(false)}
          onDone={onWizardDone}
        />
      )}

      {/* 详情抽屉（事件 + 用户自建的任务） */}
      <SubscriptionDetailDrawer
        open={!!detailId}
        sub={detail}
        onClose={() => setDetailId(null)}
        onToggle={(v) => detail && onToggle(detail, v)}
        onDelete={() => detail && onDelete(detail)}
        onSaveTasks={(tasks) => detail && onSaveTasks(detail.id, tasks)}
        onSimulate={() => {
          if (!detail) return
          api.simulateRun(detail.id)
            .then(() => {
              msgApi.success('已主动触发一次')
              api.getSubscription(detail.id).then(setDetail)
              loadAll()
            })
            .catch((e) => msgApi.error(e.message))
        }}
      />
    </div>
  )
}

// ====================================================================
// 子组件：我的任务订阅行
// ====================================================================
function SubscriptionRow({ sub, onToggle, onOpen }) {
  const isPending = sub.status === 'pending_review'
  const isRejected = sub.status === 'rejected'
  const toggleDisabled = isPending || isRejected
  return (
    <div
      className={`rule-row ${sub.enabled && !toggleDisabled ? '' : 'disabled'}`}
      onClick={(e) => {
        if (e.target.closest('.ant-switch, .ant-btn')) return
        onOpen()
      }}
    >
      <TriggerIcon
        event={sub.eventId}
        eventMeta={{ icon: sub.eventIcon, bg: sub.eventBg, color: sub.eventColor }}
        size={42}
      />
      <div className="rr-main">
        <div className="rr-head">
          {sub.name}
          <Tag color="blue" style={{ marginLeft: 6 }}>{sub.taskCount} 个任务</Tag>
        </div>
        <div className="rr-sub">
          {sub.eventName}时触发
          {sub.taskCount > 0 && (
            <span> · {sub.tasks.slice(0, 3).map((t) => t.name).join('、')}{sub.taskCount > 3 ? '…' : ''}</span>
          )}
          {isRejected && sub.rejectReason && (
            <span style={{ color: '#cf1322', marginLeft: 8 }}>
              · 驳回理由：{sub.rejectReason}
            </span>
          )}
        </div>
      </div>
      {!sub.enabled && !isPending && !isRejected && <Tag>已停用</Tag>}
      <span onClick={(e) => e.stopPropagation()}>
        <Switch checked={!!sub.enabled} disabled={toggleDisabled} onChange={onToggle} />
      </span>
      <span className="rr-arrow"><ArrowRightOutlined /></span>
    </div>
  )
}

// ====================================================================
// 子组件：事件市场卡（v5：只展示事件，订阅时让用户自建任务）
// ====================================================================
function EventMarketCard({ event, onSubscribe }) {
  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      bodyStyle={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <TriggerIcon event={event.id} eventMeta={event} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{event.name}</div>
          <div style={{ marginTop: 2 }}>
            <Tag color="default" style={{ marginRight: 0 }}>{event.source}</Tag>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.55 }}>{event.desc}</div>
      {event.checklist && (
        <div style={{ fontSize: 12, color: '#d4380d' }}>📋 {event.checklist}</div>
      )}
      <div style={{
        marginTop: 'auto', paddingTop: 10, borderTop: '1px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          订阅后<strong>自己</strong>定义任务
        </span>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onSubscribe}>
          订阅此事件
        </Button>
      </div>
    </Card>
  )
}

// ====================================================================
// 子组件：2 步创建向导 —— 选事件 → 自建任务
// ====================================================================
function SubscriptionWizard({ open, initialEventId, marketEvents = [], onCancel, onDone }) {
  const { message: msgApi } = AntApp.useApp()
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState(null)
  const [tasks, setTasks] = useState([{ name: '', description: '', actionPreview: '' }])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      // 若已预选事件（从事件市场卡点过来），直接跳到第 2 步
      setStep(initialEventId ? 1 : 0)
      setEventId(initialEventId || null)
      setTasks([{ name: '', description: '', actionPreview: '' }])
    }
  }, [open, initialEventId])

  const canNext = () => {
    if (step === 0) return !!eventId
    if (step === 1) {
      return tasks.some((t) => t.name.trim() && t.actionPreview.trim())
    }
    return false
  }

  const submit = async () => {
    const filled = tasks.filter((t) => t.name.trim() && t.actionPreview.trim())
    if (filled.length === 0) {
      msgApi.error('请至少添加 1 个任务')
      return
    }
    setSubmitting(true)
    try {
      await api.createSubscription({
        eventId,
        tasks: filled,
      })
      msgApi.success('订阅已创建并立即启用')
      onDone()
    } catch (e) {
      msgApi.error(e.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const eventName = (marketEvents.find((e) => e.id === eventId) || EVENT_MAP[eventId])?.name || ''

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnClose
      title="订阅事件（自建任务）"
    >
      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择事件' },
          { title: '自建任务' },
        ]}
      />

      {step === 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>先选一个事件</div>
          <Row gutter={[14, 14]}>
            {marketEvents.map((ev) => (
              <Col key={ev.id} xs={24} sm={12}>
                <div
                  className={`event-tile ${eventId === ev.id ? 'selected' : ''}`}
                  onClick={() => setEventId(ev.id)}
                >
                  <TriggerIcon event={ev.id} eventMeta={ev} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="et-name">{ev.name}</div>
                    <div className="et-desc">{ev.desc}</div>
                    {ev.checklist && <div className="et-check">{ev.checklist}</div>}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {step === 1 && eventId && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            为「{eventName}」创建你的任务
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0, marginBottom: 14 }}>
            至少添加 1 个任务；事件触发时，龙虾会按顺序主动执行所有任务。
          </p>

          <TaskListEditor value={tasks} onChange={setTasks} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
            <Space>
              <Button onClick={() => setStep(0)}>上一步</Button>
              <Button onClick={onCancel}>取消</Button>
            </Space>
            <Button type="primary" loading={submitting} disabled={!canNext()} onClick={submit}>
              完成订阅 · 立即启用
            </Button>
          </div>
        </div>
      )}

      {step === 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28, gap: 12 }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" disabled={!canNext()} onClick={() => setStep(1)}>
            下一步
          </Button>
        </div>
      )}
    </Modal>
  )
}

// 任务清单编辑器（手写 Form.List 风格的实现）
function TaskListEditor({ value, onChange }) {
  const update = (idx, patch) => {
    const next = value.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    onChange(next)
  }
  const add = () => onChange([...value, { name: '', description: '', actionPreview: '' }])
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div>
      {value.map((t, idx) => (
        <Card
          key={idx}
          size="small"
          style={{ marginBottom: 12, background: '#fafafa' }}
          title={`任务 ${idx + 1}`}
          extra={
            value.length > 1 ? (
              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(idx)}>
                移除
              </Button>
            ) : null
          }
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>任务名</div>
            <Input
              value={t.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              placeholder="例如：生成我的开场要点"
              size="large"
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>简介（可选）</div>
            <Input
              value={t.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="一句话说清楚这个任务是干嘛的"
            />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
              🦞 龙虾会主动…
            </div>
            <Input.TextArea
              value={t.actionPreview}
              onChange={(e) => update(idx, { actionPreview: e.target.value })}
              placeholder="事件触发时，让龙虾主动做什么"
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ fontSize: 14 }}
            />
          </div>
        </Card>
      ))}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={add}>
        再加一个任务
      </Button>
    </div>
  )
}

// ====================================================================
// 子组件：详情 / 执行历史抽屉（用户可在此增删改自己的任务）
// ====================================================================
function SubscriptionDetailDrawer({ open, sub, onClose, onToggle, onDelete, onSaveTasks, onSimulate }) {
  const statusBadge = sub && sub.statusMeta ? (
    <Tag color={sub.statusMeta.color}>{sub.statusMeta.label}</Tag>
  ) : null
  const isActive = sub?.status === 'active'
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      destroyOnClose
      title={
        <Space>
          <span style={{ fontWeight: 700 }}>{sub?.name || '订阅详情'}</span>
          {statusBadge}
        </Space>
      }
      extra={
        sub && (
          <Space>
            {isActive && sub.enabled && (
              <Button icon={<ThunderboltOutlined />} onClick={onSimulate}>主动触发一次</Button>
            )}
            <Switch checked={!!sub.enabled} disabled={!isActive} onChange={onToggle} />
          </Space>
        )
      }
      footer={
        sub && (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Popconfirm
              title="确认删除此订阅？"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
            >
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
            <Button onClick={onClose}>关闭</Button>
          </Space>
        )
      }
    >
      {!sub ? (
        <Empty />
      ) : (
        <>
          <div className="detail-hero">
            <TriggerIcon
              event={sub.eventId}
              eventMeta={{ icon: sub.eventIcon, bg: sub.eventBg, color: sub.eventColor }}
              size={56}
            />
            <div className="dh-text">
              <div className="dh-title">{sub.name}</div>
              <div className="dh-meta">
                事件：{sub.eventName}
                {' · '}创建于 {new Date(sub.createdAt).toLocaleString('zh-CN')}
                {sub.updatedAt && sub.updatedAt !== sub.createdAt && ` · 更新于 ${new Date(sub.updatedAt).toLocaleString('zh-CN')}`}
              </div>
              <div className="dh-action" style={{ background: '#f6ffed', borderLeftColor: '#52c41a' }}>
                💡 任务是用户自建的 — 可在下方任意增删改。
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <TaskListEditable
              tasks={sub.tasks || []}
              onSave={(newTasks) => onSaveTasks(newTasks)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 24 }}>
            <div className="section-label" style={{ margin: 0 }}>执行记录</div>
            {sub.runs?.length > 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>共 {sub.runs.length} 次</span>}
          </div>
          <div className="detail-side" style={{ padding: '6px 18px' }}>
            {!sub.runs || sub.runs.length === 0 ? (
              <Empty description={isActive ? '还没有执行记录 — 点右上角「主动触发一次」模拟一次' : '启用订阅后才会产生执行记录'} style={{ padding: '20px 0' }} />
            ) : sub.runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        </>
      )}
    </Drawer>
  )
}

// 任务列表（详情抽屉里用）：可增删改 + 保存
function TaskListEditable({ tasks, onSave }) {
  const [editing, setEditing] = useState(tasks)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setEditing(tasks)
    setDirty(false)
  }, [tasks])

  const update = (idx, patch) => {
    setEditing((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
    setDirty(true)
  }
  const add = () => {
    setEditing((prev) => [...prev, { id: `task_new_${Date.now()}`, name: '', description: '', actionPreview: '' }])
    setDirty(true)
  }
  const remove = (idx) => {
    setEditing((prev) => prev.filter((_, i) => i !== idx))
    setDirty(true)
  }
  const save = () => {
    onSave(editing)
    setDirty(false)
  }

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>
        我的任务（{editing.length}）
        {dirty && <Tag color="orange" style={{ marginLeft: 8 }}>有未保存的修改</Tag>}
      </div>

      {editing.length === 0 ? (
        <Empty description="还没有任务 — 点下方「添加任务」创建" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '12px 0' }} />
      ) : (
        editing.map((t, idx) => (
          <Card
            key={t.id || idx}
            size="small"
            style={{ marginBottom: 12, background: '#fafafa' }}
            title={`任务 ${idx + 1}`}
            extra={
              <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(idx)}>
                删除
              </Button>
            }
          >
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>任务名</div>
              <Input
                value={t.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="任务名"
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>简介</div>
              <Input
                value={t.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="一句话简介（可选）"
              />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>🦞 龙虾会主动…</div>
              <Input.TextArea
                value={t.actionPreview}
                onChange={(e) => update(idx, { actionPreview: e.target.value })}
                placeholder="事件触发时，让龙虾主动做什么"
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </div>
          </Card>
        ))
      )}

      <Space style={{ marginTop: 4 }}>
        <Button icon={<PlusOutlined />} onClick={add}>添加任务</Button>
        {dirty && (
          <Button type="primary" icon={<CheckOutlined />} onClick={save}>
            保存修改
          </Button>
        )}
      </Space>
    </div>
  )
}

function RunRow({ run }) {
  return (
    <div className="run-row">
      <div className="rr-time">{formatTs(run.timestamp)}</div>
      <Tag color="success">成功</Tag>
      <span className="rr-tokens">token 消耗：{run.tokens}K</span>
      <div className="rr-summary">{run.summary}</div>
      <ArrowRightOutlined className="rr-arrow" />
    </div>
  )
}

function formatTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}