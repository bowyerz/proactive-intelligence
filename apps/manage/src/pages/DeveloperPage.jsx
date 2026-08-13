import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Drawer, Form, Input, Select, Space, Table, Tag, Popconfirm, Empty,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api, EVENTS, PRESET_STATUS_META } from '@shared/api.js'
import TriggerIcon from '@shared/components/TriggerIcon.jsx'

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
      const r = await api.proposerPresetTasks(PROPOSER)
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
    form.setFieldsValue({ eventId: EVENTS[0].id, proposer: PROPOSER })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const v = await form.validateFields()
    const id = `pt_${PROPOSER}_${v.name.replace(/[^\w\u4e00-\u9fa5]/g, '_')}_${Date.now().toString(36).slice(-4)}`
    try {
      await api.submitPresetTask({
        id,
        eventId: v.eventId,
        name: v.name.trim(),
        description: v.description?.trim() || '',
        actionPreview: v.actionPreview.trim(),
        proposer: v.proposer || PROPOSER,
      })
      message.success('已提交预置任务，等待审核')
      setDrawerOpen(false)
      load()
    } catch (e) {
      message.error(e.message || '提交失败')
    }
  }

  // Demo 静态版：本地移除
  const onRemove = (task) => {
    setList((arr) => arr.filter((t) => t.id !== task.id))
    message.success('已移除（演示）')
  }

  const columns = [
    {
      title: '预置任务',
      dataIndex: 'name',
      render: (_, rec) => (
        <Space>
          <TriggerIcon event={rec.eventId} size={32} />
          <div>
            <div style={{ fontWeight: 600 }}>{rec.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rec.description}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '事件',
      dataIndex: 'eventName',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (st) => {
        const m = PRESET_STATUS_META[st] || PRESET_STATUS_META.pending_review
        return <Tag color={m.color}>{m.label}</Tag>
      },
    },
    {
      title: '订阅数',
      dataIndex: 'installs',
      width: 90,
      render: (n) => n || 0,
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
        <Popconfirm title="确认移除这条提案？" okText="移除" cancelText="取消" onConfirm={() => onRemove(rec)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="end">
        <div>
          <h1 className="page-title">预置任务提案</h1>
          <p className="page-sub">
            以「{PROPOSER}」身份为现有事件提交新的预置任务（事件 + 动作） — 管理员审核通过后上架到「事件市场」，用户即可一键订阅。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSubmit}>
          提交新预置任务
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
              description="还没有提交过预置任务 — 点右上角「提交新预置任务」，为某个事件提案一个动作"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '24px 0' }}
            />
          ),
        }}
      />

      <Drawer
        title="提交新预置任务"
        width={560}
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
          <Form.Item name="eventId" label="事件（已有的）" rules={[{ required: true, message: '请选择事件' }]}>
            <Select
              options={EVENTS.map((e) => ({ value: e.id, label: e.name }))}
              optionRender={(o) => (
                <Space>
                  <TriggerIcon event={o.value} size={20} />
                  <span>{o.label}</span>
                </Space>
              )}
            />
          </Form.Item>
          <Form.Item name="name" label="预置任务名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：同步纪要给未参会人" />
          </Form.Item>
          <Form.Item name="description" label="简介（一句话）">
            <Input placeholder="没参会的人也能拿到要点" />
          </Form.Item>
          <Form.Item
            name="actionPreview"
            label="动作预览（用户订阅时看到的「龙虾会主动…」）"
            rules={[{ required: true, message: '请填写动作内容' }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 8 }}
              placeholder="例如：会后把纪要摘要发到部门群，标注「参与者 / 未参与者」"
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
