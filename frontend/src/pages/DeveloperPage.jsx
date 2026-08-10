import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Drawer, Form, Input, Select, Space, Table, Tag, Popconfirm, Empty,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api, TEMPLATE_STATUS_META, TRIGGER_MAP } from '../api.js'
import TriggerIcon from '../components/TriggerIcon.jsx'

const PROPOSER = '张开发'

export default function DeveloperPage() {
  const { message } = AntApp.useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.proposerTemplates(PROPOSER)
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
      trigger: 'email',
      proposer: PROPOSER,
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const v = await form.validateFields()
    const id = `tpl_${PROPOSER}_${v.name.replace(/[^\w]/g, '_')}_${Date.now().toString(36).slice(-4)}`
    try {
      await api.submitTemplate({
        id,
        name: v.name.trim(),
        trigger: v.trigger,
        description: v.description?.trim() || '',
        action: v.action.trim(),
        proposer: v.proposer || PROPOSER,
      })
      message.success('已提交模板，等待审核')
      setDrawerOpen(false)
      load()
    } catch (e) {
      message.error(e.message || '提交失败')
    }
  }

  const onDelete = async (tpl) => {
    // Demo 静态版：直接调用通用删除不存在，所以改用本地移除：
    setList((arr) => arr.filter((t) => t.id !== tpl.id))
    message.success('已移除（演示）')
  }

  const columns = [
    {
      title: '模板',
      dataIndex: 'name',
      render: (_, rec) => (
        <Space>
          <TriggerIcon trigger={rec.trigger} size={32} />
          <div>
            <div style={{ fontWeight: 600 }}>{rec.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rec.description}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '触发器',
      dataIndex: 'trigger',
      render: (t) => TRIGGER_MAP[t]?.name || t,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (st) => {
        const m = TEMPLATE_STATUS_META[st] || TEMPLATE_STATUS_META.pending_review
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: '启用数',
      dataIndex: 'installs',
      render: (n) => n || 0,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      render: (t) => t ? new Date(t).toLocaleDateString('zh-CN') : '—',
    },
    {
      title: '操作',
      key: 'op',
      render: (_, rec) => (
        <Popconfirm title="确认移除这条模板提案？" okText="移除" cancelText="取消" onConfirm={() => onDelete(rec)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">模板策划工作台</h1>
          <p className="page-sub">
            以开发者「{PROPOSER}」身份提交模板（触发器 × 默认动作） —— 通过审核后上架到公共模板市场，用户一键启用即可。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSubmit}>
          提交新模板
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
              description="还没有提交过模板 — 点右上角「提交新模板」，提案触发器×动作的组合"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '24px 0' }}
            />
          ),
        }}
      />

      <Drawer
        title="提交新模板"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={onSubmit}>提交审核</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：关键客户邮件优先提醒" />
          </Form.Item>
          <Form.Item name="trigger" label="触发器" rules={[{ required: true }]}>
            <Select options={Object.values(TRIGGER_MAP).map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="description" label="简介（一句话）">
            <Input placeholder="客户邮件 30 秒内提醒并 @ 相关同事" />
          </Form.Item>
          <Form.Item
            name="action"
            label="默认动作（提示词）"
            rules={[{ required: true, message: '请填写动作内容' }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder="例如：识别客户邮件关键字，30 秒内私聊推送并 @ 相关同事。"
            />
          </Form.Item>
          <Form.Item name="proposer" label="作者">
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
