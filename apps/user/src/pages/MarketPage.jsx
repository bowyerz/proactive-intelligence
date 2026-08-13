import { useEffect, useState } from 'react'
import {
  App as AntApp, Row, Col, Card, Tabs, Button, Switch, Drawer, Modal, Form, Input, Steps,
  Space, Empty, Tag, Popconfirm, Radio, Segmented, message, Tooltip,
} from 'antd'
import {
  PlusOutlined, AppstoreAddOutlined, BellOutlined, RocketOutlined,
  DeleteOutlined, ArrowRightOutlined, ThunderboltOutlined,
  CheckCircleTwoTone, EditOutlined,
} from '@ant-design/icons'
import { api, EVENTS, EVENT_MAP, SUB_STATUS_META } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

export default function MarketPage() {
  const { message: msgApi } = AntApp.useApp()
  const [subs, setSubs] = useState([])
  const [presetTasks, setPresetTasks] = useState([])

  const [marketDrawerOpen, setMarketDrawerOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadAll = async () => {
    try {
      const [s, p] = await Promise.all([api.listSubscriptions(), api.listPresetTasks()])
      setSubs(s.items)
      setPresetTasks(p.items)
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

  // 从事件市场添加（单击预置任务）
  const onAddPreset = async (task) => {
    try {
      const r = await api.createSubscription({ taskId: task.id, asDraft: false })
      msgApi.success(`「${r.name}」已加入并启用`)
      setMarketDrawerOpen(false)
      loadAll()
    } catch (e) {
      msgApi.error(e.message || '添加失败')
    }
  }

  // 新建向导完成
  const onWizardDone = () => {
    setWizardOpen(false)
    loadAll()
  }

  // 当前已订阅某预置任务？
  const hasSub = (taskId) => subs.some((s) => s.taskId === taskId)

  // 按事件分组的预置任务
  const tasksByEvent = EVENTS.map((ev) => ({
    event: ev,
    tasks: presetTasks.filter((t) => t.eventId === ev.id),
  }))

  return (
    <div>
      {/* 顶部标题区 */}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">事件订阅任务</h1>
          <p className="page-sub">
            选一个事件（例如「会议结束」），再订阅一个任务（例如「整理纪要」） — 事件一响，龙虾就替你执行。
          </p>
        </div>
        <Space>
          <Button icon={<AppstoreAddOutlined />} size="large" onClick={() => setMarketDrawerOpen(true)}>
            从事件市场添加
          </Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setWizardOpen(true)}>
            新建事件订阅任务
          </Button>
        </Space>
      </Space>

      {/* 品牌概念条 */}
      <div className="hero-concept">
        <div>
          <div className="hc-title">📡 先选事件，再订阅任务</div>
          <div className="hc-tag">事件一响，龙虾就动 — 不再轮询，由它主动执行</div>
        </div>
        <div className="hc-flow">
          <span className="hc-node"><BellOutlined /> 事件</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node"><RocketOutlined /> 任务订阅</span>
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
                    description="还没有订阅任务 — 点右上角「从事件市场添加」一键开始，或「新建」自己拼一个"
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
            label: `事件市场（${presetTasks.length}）`,
            children: (
              <div>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>
                  按事件浏览预置任务 — 一键订阅即可启用，也可以基于某个事件自建一个任务。
                </p>
                {tasksByEvent.map(({ event, tasks }) => (
                  <EventGroup
                    key={event.id}
                    event={event}
                    tasks={tasks}
                    hasSub={hasSub}
                    onAdd={onAddPreset}
                    onCustomize={(ev) => { setWizardOpen(true); /* wizard 自己有 event 选择 */ }}
                  />
                ))}
              </div>
            ),
          },
        ]}
      />

      {/* 事件市场抽屉（从事件市场添加）*/}
      <Drawer
        title="事件市场"
        open={marketDrawerOpen}
        onClose={() => setMarketDrawerOpen(false)}
        width={780}
        destroyOnClose
      >
        <p style={{ color: 'var(--muted)' }}>
          按事件浏览，点击任务即可一键订阅启用。已订阅的任务会显示「已添加」。
        </p>
        {tasksByEvent.map(({ event, tasks }) => (
          <EventGroup
            key={event.id}
            event={event}
            tasks={tasks}
            hasSub={hasSub}
            onAdd={onAddPreset}
            compact
          />
        ))}
      </Drawer>

      {/* 新建向导 */}
      {wizardOpen && (
        <SubscriptionWizard
          open={wizardOpen}
          onCancel={() => setWizardOpen(false)}
          onDone={onWizardDone}
        />
      )}

      {/* 详情抽屉（执行历史）*/}
      <SubscriptionDetailDrawer
        open={!!detailId}
        sub={detail}
        onClose={() => setDetailId(null)}
        onToggle={(v) => detail && onToggle(detail, v)}
        onDelete={() => detail && onDelete(detail)}
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
// 子组件：订阅行（我的任务列表）
// ====================================================================
function SubscriptionRow({ sub, onToggle, onOpen }) {
  const isPending = sub.status === 'pending_review'
  const isRejected = sub.status === 'rejected'
  const toggleDisabled = isPending || isRejected
  const isCustom = sub.isCustom
  return (
    <div
      className={`rule-row ${sub.enabled && !toggleDisabled ? '' : 'disabled'}`}
      onClick={(e) => {
        if (e.target.closest('.ant-switch, .ant-btn')) return
        onOpen()
      }}
    >
      <TriggerIcon event={sub.eventId} size={42} />
      <div className="rr-main">
        <div className="rr-head">
          {sub.name}
          {isCustom && <Tag color="purple" style={{ marginLeft: 4 }}>自建</Tag>}
        </div>
        <div className="rr-sub">
          {sub.eventName}时触发 · {sub.action}
          {isRejected && sub.rejectReason && (
            <span style={{ color: '#cf1322', marginLeft: 8 }}>
              · 驳回理由：{sub.rejectReason}
            </span>
          )}
        </div>
      </div>
      {isPending && <Tag color="processing">待审核</Tag>}
      {isRejected && <Tag color="error">已驳回</Tag>}
      {!isPending && !isRejected && !sub.enabled && <Tag>草稿</Tag>}
      <span onClick={(e) => e.stopPropagation()}>
        <Switch checked={!!sub.enabled} disabled={toggleDisabled} onChange={onToggle} />
      </span>
      <span className="rr-arrow"><ArrowRightOutlined /></span>
    </div>
  )
}

// ====================================================================
// 子组件：事件分组（事件市场）
// ====================================================================
function EventGroup({ event, tasks, hasSub, onAdd, onCustomize, compact }) {
  return (
    <div className="event-section" style={compact ? { marginBottom: 18 } : {}}>
      <div className="event-section-head">
        <TriggerIcon event={event.id} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="event-section-title">{event.name}</div>
          <div className="event-section-sub">
            <Tag color="default" style={{ marginRight: 6 }}>{event.source}</Tag>
            {event.desc}
          </div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          {tasks.length} 个预置任务
        </div>
      </div>
      <Row gutter={[12, 12]}>
        {tasks.map((t) => (
          <Col key={t.id} xs={24} sm={12} md={compact ? 24 : 8}>
            <PresetTaskCard task={t} installed={hasSub(t.id)} onAdd={() => onAdd(t)} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

// ====================================================================
// 子组件：预置任务卡
// ====================================================================
function PresetTaskCard({ task, installed, onAdd }) {
  return (
    <div className="task-card">
      <div className="tc-name">{task.name}</div>
      <div className="tc-desc">{task.description}</div>
      <div className="tc-action">
        <b>🦞 龙虾会主动：</b>{task.actionPreview}
      </div>
      <div className="tc-foot">
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>by {task.proposer}{task.installs > 0 ? ` · ${task.installs} 人订阅` : ''}</span>
        {installed ? (
          <Tag color="success">已添加</Tag>
        ) : (
          <Button size="small" type="primary" onClick={onAdd}>一键订阅</Button>
        )}
      </div>
    </div>
  )
}

// ====================================================================
// 子组件：2 步创建向导 —— 选事件 → 选预置/自定义
// ====================================================================
function SubscriptionWizard({ open, onCancel, onDone }) {
  const { message: msgApi } = AntApp.useApp()
  const [step, setStep] = useState(0)
  const [eventId, setEventId] = useState(null)
  const [mode, setMode] = useState('preset') // 'preset' | 'custom'
  const [presetTaskId, setPresetTaskId] = useState(null)
  const [customName, setCustomName] = useState('')
  const [customAction, setCustomAction] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(0); setEventId(null); setMode('preset'); setPresetTaskId(null)
      setCustomName(''); setCustomAction('')
    }
  }, [open])

  const tasksForEvent = eventId ? [] /* 拉取 */ : []

  const canNext = () => {
    if (step === 0) return !!eventId
    if (step === 1) {
      if (mode === 'preset') return !!presetTaskId
      return customName.trim().length >= 2 && customAction.trim().length >= 4
    }
    return false
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      if (mode === 'preset') {
        await api.createSubscription({ taskId: presetTaskId, asDraft: false })
        msgApi.success('已订阅并启用')
      } else {
        await api.createSubscription({
          eventId,
          customName: customName.trim(),
          customAction: customAction.trim(),
        })
        msgApi.success('已提交，等待管理员审核')
      }
      onDone()
    } catch (e) {
      msgApi.error(e.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={680}
      destroyOnClose
      title="新建事件订阅任务"
    >
      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择事件' },
          { title: '选择任务' },
        ]}
      />

      {step === 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>先选一个事件</div>
          <Row gutter={[14, 14]}>
            {EVENTS.map((ev) => (
              <Col key={ev.id} xs={24} sm={12}>
                <div
                  className={`event-tile ${eventId === ev.id ? 'selected' : ''}`}
                  onClick={() => setEventId(ev.id)}
                >
                  <TriggerIcon event={ev.id} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="et-name">{ev.name}</div>
                    <div className="et-desc">{ev.desc}</div>
                    <div className="et-check">{ev.checklist}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {step === 1 && eventId && (
        <div>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { label: '从预置任务选', value: 'preset' },
              { label: '自己写一个', value: 'custom' },
            ]}
            block
            style={{ marginBottom: 18 }}
          />

          {mode === 'preset' && (
            <PresetPicker eventId={eventId} value={presetTaskId} onChange={setPresetTaskId} />
          )}

          {mode === 'custom' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>
                给「{EVENT_MAP[eventId]?.name}」写一个自定义任务
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>任务名称</div>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="如：把纪要同步给直属 leader"
                  size="large"
                />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                  让龙虾主动做什么
                </div>
                <Input.TextArea
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="例：会后把会议纪要整理成不超过 8 行的要点，发私聊给直属 leader"
                  autoSize={{ minRows: 5, maxRows: 8 }}
                  style={{ fontSize: 14 }}
                />
                <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 12.5 }}>
                  自建任务需要管理员审核 — 通过后即可启用。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
        <Space>
          {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>上一步</Button>}
          {step === 0 && <Button onClick={onCancel}>取消</Button>}
        </Space>
        <Space>
          {step < 1 && (
            <Button type="primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              下一步
            </Button>
          )}
          {step === 1 && (
            <Button type="primary" loading={submitting} disabled={!canNext()} onClick={submit}>
              {mode === 'preset' ? '一键订阅' : '提交审核'}
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  )
}

// 预置任务选择器（拉取当前事件下所有已上架任务）
function PresetPicker({ eventId, value, onChange }) {
  const [tasks, setTasks] = useState([])
  useEffect(() => {
    api.listPresetTasks({ eventId }).then((r) => setTasks(r.items)).catch(() => {})
  }, [eventId])
  if (tasks.length === 0) {
    return <Empty description="该事件还没有预置任务，可选「自己写一个」" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
  }
  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {tasks.map((t) => (
          <Radio key={t.id} value={t.id} style={{ width: '100%' }}>
            <div style={{ marginLeft: 4 }}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t.actionPreview}</div>
            </div>
          </Radio>
        ))}
      </Space>
    </Radio.Group>
  )
}

// ====================================================================
// 子组件：详情 / 执行历史抽屉
// ====================================================================
function SubscriptionDetailDrawer({ open, sub, onClose, onToggle, onDelete, onSimulate }) {
  const statusBadge = sub && sub.statusMeta ? (
    <Tag color={sub.statusMeta.color}>{sub.statusMeta.label}</Tag>
  ) : null
  const isActive = sub?.status === 'active'
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
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
            <TriggerIcon event={sub.eventId} size={56} />
            <div className="dh-text">
              <div className="dh-title">{sub.name}</div>
              <div className="dh-meta">
                事件：{sub.eventName}
                {sub.isCustom && ' · 自建'}
                {' · '}创建于 {new Date(sub.createdAt).toLocaleString('zh-CN')}
                {' · '}by {sub.proposer}
              </div>
              {sub.status === 'rejected' && sub.rejectReason && (
                <div className="dh-action" style={{ background: '#fff1f0', borderLeftColor: '#cf1322' }}>
                  <b style={{ color: '#cf1322' }}>驳回理由：</b> {sub.rejectReason}
                </div>
              )}
              <div className="dh-action">
                <b>🦞 龙虾会主动：</b> {sub.action}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label" style={{ margin: 0 }}>执行记录</div>
            {sub.runs?.length > 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>共 {sub.runs.length} 次</span>}
          </div>
          <div className="detail-side" style={{ padding: '6px 18px' }}>
            {!sub.runs || sub.runs.length === 0 ? (
              <Empty description={isActive ? '还没有执行记录 — 点右上角「主动触发一次」模拟一次' : '审核通过启用后才会有执行记录'} style={{ padding: '20px 0' }} />
            ) : sub.runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        </>
      )}
    </Drawer>
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
