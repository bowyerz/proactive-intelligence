import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Drawer, Form, Input, Select, Space, Table, Tag, Popconfirm, message,
} from 'antd'
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { api, STATUS_META, CATEGORY_LABELS, SOURCE_COLORS } from '../api.js'
import SourceIcon from '../components/SourceIcon.jsx'

const DEV = '张开发'

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "标题" },
    "url": { "type": "string", "description": "链接" },
    "author": { "type": "string", "description": "来源人" }
  },
  "required": ["title", "url"]
}`

const SAMPLE_EXAMPLES = `[
  {
    "title": "周会纪要",
    "url": "https://example.com/meeting/123",
    "author": "张开发"
  }
]`

function parseOrThrow(raw, name) {
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`${name} 不是合法 JSON：${e.message}`)
  }
}

export default function DeveloperPage() {
  const { message } = AntApp.useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [editing, setEditing] = useState(null) // 重新提交时携带原数据
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.devEvents(DEV)
      setList(r.items)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openSubmit = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      source: '飞书',
      categories: ['communication'],
      schema: SAMPLE_SCHEMA,
      examples: SAMPLE_EXAMPLES,
      author: DEV,
      authorContact: 'zhang@example.com',
    })
    setDrawer(true)
  }

  const openResubmit = (rec) => {
    setEditing(rec)
    form.setFieldsValue({
      id: rec.id,
      name: rec.name,
      source: rec.source,
      categories: rec.categories || [rec.category],
      description: rec.description,
      detail: rec.detail,
      schema: JSON.stringify(rec.schema, null, 2),
      examples: JSON.stringify(rec.examples, null, 2),
      scenarios: (rec.scenarios || []).join('\n'),
      author: rec.author,
      authorContact: rec.authorContact,
    })
    setDrawer(true)
  }

  const onSubmit = async () => {
    const v = await form.validateFields()
    let schema
    let examples
    try {
      schema = parseOrThrow(v.schema, 'Payload Schema')
      examples = parseOrThrow(v.examples, '触发示例')
    } catch (e) {
      message.error(e.message)
      return
    }
    const payload = {
      id: v.id,
      name: v.name,
      source: v.source,
      categories: v.categories,
      description: v.description,
      detail: v.detail || '',
      schema_,
      examples,
      scenarios: (v.scenarios || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      author: v.author || DEV,
      author_contact: v.authorContact || '',
    }
    try {
      if (editing) {
        await api.resubmitEvent(editing.id, payload)
        message.success('已重新提交，等待审核')
      } else {
        await api.submitEvent(payload)
        message.success('提交成功，已进入审核队列')
      }
      setDrawer(false)
      load()
    } catch (e) {
      message.error(e.message || '提交失败')
    }
  }

  const onDelete = async (rec) => {
    try {
      await api.deleteEvent(rec.id)
      message.success('已删除')
      load()
    } catch (e) {
      message.error(e.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '事件',
      dataIndex: 'name',
      render: (name, rec) => (
        <Space>
          <SourceIcon source={rec.source} size={30} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div className="card-id">{rec.id}</div>
          </div>
        </Space>
      ),
    },
    { title: '来源', dataIndex: 'source', render: (s) => <Tag color={SOURCE_COLORS[s] || 'purple'}>{s}</Tag> },
    {
      title: '分类',
      dataIndex: 'categoryLabels',
      render: (cs) => (cs || []).map((c) => <Tag key={c} bordered={false}>{c}</Tag>),
    },
    { title: '订阅数', dataIndex: 'subscriberCount', render: (n) => `👥 ${n}` },
    {
      title: '状态',
      dataIndex: 'status',
      render: (st) => {
        const m = STATUS_META[st] || STATUS_META.draft
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: '操作',
      key: 'op',
      render: (_, rec) => (
        <Space>
          {(rec.status === 'rejected' || rec.status === 'draft') && (
            <Button size="small" icon={<ReloadOutlined />} onClick={() => openResubmit(rec)}>
              重新提交
            </Button>
          )}
          <Popconfirm title="确认删除该事件？" onConfirm={() => onDelete(rec)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">开发者工作台</h1>
          <p className="page-sub">以开发者「{DEV}」身份提交事件 Skill —— 审核通过上架后，用户订阅即由个人虾主动执行动作。</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSubmit}>
          提交新事件
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />

      <Drawer
        title={editing ? `重新提交事件 · ${editing.id}` : '提交新事件 Skill'}
        width={560}
        open={drawer}
        onClose={() => setDrawer(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawer(false)}>取消</Button>
            <Button type="primary" onClick={onSubmit}>
              提交
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="id" label="事件 ID（点分命名，如 gitlab.issue.opened）" rules={[{ required: true, message: '必填' }]}>
            <Input disabled={!!editing} placeholder="abc.def.happened" />
          </Form.Item>
          <Form.Item name="name" label="事件名称" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="例如：代码评审请求创建" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="source" label="来源" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={Object.keys(SOURCE_COLORS).map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="categories" label="分类（可多选）" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                mode="multiple"
                options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="一句话描述" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} />
          </Form.Item>
          <Form.Item name="detail" label="事件说明（支持 Markdown）">
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} placeholder="## 触发时机\n当 … 发生时推送" />
          </Form.Item>
          <Form.Item name="schema" label="Payload Schema（JSON Schema）" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea autoSize={{ minRows: 5 }} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="examples" label="触发示例 Payload（JSON 数组）" rules={[{ required: true, message: '必填' }]}>
            <Input.TextArea autoSize={{ minRows: 4 }} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="scenarios" label="典型场景（每行一条）">
            <Input.TextArea autoSize={{ minRows: 2 }} placeholder="收到老板的邮件\n收到客户合同" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="author" label="作者" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="authorContact" label="联系方式" style={{ flex: 1 }}>
              <Input placeholder="邮箱 / 企微" />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </div>
  )
}
