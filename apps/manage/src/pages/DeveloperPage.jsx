import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Drawer, Form, Input, Select, Space, Table, Tag, Popconfirm, Empty,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api, PROPOSED_EVENT_STATUS_META } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

const PROPOSER = '张开发'

// 开发者提案时可挑选的图标（与 TriggerIcon 的 ICON_REGISTRY 保持一致）
const ICON_OPTIONS = [
  { value: 'ThunderboltOutlined', label: '⚡ 闪电' },
  { value: 'BellOutlined', label: '🔔 铃铛' },
  { value: 'NotificationOutlined', label: '🔔 通知' },
  { value: 'AlertOutlined', label: '⚠️ 提醒' },
  { value: 'CalendarOutlined', label: '📅 日历' },
  { value: 'ClockCircleOutlined', label: '🕐 时钟' },
  { value: 'CheckCircleOutlined', label: '✅ 对勾' },
  { value: 'MessageOutlined', label: '💬 消息' },
  { value: 'FileTextOutlined', label: '📄 文档' },
  { value: 'TeamOutlined', label: '👥 团队' },
]

const COLOR_PRESETS = [
  { value: '#2f54eb', label: '蓝' },
  { value: '#08979c', label: '青' },
  { value: '#d48806', label: '橙' },
  { value: '#cf1322', label: '红' },
  { value: '#531dab', label: '紫' },
  { value: '#389e0d', label: '绿' },
]

const BG_PRESETS = [
  { value: '#f0f5ff', label: '淡蓝' },
  { value: '#e6fffb', label: '淡青' },
  { value: '#fff7e6', label: '淡橙' },
  { value: '#fff1f0', label: '淡红' },
  { value: '#f9f0ff', label: '淡紫' },
  { value: '#f6ffed', label: '淡绿' },
]

function slugifyName(name) {
  return String(name || '').trim().replace(/[^\w\u4e00-\u9fa5]/g, '_').slice(0, 16) || 'event'
}

export default function DeveloperPage() {
  const { message } = AntApp.useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.proposerProposedEvents(PROPOSER)
      setList(r.items)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openSubmit = () => {
    form.resetFields()
    form.setFieldsValue({
      proposer: PROPOSER,
      icon: 'ThunderboltOutlined',
      bg: '#f0f5ff',
      color: '#2f54eb',
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const v = await form.validateFields()
    const slug = slugifyName(v.name)
    const id = `pe_${PROPOSER}_${slug}_${Date.now().toString(36).slice(-4)}`
    try {
      await api.submitProposedEvent({
        id,
        name: v.name.trim(),
        icon: v.icon,
        bg: v.bg,
        color: v.color,
        source: (v.source || '').trim(),
        desc: (v.desc || '').trim(),
        checklist: (v.checklist || '').trim(),
        proposer: v.proposer || PROPOSER,
      })
      message.success('已提交事件，等待管理员审核')
      setDrawerOpen(false)
      load()
    } catch (e) {
      message.error(e.message || '提交失败')
    }
  }

  const onRemove = (pe) => {
    setList((arr) => arr.filter((x) => x.id !== pe.id))
    message.success('已从当前列表移除（演示：localStorage 中的记录实际未删除）')
  }

  const columns = [
    {
      title: '提案事件',
      dataIndex: 'name',
      render: (_, rec) => (
        <Space>
          <TriggerIcon eventMeta={rec} size={36} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{rec.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              来源：{rec.source}{rec.desc ? ` · ${rec.desc}` : ''}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '使用清单',
      dataIndex: 'checklist',
      render: (t) => t ? <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (st) => {
        const m = PROPOSED_EVENT_STATUS_META[st] || PROPOSED_EVENT_STATUS_META.pending_review
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      width: 120,
      render: (t) => t ? new Date(t).toLocaleDateString('zh-CN') : '—',
    },
    {
      title: '操作',
      key: 'op',
      width: 80,
      render: (_, rec) => (
        <Popconfirm title="从当前列表移除这条提案？" okText="移除" cancelText="取消" onConfirm={() => onRemove(rec)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">事件策划</h1>
          <p className="page-sub">
            以「{PROPOSER}」身份提案一个新事件（只定义事件元数据，不带任何任务） — 管理员审核通过后该事件上架到「事件市场」，
            用户即可一键订阅并在自己的界面定义任务。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSubmit}>
          提案新事件
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description="还没有提案过事件 — 点右上角「提案新事件」"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '24px 0' }}
            />
          ),
        }}
      />

      <Drawer
        title="提案新事件"
        width={620}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={onSubmit}>提交审核</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <div className="section-label">事件元信息</div>
          <Form.Item name="name" label="事件名" rules={[{ required: true, message: '请填写事件名' }]}>
            <Input placeholder="例如：周报截止前 2 小时" />
          </Form.Item>
          <Form.Item name="source" label="来源" rules={[{ required: true, message: '请填写事件来源' }]}>
            <Input placeholder="例如：飞书 OKR / GitLab MR / 自定义 webhook" />
          </Form.Item>
          <Form.Item name="desc" label="触发说明（一句话）">
            <Input placeholder="例如：每周五 17:00 周报截止前 2 小时触发" />
          </Form.Item>
          <Form.Item name="checklist" label="使用清单（可选）">
            <Input placeholder="例如：汇总待办 · 整理进展 · 准备周报" />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="icon" label="图标" style={{ flex: 1, marginRight: 12 }}>
              <Select options={ICON_OPTIONS} />
            </Form.Item>
            <Form.Item name="color" label="主色" style={{ width: 140 }}>
              <Select options={COLOR_PRESETS} />
            </Form.Item>
            <Form.Item name="bg" label="背景色" style={{ width: 140 }}>
              <Select options={BG_PRESETS} />
            </Form.Item>
          </Space.Compact>

          <div style={{
            marginTop: 6, padding: '10px 14px',
            background: '#f6ffed', border: '1px dashed #b7eb8f', borderRadius: 6,
            color: '#389e0d', fontSize: 13,
          }}>
            💡 v5 模型：开发者只提案「事件」本身。任务完全由用户在订阅时/订阅后自己创建。
          </div>

          <Form.Item name="proposer" label="作者" style={{ marginTop: 16 }}>
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}