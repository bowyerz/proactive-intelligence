import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Space, Tag, Modal, Input, Form, Empty, Statistic, Row, Col, Card,
} from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { api, RULE_STATUS_META, TEMPLATE_STATUS_META, TRIGGER_MAP } from '../api.js'
import TriggerIcon from '../components/TriggerIcon.jsx'

const REVIEWER = '平台管理员'

// 触发器展示名：自定义规则用 customName，其余用 TRIGGER_MAP
function triggerLabelOf(item) {
  if (item.trigger === 'custom' && item.customName) return item.customName
  return TRIGGER_MAP[item.trigger]?.name || item.trigger
}

export default function ReviewPage() {
  const { message } = AntApp.useApp()
  const [queue, setQueue] = useState({ pending: [], reviewed: [], pendingCount: 0, rulePending: 0, templatePending: 0 })
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const q = await api.reviewQueue()
      setQueue(q)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // 根据 kind 走不同的审核函数（规则走 reviewRule，模板走 reviewTemplate）
  const approve = async (item) => {
    try {
      const fn = item.kind === 'rule' ? api.reviewRule : api.reviewTemplate
      const verb = item.kind === 'rule' ? '启用' : '上架公共模板市场'
      await fn(item.id, { decision: 'approve', reviewer: REVIEWER })
      message.success(`已通过「${item.name}」— 立即${verb}`)
      load()
    } catch (e) {
      message.error(e.message || '操作失败')
    }
  }

  const openReject = (item) => {
    setRejectTarget(item)
    form.resetFields()
  }

  const submitReject = async () => {
    const v = await form.validateFields()
    try {
      const fn = rejectTarget.kind === 'rule' ? api.reviewRule : api.reviewTemplate
      await fn(rejectTarget.id, { decision: 'reject', reviewer: REVIEWER, note: v.reason })
      message.success('已驳回')
      setRejectTarget(null)
      load()
    } catch (e) {
      message.error(e.message || '操作失败')
    }
  }

  const approvedCount = queue.reviewed.filter((t) => t.status === 'active').length
  const rejectedCount = queue.reviewed.filter((t) => t.status === 'rejected').length

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">所有任务审核</h1>
          <p className="page-sub">
            待审核 <Tag color="processing">{queue.pendingCount}</Tag> 条 —
            含 <b>用户规则</b> {queue.rulePending} 条、<b>模板提案</b> {queue.templatePending} 条。
            通过后用户规则立即启用、模板上架公共市场。
          </p>
        </div>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 22 }}>
        <Col xs={12} md={8}>
          <Card className="stat-card" hoverable>
            <Statistic title="待审核" value={queue.pendingCount} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card className="stat-card" hoverable>
            <Statistic title="已通过" value={approvedCount} valueStyle={{ color: '#18a058' }} />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card className="stat-card" hoverable>
            <Statistic title="已驳回" value={rejectedCount} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <div className="section-label" style={{ marginTop: 6 }}>
        待审核（{queue.pending.length}）
      </div>
      {loading ? null : queue.pending.length === 0 ? (
        <Empty description="太棒了，没有需要审核的任务 ✨" style={{ padding: '30px 0' }} />
      ) : (
        queue.pending.map((item) => (
          <PendingItemCard
            key={`${item.kind}_${item.id}`}
            item={item}
            onApprove={() => approve(item)}
            onReject={() => openReject(item)}
          />
        ))
      )}

      {queue.reviewed.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 28 }}>审核记录</div>
          {queue.reviewed.map((item) => (
            <ReviewedItemRow key={`${item.kind}_${item.id}`} item={item} />
          ))}
        </>
      )}

      <Modal
        title={`驳回「${rejectTarget?.name || ''}」`}
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onOk={submitReject}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="reason"
            label="驳回理由（必填）"
            rules={[{ required: true, message: '请填写驳回理由' }]}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} placeholder="例如：动作描述不清 / 触发条件不明确 / 与已有模板重复……" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// 区分「用户规则」与「模板提案」的标签
function KindTag({ kind }) {
  return kind === 'rule'
    ? <Tag color="blue">用户规则</Tag>
    : <Tag color="purple">模板提案</Tag>
}

function PendingItemCard({ item, onApprove, onReject }) {
  const triggerLabel = triggerLabelOf(item)
  const statusMeta = item.kind === 'rule'
    ? RULE_STATUS_META[item.status] || RULE_STATUS_META.pending_review
    : TEMPLATE_STATUS_META[item.status] || TEMPLATE_STATUS_META.pending_review
  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon trigger={item.trigger} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <span style={{ marginLeft: 8 }}>
              <KindTag kind={item.kind} />
            </span>
          </div>
          <div className="rc-desc">
            触发器：{triggerLabel} · by {item.proposer} · 提交于 {new Date(item.submittedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      </div>
      <div className="rc-desc">{item.description}</div>
      <div className="rc-action">
        <b>🦞 龙虾会主动：</b>{item.action}
      </div>
      <div className="rc-foot">
        <Space>
          <Button icon={<CloseOutlined />} danger onClick={onReject}>驳回</Button>
          <Button icon={<CheckOutlined />} type="primary" onClick={onApprove}>通过</Button>
        </Space>
      </div>
    </div>
  )
}

function ReviewedItemRow({ item }) {
  const triggerLabel = triggerLabelOf(item)
  const m = item.kind === 'rule'
    ? (RULE_STATUS_META[item.status] || {})
    : (TEMPLATE_STATUS_META[item.status] || {})
  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon trigger={item.trigger} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <span style={{ marginLeft: 8 }}>
              <KindTag kind={item.kind} />
            </span>
          </div>
          <div className="rc-desc">
            {triggerLabel} · by {item.proposer}
            {item.reviewedAt ? ` · 审核于 ${new Date(item.reviewedAt).toLocaleString('zh-CN')}` : ''}
            {item.reviewer ? `（${item.reviewer}）` : ''}
            {item.rejectReason ? ` · 理由：${item.rejectReason}` : ''}
          </div>
        </div>
        <Tag color={m.color}>{m.label}</Tag>
      </div>
    </div>
  )
}
