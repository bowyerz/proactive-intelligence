import { useEffect, useState } from 'react'
import {
  App as AntApp, Button, Collapse, Drawer, Empty, Input, List, Space, Spin, Tag, message,
} from 'antd'
import {
  CheckCircleTwoTone, CloseCircleTwoTone, EditOutlined, CheckOutlined,
} from '@ant-design/icons'
import { api, STATUS_META, SOURCE_COLORS, CATEGORY_LABELS } from '../api.js'
import SourceIcon from '../components/SourceIcon.jsx'
import Markdown from '../components/Markdown.jsx'
import JsonBlock from '../components/JsonBlock.jsx'

const REVIEWER = '平台管理员'

function CheckRow({ item }) {
  const ok = item.suggested
  return (
    <List.Item>
      <Space>
        {ok ? (
          <CheckCircleTwoTone twoToneColor="#52c41a" />
        ) : (
          <CloseCircleTwoTone twoToneColor="#fa541c" />
        )}
        <span style={{ textDecoration: ok ? 'none' : 'line-through', color: ok ? '' : '#9ca3af' }}>
          {item.label}
        </span>
      </Space>
    </List.Item>
  )
}

export default function ReviewPage() {
  const { message } = AntApp.useApp()
  const [pending, setPending] = useState([])
  const [reviewed, setReviewed] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.reviewQueue()
      setPending(r.pending)
      setReviewed(r.reviewed)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openReview = async (id) => {
    setOpenId(id)
    setNote('')
    setDetailLoading(true)
    try {
      const d = await api.reviewDetail(id)
      setDetail(d)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const decide = async (decision) => {
    if ((decision === 'reject' || decision === 'request_changes') && !note.trim()) {
      message.warning('驳回 / 要求修改时必须填写理由')
      return
    }
    setBusy(true)
    try {
      const r = await api.review(openId, { decision, note: note.trim(), reviewer: REVIEWER })
      const label = { approve: '已通过并上架', reject: '已驳回', request_changes: '已要求修改' }[decision]
      message.success(`${label}：${r.name}`)
      setOpenId(null)
      setDetail(null)
      load()
    } catch (e) {
      message.error(e.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">审核工作台</h1>
      <p className="page-sub">
        待审核事件 <Tag color="processing">{pending.length}</Tag> 条。审核通过上架后，用户订阅即由个人虾主动执行动作。
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin />
        </div>
      ) : pending.length === 0 ? (
        <Empty description="🎉 暂无待审核事件，队列已清空" />
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={pending}
          renderItem={(ev) => (
            <List.Item>
              <div
                className="event-card"
                style={{ cursor: 'pointer' }}
                onClick={() => openReview(ev.id)}
              >
                <div className="card-head">
                  <SourceIcon source={ev.source} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div className="card-name">{ev.name}</div>
                    <div className="card-id">{ev.id}</div>
                  </div>
                </div>
                <div className="card-desc">{ev.description}</div>
                <div className="card-foot">
                  <Space size={4} wrap>
                    <Tag color={SOURCE_COLORS[ev.source] || 'purple'}>{ev.source}</Tag>
                    {(ev.categoryLabels || []).slice(0, 2).map((c) => (
                      <Tag key={c} bordered={false}>{c}</Tag>
                    ))}
                  </Space>
                  <Tag color="processing">审核中</Tag>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}

      {reviewed.length > 0 && (
        <Collapse style={{ marginTop: 24 }} items={[
          {
            key: 'history',
            label: `已审核记录（${reviewed.length}）`,
            children: (
              <List
                size="small"
                dataSource={reviewed}
                renderItem={(ev) => (
                  <List.Item>
                    <Space>
                      <SourceIcon source={ev.source} size={26} />
                      <span style={{ fontWeight: 600 }}>{ev.name}</span>
                      <span className="card-id">{ev.id}</span>
                      <Tag color={(STATUS_META[ev.status] || STATUS_META.draft).color}>
                        {(STATUS_META[ev.status] || STATUS_META.draft).label}
                      </Tag>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
        ]} />
      )}

      <Drawer
        title={detail ? `审核 · ${detail.name}` : '审核详情'}
        width={600}
        open={!!openId}
        onClose={() => {
          setOpenId(null)
          setDetail(null)
        }}
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <>
            <Space align="center" size={12} style={{ marginBottom: 12 }}>
              <SourceIcon source={detail.source} size={44} />
              <div>
                <h3 style={{ margin: 0 }}>{detail.name}</h3>
                <div className="card-id">{detail.id}</div>
              </div>
            </Space>
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag color={SOURCE_COLORS[detail.source] || 'purple'}>{detail.source}</Tag>
              {(detail.categoryLabels || []).map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
              <Tag icon={<EditOutlined />}>{detail.author}</Tag>
            </Space>

            <p style={{ color: '#4b5563' }}>{detail.description}</p>

            <h3 className="section-label">事件说明</h3>
            <Markdown>{detail.detail}</Markdown>

            <h3 className="section-label">自动预检清单</h3>
            <List
              size="small"
              bordered
              dataSource={detail.checklist || []}
              renderItem={(it) => <CheckRow item={it} />}
            />

            <h3 className="section-label">Payload Schema</h3>
            <JsonBlock value={detail.schema} />
            <h3 className="section-label">触发示例</h3>
            {detail.examples?.map((ex, i) => (
              <JsonBlock key={i} value={ex} />
            ))}

            <h3 className="section-label">审核意见 / 理由</h3>
            <Input.TextArea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="通过可留空；驳回 / 要求修改必须填写理由，将反馈给开发者"
            />

            <Space style={{ marginTop: 16 }} wrap>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={busy}
                onClick={() => decide('approve')}
              >
                通过并上架
              </Button>
              <Button danger loading={busy} onClick={() => decide('reject')}>
                驳回
              </Button>
              <Button loading={busy} onClick={() => decide('request_changes')}>
                要求修改
              </Button>
            </Space>
          </>
        )}
      </Drawer>
    </div>
  )
}
