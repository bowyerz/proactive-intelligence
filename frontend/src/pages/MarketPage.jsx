import { useEffect, useMemo, useRef, useState } from 'react'
import {
  App as AntApp, Button, Card, Col, Collapse, Empty, Input, Modal, Row, Select, Space, Spin, Statistic, Tag,
  Steps, message,
} from 'antd'
import {
  ArrowLeftOutlined, CheckOutlined, PlusOutlined,
  ShopOutlined, ClockCircleOutlined, TeamOutlined, AppstoreOutlined,
  MessageOutlined, CodeOutlined, CheckSquareOutlined, AlertOutlined, DatabaseOutlined,
  SearchOutlined, ThunderboltOutlined, RobotOutlined, BellOutlined,
} from '@ant-design/icons'
import { api, CATEGORY_LABELS, SOURCE_COLORS } from '../api.js'
import { BRAND } from '../brand.js'
import SourceIcon from '../components/SourceIcon.jsx'
import Markdown from '../components/Markdown.jsx'
import JsonBlock from '../components/JsonBlock.jsx'

const CAT_ICONS = {
  communication: <MessageOutlined />,
  development: <CodeOutlined />,
  approval: <CheckSquareOutlined />,
  monitoring: <AlertOutlined />,
  data: <DatabaseOutlined />,
}

// 「个人虾会主动做的动作」 — 根据事件分类推导，让主动智能可被直观感知
function deriveActions(ev) {
  const base = {
    communication: ['结合上下文为你起草回复草稿', '把关键信息摘要推送到收件箱'],
    development: ['在 PR / Issue 下自动评论并 @ 相关人', '创建关联任务卡片并指派负责人'],
    approval: ['汇总审批要点生成一页纸摘要', '按你的习惯预填审批意见，等你确认'],
    monitoring: ['拉起应急群并同步告警详情', '创建工单并指派值班人'],
    data: ['生成异常数据看板', '推送根因分析给负责人'],
  }
  const cats = ev?.categories || (ev?.category ? [ev.category] : []) || []
  const list = cats.map((c) => base[c]).filter(Boolean).flat()
  const unique = [...new Set(list)]
  return unique.length ? unique : ['收到事件后主动评估并通知你']
}

// 「什么时候会触发」 — 用 plain-language 描述，把后端字段翻译成给用户看的说法
function deriveTrigger(ev) {
  const src = ev?.source || '数据源'
  const cats = ev?.categories || (ev?.category ? [ev.category] : []) || []
  const verbByCat = {
    communication: '收到新消息时',
    development: '代码仓库有动静时',
    approval: '收到新的审批请求时',
    monitoring: '系统出现异常时',
    data: '数据出现异常波动时',
  }
  const v = cats.map((c) => verbByCat[c]).filter(Boolean)[0] || '事件一发生'
  return `${v}，来自「${src}」。无需你手动盯着，触发即响应。`
}

// 事件卡片：用户侧只看得到 name + 描述 + 来源 + 「龙虾会主动……」一句话
function EventCard({ ev, onOpen }) {
  const actions = deriveActions(ev)
  return (
    <div className="event-card" onClick={() => onOpen(ev.id)}>
      <div className="card-head">
        <SourceIcon source={ev.source} size={42} />
        <div style={{ minWidth: 0 }}>
          <div className="card-name">{ev.name}</div>
          <div className="card-source">
            <Tag color={SOURCE_COLORS[ev.source] || 'purple'} style={{ marginRight: 0 }}>
              {ev.source}
            </Tag>
          </div>
        </div>
      </div>
      <div className="card-desc">{ev.description}</div>
      <div className="card-actions-preview">
        <RobotOutlined style={{ color: '#fa541c' }} />
        <span>龙虾会主动：</span>
        <span className="cap-line">{actions[0]}</span>
      </div>
    </div>
  )
}

export default function MarketPage() {
  const { message } = AntApp.useApp()
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState(undefined)
  const [source, setSource] = useState(undefined)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [simOpen, setSimOpen] = useState(false)
  const [simStep, setSimStep] = useState(0)
  const simTimers = useRef([])

  const load = async () => {
    setLoading(true)
    try {
      const [ev, st] = await Promise.all([api.listEvents(), api.stats()])
      setEvents(ev.items)
      setStats(st)
    } catch (e) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => () => simTimers.current.forEach(clearTimeout), [])

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return events.filter((e) => {
      if (category && !(e.categories || [e.category]).includes(category)) return false
      if (source && e.source !== source) return false
      if (kw && !(`${e.name} ${e.id} ${e.description}`.toLowerCase().includes(kw))) return false
      return true
    })
  }, [events, q, category, source])

  const categoryStats = useMemo(() => {
    const counts = {}
    events.forEach((e) => {
      ;(e.categories || [e.category]).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1
      })
    })
    return Object.entries(CATEGORY_LABELS)
      .map(([value, label]) => ({ value, label, count: counts[value] || 0 }))
      .filter((c) => c.count > 0)
  }, [events])

  const openDetail = async (id) => {
    setSelected(id)
    setDetailLoading(true)
    try {
      const d = await api.getEvent(id)
      setDetail(d)
    } catch (e) {
      message.error(e.message || '加载详情失败')
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleSub = async () => {
    if (!detail) return
    setBusy(true)
    try {
      if (detail.subscribed) {
        await api.unsubscribe(detail.id)
        message.success('已取消订阅')
      } else {
        await api.subscribe(detail.id)
        message.success('订阅成功，事件触发时个人龙虾会主动替你执行动作 🦞')
      }
      const [d, list] = await Promise.all([api.getEvent(detail.id), api.listEvents()])
      setDetail(d)
      setEvents(list.items)
    } catch (e) {
      message.error(e.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const openSim = () => {
    setSimOpen(true)
    setSimStep(0)
    simTimers.current.forEach(clearTimeout)
    simTimers.current = [1, 2, 3, 4].map((s) => setTimeout(() => setSimStep(s), s * 700))
  }

  const closeSim = () => {
    setSimOpen(false)
    simTimers.current.forEach(clearTimeout)
  }

  if (selected && detail) {
    const actions = deriveActions(detail)
    const trigger = deriveTrigger(detail)
    return (
      <div>
        <Button
          className="detail-back"
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            setSelected(null)
            setDetail(null)
          }}
        >
          返回事件市场
        </Button>

        <div className="detail-layout">
          <div className="detail-main">
            <Space align="center" size={14} style={{ marginBottom: 12 }}>
              <SourceIcon source={detail.source} size={48} />
              <div>
                <h2 style={{ margin: 0 }}>{detail.name}</h2>
                <Space size={6} style={{ marginTop: 6 }} wrap>
                  <Tag color={SOURCE_COLORS[detail.source] || 'purple'}>{detail.source}</Tag>
                  {(detail.categoryLabels || []).map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </Space>
              </div>
            </Space>

            <p style={{ color: '#4b5563' }}>{detail.description}</p>

            {/* 用户侧最重要的两块：什么时候触发 + 龙虾会主动做什么 */}
            <div className="user-friendly-block trigger-block">
              <div className="ufb-title">
                <BellOutlined /> 什么时候会触发
              </div>
              <div className="ufb-body">{trigger}</div>
            </div>

            <div className="user-friendly-block action-block">
              <div className="ufb-title">
                <RobotOutlined /> 龙虾会主动替你做的动作
              </div>
              <ul className="ufb-actions">
                {actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>

            {detail.scenarios?.length > 0 && (
              <>
                <h3 className="section-label">典型场景</h3>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {detail.scenarios.map((s, i) => (
                    <Tag key={i} color="volcano" bordered={false}>
                      {s}
                    </Tag>
                  ))}
                </Space>
              </>
            )}

            {detail.detail && (
              <>
                <h3 className="section-label">更多说明</h3>
                <Markdown>{detail.detail}</Markdown>
              </>
            )}

            {/* 开发者技术细节：默认收起，给好奇的人看 */}
            <Collapse
              ghost
              style={{ marginTop: 16 }}
              items={[
                {
                  key: 'dev',
                  label: (
                    <span style={{ color: '#6b7280' }}>
                      <CodeOutlined /> 开发者技术细节（Payload Schema / 示例，可选）
                    </span>
                  ),
                  children: (
                    <>
                      <h4 className="dev-section">Payload Schema（JSON Schema）</h4>
                      <JsonBlock value={detail.schema} />
                      <h4 className="dev-section">触发示例 Payload</h4>
                      {detail.examples?.map((ex, i) => (
                        <JsonBlock key={i} value={ex} />
                      ))}
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div className="detail-side">
            <div className="side-block">
              <Button
                block
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={openSim}
                style={{ marginBottom: 10 }}
              >
                ⚡ 先看一次它怎么工作
              </Button>
              <Button
                type={detail.subscribed ? 'default' : 'primary'}
                danger={detail.subscribed}
                block
                size="large"
                icon={detail.subscribed ? <CheckOutlined /> : <PlusOutlined />}
                loading={busy}
                onClick={toggleSub}
              >
                {detail.subscribed ? '已开启 · 点击取消' : '让龙虾主动处理'}
              </Button>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
                开启后，事件一发生，个人龙虾就会按上面列表主动替你执行 🦞
              </div>
            </div>

            <div className="side-block">
              <p className="section-label">你可能还会想开启</p>
              {(detail.related || []).length === 0 && (
                <span style={{ color: '#9ca3af', fontSize: 13 }}>暂无相关</span>
              )}
              {(detail.related || []).map((r) => (
                <div key={r.id} className="related-item" onClick={() => openDetail(r.id)}>
                  <SourceIcon source={r.source} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div className="ri-name">{r.name}</div>
                    <div className="ri-source">{r.source}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="side-block">
              <p className="section-label">提供方</p>
              <div style={{ fontSize: 13 }}>
                <div>{detail.author}</div>
              </div>
            </div>
          </div>
        </div>

        <Modal title="⚡ 看一次它的工作过程" open={simOpen} onCancel={closeSim} footer={null} width={540}>
          <Steps
            direction="vertical"
            current={simStep}
            items={[
              {
                title: '事件触发',
                description: `来自「${detail.source}」的事件到达：${detail.name}`,
              },
              {
                title: '个人龙虾理解意图',
                description:
                  simStep >= 2
                    ? '已解析事件语义、你的偏好与历史上下文，决定如何行动。'
                    : <span className="sim-thinking">分析中…</span>,
              },
              {
                title: '主动执行',
                description:
                  simStep >= 3 ? (
                    <ul className="sim-actions">
                      {actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    '准备执行…'
                  ),
              },
              {
                title: '完成',
                description:
                  simStep >= 4 ? (
                    <span className="sim-done">动作已执行，结果已通知你 🦞</span>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <div className="hero-concept">
        <div>
          <div className="hc-title">🦞 {BRAND.name}</div>
          <div className="hc-tag">{BRAND.tagline}</div>
          <div className="hc-sub">{BRAND.oneLiner}</div>
        </div>
        <div className="hc-flow">
          <span className="hc-node">📡 触发</span>
          <span className="hc-arrow">⚡</span>
          <span className="hc-node">🦞 龙虾理解</span>
          <span className="hc-arrow">→</span>
          <span className="hc-node">✅ 先你一步</span>
        </div>
      </div>

      <h1 className="page-title">{BRAND.slogan}</h1>
      <p className="page-sub">
        打开下面这些你关心的事，剩下的交给个人龙虾——事件一触发，它就主动替你执行。
      </p>

      {stats && (
        <Row gutter={[16, 16]} className="stat-row">
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="已可用"
                value={stats.activeCount}
                prefix={
                  <ShopOutlined
                    className="stat-icon"
                    style={{ background: '#fff3ec', color: '#fa541c' }}
                  />
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="待上架"
                value={stats.pendingCount}
                prefix={
                  <ClockCircleOutlined
                    className="stat-icon"
                    style={{ background: '#fff7e6', color: '#fa8c16' }}
                  />
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="正在用"
                value={stats.totalSubscribers}
                prefix={
                  <TeamOutlined
                    className="stat-icon"
                    style={{ background: '#fff3ec', color: '#fa541c' }}
                  />
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="我已开启"
                value={stats.mySubscriptions}
                prefix={
                  <RobotOutlined
                    className="stat-icon"
                    style={{ background: '#fff3ec', color: '#fa541c' }}
                  />
                }
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={12} align="middle" className="filter-bar" wrap>
        <Col flex="1 1 320px" style={{ minWidth: 240 }}>
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="搜你想让龙虾主动做的事"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
          />
        </Col>
        <Col>
          <Select
            size="large"
            placeholder="全部分类"
            allowClear
            style={{ width: 160 }}
            value={category}
            onChange={setCategory}
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Col>
        <Col>
          <Select
            size="large"
            placeholder="全部来源"
            allowClear
            style={{ width: 160 }}
            value={source}
            onChange={setSource}
            options={Object.keys(SOURCE_COLORS).map((s) => ({ value: s, label: s }))}
          />
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <Empty description="没有匹配的事件" />
        </Card>
      ) : (
        <div className="market-grid">
          {filtered.map((ev) => (
            <EventCard key={ev.id} ev={ev} onOpen={openDetail} />
          ))}
        </div>
      )}

      {categoryStats.length > 0 && (
        <Card
          className="category-section"
          title={
            <Space>
              <AppstoreOutlined style={{ color: '#fa541c' }} />
              <span style={{ fontWeight: 600 }}>按场景快速浏览</span>
              <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 'normal' }}>
                点一下即可只看你关心的
              </span>
            </Space>
          }
        >
          <Row gutter={[12, 12]}>
            {categoryStats.map((cat) => (
              <Col key={cat.value} xs={12} sm={8} md={6} lg={4}>
                <div
                  className={`cat-tile ${category === cat.value ? 'active' : ''}`}
                  onClick={() => setCategory(category === cat.value ? undefined : cat.value)}
                >
                  <span className="cat-icon">{CAT_ICONS[cat.value]}</span>
                  <div>
                    <div className="cat-name">{cat.label}</div>
                    <div className="cat-count">{cat.count} 个</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  )
}
