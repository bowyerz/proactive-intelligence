import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Space, Tag, Modal, Input, Form, Empty, Statistic, Row, Col, Card,
} from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { api, PRESET_STATUS_META, SUB_STATUS_META } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

const REVIEWER = '平台管理员'

export default function ReviewPage() {
  const { message } = AntApp.useApp()
  const [queue, setQueue] = useState({
    pending: [], reviewed: [], pendingCount: 0, presetPending: 0, subPending: 0,
  })
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
      const fn = item.kind === 'preset' ? api.reviewPresetTask : api.reviewSubscription
      const verb = item.kind === 'preset' ? '上架事件市场' : '启用该订阅'
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
      const fn = rejectTarget.kind === 'preset' ? api.reviewPresetTask : api.reviewSubscription
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
          <h1 className="page-title">任务审核</h1>
          <p className="page-sub">
            待审核 <Tag color="processing">{queue.pendingCount}</Tag> 条 —
            含 <b>预置任务提案</b> {queue.presetPending} 条、<b>用户自建订阅</b> {queue.subPending} 条。
            通过后预置任务上架事件市场，自建订阅立即启用。
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
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="例如：动作描述不清 / 与已有任务重复 / 触发场景不明确……"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function KindTag({ kind }) {
  return kind === 'preset'
    ? <Tag color="purple">预置任务提案</Tag>
    : <Tag color="blue">用户自建订阅</Tag>
}

function PendingItemCard({ item, onApprove, onReject }) {
  const statusMeta = item.kind === 'preset'
    ? (PRESET_STATUS_META[item.status] || PRESET_STATUS_META.pending_review)
    : (SUB_STATUS_META[item.status] || SUB_STATUS_META.pending_review)

  // 订阅和预置任务的字段差异
  const eventLabel = item.eventName || '未知事件'
  const actionText = item.action || item.actionPreview || ''
  const descText = item.description || (item.isCustom ? '用户自建任务' : '')

  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon event={item.eventId} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <span style={{ marginLeft: 8 }}>
              <KindTag kind={item.kind} />
            </span>
            {item.isCustom && <Tag color="purple" style={{ marginLeft: 4 }}>自建</Tag>}
          </div>
          <div className="rc-desc">
            事件：{eventLabel} · by {item.proposer} · 提交于 {new Date(item.submittedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
      </div>
      {descText && <div className="rc-desc">{descText}</div>}
      <div className="rc-action">
        <b>🦞 龙虾会主动：</b>{actionText}
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
  const m = item.kind === 'preset'
    ? (PRESET_STATUS_META[item.status] || {})
    : (SUB_STATUS_META[item.status] || {})
  return (
    <div className="review-card">
      <div className="rc-head">
        <TriggerIcon event={item.eventId} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rc-name">
            {item.name}
            <span style={{ marginLeft: 8 }}>
              <KindTag kind={item.kind} />
            </span>
            {item.isCustom && <Tag color="purple" style={{ marginLeft: 4 }}>自建</Tag>}
          </div>
          <div className="rc-desc">
            事件：{item.eventName || item.eventId} · by {item.proposer}
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
