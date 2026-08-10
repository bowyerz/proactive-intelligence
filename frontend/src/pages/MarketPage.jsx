import { useEffect, useMemo, useState } from 'react'
import {
  App as AntApp, Row, Col, Card, Statistic, Tabs, Button, Switch, Drawer, Modal, Form, Input, Steps,
  Space, Empty, Tag, Popconfirm, message,
} from 'antd'
import {
  PlusOutlined, AppstoreAddOutlined, BellOutlined, RocketOutlined,
  EditOutlined, DeleteOutlined, ArrowRightOutlined, ThunderboltOutlined, ReloadOutlined,
  CheckCircleTwoTone,
} from '@ant-design/icons'
import { api, TRIGGER_MAP } from '../api.js'
import TriggerIcon from '../components/TriggerIcon.jsx'

export default function MarketPage() {
  const { message: msgApi } = AntApp.useApp()
  const [stats, setStats] = useState(null)
  const [rules, setRules] = useState([])
  const [templates, setTemplates] = useState([])

  const [tplDrawerOpen, setTplDrawerOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)

  const loadAll = async () => {
    try {
      const [s, r, t] = await Promise.all([api.stats(), api.listMyRules(), api.listTemplates()])
      setStats(s)
      setRules(r.items)
      setTemplates(t.items)
    } catch (e) {
      msgApi.error(e.message || '加载失败')
    }
  }

  useEffect(() => { loadAll() }, [])

  // 打开详情时再拉
  useEffect(() => {
    if (!detailId) { setDetail(null); return }
    api.getRule(detailId).then(setDetail).catch((e) => msgApi.error(e.message))
  }, [detailId])

  // ====== 开关启用 ======
  const onToggle = async (rule, checked) => {
    try {
      await api.toggleRule(rule.id, checked)
      msgApi.success(checked ? '已启用：龙虾开始主动监听' : '已停用')
      loadAll()
      if (detailId === rule.id) {
        setDetailId(null)
        setTimeout(() => setDetailId(rule.id), 0)
      }
    } catch (e) {
      msgApi.error(e.message || '切换失败')
    }
  }

  // ====== 删除规则 ======
  const onDelete = async (rule) => {
    try {
      await api.deleteRule(rule.id)
      msgApi.success('已删除')
      loadAll()
      if (detailId === rule.id) setDetailId(null)
    } catch (e) {
      msgApi.error(e.message || '删除失败')
    }
  }

  // ====== 从模板添加 ======
  const onAddFromTemplate = async (tpl, asDraft) => {
    try {
      await api.addFromTemplate(tpl.id, { asDraft })
      msgApi.success(`「${tpl.name}」已${asDraft ? '加入草稿' : '加入我的任务'}，可随时启用`)
      setTplDrawerOpen(false)
      loadAll()
    } catch (e) {
      msgApi.error(e.message || '添加失败')
    }
  }

  // ====== 新建规则（向导创建后回调） ======
  const onWizardDone = () => {
    setWizardOpen(false)
    loadAll()
  }

  const hasInstalled = (tplId) => rules.some((r) => r.isFromTemplate === tplId)

  return (
    <div>
      {/* 顶部标题区 */}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">事件订阅任务</h1>
          <p className="page-sub">让个人龙虾按你的规则主动做事 — 选一个触发器，给一句动作指令，它就开始替你工作。</p>
        </div>
        <Space>
          <Button icon={<AppstoreAddOutlined />} size="large" onClick={() => setTplDrawerOpen(true)}>
            从模板添加
          </Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setWizardOpen(true)}>
            新建事件订阅任务
          </Button>
        </Space>
      </Space>

      {/* 品牌概念条 */}
      <div className="hero-concept">
        <div>
          <div className="hc-title">📡 主动智能就这么简单</div>
          <div className="hc-tag">事件一响，龙虾就动 — 不再轮询，由它主动执行</div>
        </div>
        <div className="hc-flow">
          <span className="hc-node"><BellOutlined /> 触发器</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node"><RocketOutlined /> 个人虾主动执行</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node"><CheckCircleTwoTone twoToneColor="#52c41a" /> 任务完成</span>
        </div>
      </div>

      {/* 统计卡 */}
      {stats && (
        <Row gutter={[16, 16]} className="stat-row">
          <Col xs={12} md={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="我的任务"
                value={stats.ruleCount}
                prefix={<span className="stat-icon" style={{ background: '#fff3ec', color: '#fa541c' }}><RocketOutlined /></span>}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="已启用"
                value={stats.enabledCount}
                prefix={<span className="stat-icon" style={{ background: '#e6f7ee', color: '#18a058' }}><BellOutlined /></span>}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="公共模板"
                value={stats.templateCount}
                prefix={<span className="stat-icon" style={{ background: '#f0f5ff', color: '#2563eb' }}><AppstoreAddOutlined /></span>}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card className="stat-card" hoverable>
              <Statistic
                title="累计执行"
                value={stats.totalRuns}
                prefix={<span className="stat-icon" style={{ background: '#fff7e6', color: '#d48806' }}><ThunderboltOutlined /></span>}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs：我的任务 / 模板市场 */}
      <Tabs
        defaultActiveKey="mine"
        items={[
          {
            key: 'mine',
            label: `我的任务（${rules.length}）`,
            children: (
              <div>
                {rules.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="还没有订阅任务 — 点右上角「从模板添加」一键开始，或点「新建」自己拼一个"
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onToggle={(c) => onToggle(rule, c)}
                      onOpen={() => setDetailId(rule.id)}
                      onEdit={() => { setDetailId(rule.id) }}
                    />
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'tpl',
            label: `模板市场（${templates.length}）`,
            children: (
              <div>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>
                  公共模板都是开发者提交的「触发器 × 默认动作」组合 — 一键添加到我的任务，可改名/可改动作、可立即启用或留作草稿。
                </p>
                <Row gutter={[16, 16]}>
                  {templates.map((tpl) => (
                    <Col key={tpl.id} xs={24} sm={12} md={8} lg={8}>
                      <TemplateCard
                        tpl={tpl}
                        installed={hasInstalled(tpl.id)}
                        onAdd={(asDraft) => onAddFromTemplate(tpl, asDraft)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* 模板抽屉（从模板添加） */}
      <Drawer
        title="模板市场"
        open={tplDrawerOpen}
        onClose={() => setTplDrawerOpen(false)}
        width={760}
      >
        <p style={{ color: 'var(--muted)' }}>点击模板即可一键加入 — 启用后会按规则立即监听。</p>
        <Row gutter={[16, 16]}>
          {templates.map((tpl) => (
            <Col key={tpl.id} xs={24} sm={12}>
              <TemplateCard
                tpl={tpl}
                installed={hasInstalled(tpl.id)}
                onAdd={(asDraft) => onAddFromTemplate(tpl, asDraft)}
              />
            </Col>
          ))}
        </Row>
      </Drawer>

      {/* 新建向导 */}
      {wizardOpen && (
        <RuleWizard
          open={wizardOpen}
          onCancel={() => setWizardOpen(false)}
          onDone={onWizardDone}
        />
      )}

      {/* 规则详情抽屉（执行历史） */}
      <RuleDetailDrawer
        open={!!detailId}
        rule={detail}
        onClose={() => setDetailId(null)}
        onToggle={(v) => detail && onToggle(detail, v)}
        onDelete={() => detail && onDelete(detail)}
        onSimulate={() => {
          if (!detail) return
          api.simulateRun(detail.id)
            .then(() => {
              msgApi.success('已触发一次主动执行')
              api.getRule(detail.id).then(setDetail)
              loadAll()
            })
            .catch((e) => msgApi.error(e.message))
        }}
      />
    </div>
  )
}

// ====================================================================
// 子组件：一行规则（截图 1）
// ====================================================================
function RuleRow({ rule, onToggle, onOpen, onEdit }) {
  const trigger = TRIGGER_MAP[rule.trigger] || {}
  const subText = rule.trigger === 'custom'
    ? `${rule.customName || '自定义'}时触发`
    : `${trigger.name || rule.trigger}时触发`
  const isPending = rule.status === 'pending_review'
  const isRejected = rule.status === 'rejected'
  const toggleDisabled = isPending || isRejected
  return (
    <div
      className={`rule-row ${rule.enabled && !toggleDisabled ? '' : 'disabled'}`}
      onClick={(e) => {
        if (e.target.closest('.ant-switch, .ant-btn')) return
        onOpen()
      }}
    >
      <TriggerIcon trigger={rule.trigger} size={42} />
      <div className="rr-main">
        <div className="rr-head">{rule.name}</div>
        <div className="rr-sub">
          {subText}
          {isRejected && rule.rejectReason && (
            <span style={{ color: '#cf1322', marginLeft: 8 }}>
              · 驳回理由：{rule.rejectReason}
            </span>
          )}
        </div>
      </div>
      {isPending && <Tag color="processing">待审核</Tag>}
      {isRejected && <Tag color="error">已驳回</Tag>}
      {!isPending && !isRejected && !rule.enabled && <Tag>草稿</Tag>}
      <span onClick={(e) => e.stopPropagation()}>
        <Switch checked={!!rule.enabled} disabled={toggleDisabled} onChange={onToggle} />
      </span>
      <span className="rr-arrow"><ArrowRightOutlined /></span>
    </div>
  )
}

// ====================================================================
// 子组件：模板卡
// ====================================================================
function TemplateCard({ tpl, installed, onAdd }) {
  return (
    <div className="tpl-card">
      <div className="tc-head">
        <TriggerIcon trigger={tpl.trigger} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tc-name">{tpl.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {tpl.triggerInfo?.name} · 已 {tpl.installs} 人启用
          </div>
        </div>
      </div>
      <div className="tc-desc">{tpl.description}</div>
      <div className="tc-foot">
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>by {tpl.proposer}</span>
        {installed ? (
          <Tag color="success">已添加</Tag>
        ) : (
          <Space size={4}>
            <Button size="small" onClick={() => onAdd(true)}>存草稿</Button>
            <Button size="small" type="primary" onClick={() => onAdd(false)}>立即启用</Button>
          </Space>
        )}
      </div>
    </div>
  )
}

// ====================================================================
// 子组件：3 步创建向导（截图 2-4）
// ====================================================================
const TRIGGER_ICONS_FOR_WIZARD = {
  chat: { bg: '#e8f0fe', color: '#2563eb' },
  email: { bg: '#e8f6ed', color: '#18a058' },
  minutes: { bg: '#fff7e6', color: '#d48806' },
  approval: { bg: '#fff0f6', color: '#c41d7f' },
  webhook: { bg: '#f3ecfd', color: '#7c3aed' },
  custom: { bg: '#e6fffb', color: '#08979c' },
}

import {
  MailOutlined, MessageOutlined, FileTextOutlined, AuditOutlined, ApiOutlined, SettingOutlined,
} from '@ant-design/icons'

const TRIGGER_ICON_MAP = {
  chat: MessageOutlined,
  email: MailOutlined,
  minutes: FileTextOutlined,
  approval: AuditOutlined,
  webhook: ApiOutlined,
  custom: SettingOutlined,
}

function RuleWizard({ open, onCancel, onDone }) {
  const { message: msgApi } = AntApp.useApp()
  const [step, setStep] = useState(0)
  const [trigger, setTrigger] = useState(null)
  const [customName, setCustomName] = useState('')
  const [action, setAction] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(0); setTrigger(null); setCustomName(''); setAction(''); setName('')
    }
  }, [open])

  const canNext = () => {
    if (step === 0) {
      if (!trigger) return false
      if (trigger === 'custom' && !customName.trim()) return false
      return true
    }
    if (step === 1) return action.trim().length >= 4
    if (step === 2) return name.trim().length >= 2
    return false
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await api.createRule({
        name: name.trim(),
        trigger,
        customName: trigger === 'custom' ? customName.trim() : null,
        action: action.trim(),
      })
      msgApi.success('已提交，等待管理员审核')
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
      title="新建规则"
    >
      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择触发' },
          { title: '设置操作' },
          { title: '完成保存' },
        ]}
      />

      {step === 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>选择触发器类型</div>
          <div className="trigger-grid">
            {Object.values(TRIGGER_MAP).map((t) => {
              const TriggerIco = TRIGGER_ICON_MAP[t.id]
              const style = TRIGGER_ICONS_FOR_WIZARD[t.id]
              return (
                <div
                  key={t.id}
                  className={`trigger-tile ${trigger === t.id ? 'selected' : ''}`}
                  onClick={() => setTrigger(t.id)}
                >
                  <div className="tt-icon" style={trigger === t.id ? {} : style}>
                    <TriggerIco />
                  </div>
                  <div className="tt-name">{t.name}</div>
                  <div className="tt-desc">{t.desc}</div>
                </div>
              )
            })}
          </div>

          {trigger === 'custom' && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                给你的自定义触发器起个名字
              </div>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="如：每日 8 点 / GitLab MR 创建 / 工作日历变更"
                size="large"
              />
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>设置执行内容</div>
          <Input.TextArea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="请输入要让龙虾执行的内容，如：自动总结、自动摘要并同步到对话框……"
            autoSize={{ minRows: 6, maxRows: 10 }}
            style={{ fontSize: 14 }}
          />
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 12.5 }}>
            例：「自动按紧急程度分级」「摘要成 50 字内」「自动发到群对话」「再 @ 提醒到人」…
          </p>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="preview-card">
            <div className="pc-head">
              <TriggerIcon trigger={trigger} size={42} />
              <div style={{ flex: 1 }}>
                <div className="pc-name">{name || '未命名规则'}</div>
                <div className="pc-desc">
                  {trigger === 'custom'
                    ? `${customName || '自定义'}时触发`
                    : TRIGGER_MAP[trigger]?.desc}
                </div>
              </div>
            </div>
            <div className="pc-action">
              <b>动作：</b>{action}
            </div>
          </div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>规则名称</div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入规则名称（也可保持自动建议名）"
            size="large"
          />
          <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 12.5 }}>
            提交后将进入 <b>所有任务审核</b>，管理员通过后即可被龙虾主动执行。
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
        <Space>
          {step > 0 && <Button onClick={() => setStep((s) => s - 1)}>上一步</Button>}
          {step === 0 && <Button onClick={onCancel}>取消</Button>}
        </Space>
        <Space>
          {step < 2 && (
            <Button type="primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              下一步
            </Button>
          )}
          {step === 2 && (
            <Button type="primary" loading={submitting} onClick={submit}>
              提交审核
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  )
}

// ====================================================================
// 子组件：规则详情 / 执行历史抽屉（截图 5）
// ====================================================================
function RuleDetailDrawer({ open, rule, onClose, onToggle, onDelete, onSimulate }) {
  const statusBadge = rule && rule.statusMeta ? (
    <Tag color={rule.statusMeta.color}>{rule.statusMeta.label}</Tag>
  ) : null
  const isActive = rule?.status === 'active'
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
      destroyOnClose
      title={
        <Space>
          <span style={{ fontWeight: 700 }}>{rule?.name || '规则详情'}</span>
          {statusBadge}
        </Space>
      }
      extra={
        rule && (
          <Space>
            {isActive && rule.enabled && (
              <Button icon={<ThunderboltOutlined />} onClick={onSimulate}>主动触发一次</Button>
            )}
            <Switch checked={!!rule.enabled} disabled={!isActive} onChange={onToggle} />
          </Space>
        )
      }
      footer={
        rule && (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Popconfirm
              title="确认删除此规则？"
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
      {!rule ? (
        <Empty />
      ) : (
        <>
          <div className="detail-hero">
            <TriggerIcon trigger={rule.trigger} size={56} />
            <div className="dh-text">
              <div className="dh-title">{rule.name}</div>
              <div className="dh-meta">
                触发器：{rule.trigger === 'custom' ? (rule.customName || '自定义') : rule.triggerName}
                {' · '}创建于 {new Date(rule.createdAt).toLocaleString('zh-CN')}
                {' · '}by {rule.proposer}
              </div>
              {rule.status === 'rejected' && rule.rejectReason && (
                <div className="dh-action" style={{ background: '#fff1f0', borderLeftColor: '#cf1322' }}>
                  <b style={{ color: '#cf1322' }}>驳回理由：</b> {rule.rejectReason}
                </div>
              )}
              <div className="dh-action">
                <b>🦞 龙虾会主动：</b> {rule.action}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label" style={{ margin: 0 }}>执行记录</div>
            {rule.runs?.length > 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>共 {rule.runs.length} 次</span>}
          </div>
          <div className="detail-side" style={{ padding: '6px 18px' }}>
            {!rule.runs || rule.runs.length === 0 ? (
              <Empty description={isActive ? '还没有执行记录 — 点右上角『主动触发一次』模拟一次' : '审核通过启用后才会有执行记录'} style={{ padding: '20px 0' }} />
            ) : rule.runs.map((run) => (
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
