import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Space, Tag, Modal, Input, Form, Empty, Statistic, Row, Col, Card,
} from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { api, PROPOSED_EVENT_STATUS_META } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

const REVIEWER = '平台管理员'

export default function ReviewPage() {
  const { message } = AntApp.useApp()
  const [queue, setQueue] = useState({ pending: [], reviewed: [], pendingCount: 0 })
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

  const approve = async (item) => {
    try {
      const r = await api.reviewProposedEvent(item.id, { decision: 'approve', reviewer: REVIEWER })
      message.success(`已通过「${r.name}」— 事件已上架到事件市场`)
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
      await api.reviewProposedEvent(rejectTarget.id, { decision: 'reject', reviewer: REVIEWER, note: v.reason })
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
          <h1 className="page-title">事件审核</h1>
          <p className="page-sub">
            待审核 <Tag color="processing">{queue.pendingCount}</Tag> 个事件 —
            只审核事件本身（来源 / 触发说明 / 清单 / 视觉），不带任何任务。
            通过后该事件上架到「事件市场」，用户可订阅并在自己的界面创建任务。
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
        <Empty description="太棒了，没有需要审核的事件 ✨" style={{ padding: '30px 0' }} />
      ) : (
        queue.pending.map((item) => (
          <PendingEventCard
            key={item.id}
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
            <ReviewedEventRow key={item.id} item={item} />
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
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="例如：触发场景不明确 / 与已有事件重复 / 触发说明不清晰……"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function PendingEventCard({ item, onApprove, onReject }) {
  const statusMeta = PROPOSED_EVENT_STATUS_META[item.status] || PROPOSED_EVENT_STATUS_META.pending_review
  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon eventMeta={item} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <Tag color={statusMeta.color} style={{ marginLeft: 8 }}>{statusMeta.label}</Tag>
          </div>
          <div className="rc-desc">
            来源：{item.source || '—'} · by {item.proposer} · 提交于 {new Date(item.submittedAt).toLocaleString('zh-CN')}
          </div>
          {item.desc && (
            <div className="rc-desc" style={{ marginTop: 4 }}>{item.desc}</div>
          )}
          {item.checklist && (
            <div className="rc-desc" style={{ color: 'var(--muted)', marginTop: 4 }}>
              📋 使用清单：{item.checklist}
            </div>
          )}
        </div>
      </div>

      <div className="rc-section-title" style={{ color: 'var(--muted)' }}>
        💡 本次审核不涉及任何任务 — 任务完全由用户在订阅时自行创建。
      </div>

      <div className="rc-foot">
        <Space>
          <Button icon={<CloseOutlined />} danger onClick={onReject}>驳回</Button>
          <Button icon={<CheckOutlined />} type="primary" onClick={onApprove}>通过 · 事件上架</Button>
        </Space>
      </div>
    </div>
  )
}

function ReviewedEventRow({ item }) {
  const m = PROPOSED_EVENT_STATUS_META[item.status] || {}
  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon eventMeta={item} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <Tag color={m.color} style={{ marginLeft: 8 }}>{m.label}</Tag>
          </div>
          <div className="rc-desc">
            来源：{item.source || '—'} · by {item.proposer}
            {item.reviewedAt ? ` · 审核于 ${new Date(item.reviewedAt).toLocaleString('zh-CN')}` : ''}
            {item.reviewer ? `（${item.reviewer}）` : ''}
            {item.rejectReason ? ` · 理由：${item.rejectReason}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}