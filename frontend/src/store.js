// 浏览器端「后端」——把 FastAPI 后端的数据与逻辑整体搬进前端。
// 数据持久化在 localStorage，所有交互（订阅 / 提交 / 审核 / 重置）均为本地状态，
// 刷新、关闭页面后依然保留；但状态只存在当前浏览器，不会跨设备共享。
// 这让 Demo 可以纯静态部署到 GitHub Pages，别人点链接即可打开。

import { SEED_EVENTS } from './seedData.js'

export const DEMO_USER = 'demo_user'

// 给页面复用的字典（与后端 models.py 对齐）
export const CATEGORY_LABELS = {
  communication: '沟通',
  development: '开发',
  approval: '审批',
  monitoring: '监控',
  data: '数据',
}
export const SOURCE_COLORS = {
  飞书: 'blue',
  邮件: 'green',
  GitHub: 'default',
  运维: 'orange',
  自定义: 'purple',
}
export const STATUS_META = {
  active: { label: '已上架', color: 'success' },
  pending_review: { label: '审核中', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
  draft: { label: '草稿', color: 'default' },
}

const LS_EVENTS = 'am_events_v1'
const LS_SUBS = 'am_subs_v1'

const clone = (x) => JSON.parse(JSON.stringify(x))

function loadEvents() {
  try {
    const raw = localStorage.getItem(LS_EVENTS)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  const seed = clone(SEED_EVENTS)
  saveEvents(seed)
  return seed
}

function saveEvents(arr) {
  localStorage.setItem(LS_EVENTS, JSON.stringify(arr))
}

function loadSubs() {
  try {
    return JSON.parse(localStorage.getItem(LS_SUBS) || '[]')
  } catch (e) {
    return []
  }
}

function saveSubs(arr) {
  localStorage.setItem(LS_SUBS, JSON.stringify(arr))
}

function getEventRaw(id) {
  return loadEvents().find((e) => e.id === id) || null
}

// 派生字段（与后端 _decorate 对齐）
function decorate(doc, subs) {
  const out = { ...doc }
  const extra = subs.includes(doc.id) ? 1 : 0
  out.subscriberCount = (doc.subscriberCount || 0) + extra
  out.subscribed = subs.includes(doc.id)
  out.sourceColor = SOURCE_COLORS[doc.source] || 'purple'
  out.categoryLabels = (doc.categories || [doc.category]).filter(Boolean).map(
    (c) => CATEGORY_LABELS[c] || c,
  )
  return out
}

// 相关事件推荐（与后端 _related 对齐）
function related(doc, limit = 3) {
  const subs = loadSubs()
  const pool = loadEvents().filter((e) => e.status === 'active' && e.id !== doc.id)
  const sameCat = pool.filter((e) => e.category === doc.category)
  const sameSrc = pool.filter((e) => e.source === doc.source && !sameCat.includes(e))
  const rest = pool.filter((e) => !sameCat.includes(e) && !sameSrc.includes(e))
  rest.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0))
  return (sameCat.concat(sameSrc, rest).slice(0, limit)).map((e) => decorate(e, subs))
}

// 审核自动预检（与后端 _auto_check 对齐）
const REVIEW_CHECKLIST = [
  { key: 'description', label: '事件描述清晰完整' },
  { key: 'schema', label: 'Payload Schema 规范' },
  { key: 'examples', label: '触发示例有效' },
  { key: 'safety', label: '不含敏感 / 违规内容' },
  { key: 'unique', label: '事件 ID 无冲突' },
]
const SENSITIVE_WORDS = ['password', 'passwd', 'token', 'secret', 'api_key', 'apikey', '身份证', '银行卡', '私钥']

function autoCheck(doc) {
  const blob = JSON.stringify(doc).toLowerCase()
  const schemaProps = (doc.schema || {}).properties || {}
  const checks = {
    description: (doc.description || '').length >= 6 && (doc.detail || '').length >= 20,
    schema: !!schemaProps && Object.keys(schemaProps).length > 0,
    examples: Array.isArray(doc.examples) && doc.examples.length > 0,
    safety: !SENSITIVE_WORDS.some((w) => blob.includes(w)),
    unique: String(doc.id || '').split('.').length >= 2,
  }
  return REVIEW_CHECKLIST.map((c) => ({ ...c, suggested: !!checks[c.key] }))
}

// --------------------------------------------------------------------------
// 统计
// --------------------------------------------------------------------------
export function getStats() {
  const events = loadEvents()
  const subs = loadSubs()
  const active = events.filter((e) => e.status === 'active')
  const byStatus = {}
  events.forEach((e) => {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1
  })
  return {
    byStatus,
    activeCount: byStatus.active || 0,
    pendingCount: byStatus.pending_review || 0,
    totalSubscribers: active.reduce((s, e) => s + (e.subscriberCount || 0), 0),
    mySubscriptions: subs.length,
  }
}

// --------------------------------------------------------------------------
// 事件列表 / 详情
// --------------------------------------------------------------------------
export function listEvents({ status, category, source, author, q, includeAll } = {}) {
  const subs = loadSubs()
  let docs = loadEvents()
  if (status) {
    docs = docs.filter((e) => e.status === status)
  } else if (!includeAll) {
    docs = docs.filter((e) => e.status === 'active')
  }
  if (category) docs = docs.filter((e) => (e.categories || [e.category]).includes(category))
  if (source) docs = docs.filter((e) => e.source === source)
  if (author) docs = docs.filter((e) => e.author === author)
  if (q) {
    const kw = String(q).trim().toLowerCase()
    docs = docs.filter((e) =>
      `${e.name} ${e.id} ${e.description}`.toLowerCase().includes(kw),
    )
  }
  const items = docs.map((d) => decorate(d, subs))
  items.sort((a, b) => b.subscriberCount - a.subscriberCount)
  return { items, total: items.length }
}

export function getEvent(id) {
  const doc = getEventRaw(id)
  if (!doc) return null
  const subs = loadSubs()
  const out = decorate(doc, subs)
  out.related = related(doc)
  return out
}

// --------------------------------------------------------------------------
// 订阅
// --------------------------------------------------------------------------
export function mySubscriptions() {
  const subs = loadSubs()
  const items = []
  subs.forEach((eventId) => {
    const ev = getEventRaw(eventId)
    if (ev) items.push({ id: `sub_${eventId}`, userId: DEMO_USER, eventId, subscribedAt: '', event: decorate(ev, subs) })
  })
  return { items, total: items.length }
}

export function subscribe(eventId) {
  const ev = getEventRaw(eventId)
  if (!ev) throw new Error('事件不存在')
  if (ev.status !== 'active') throw new Error('该事件尚未上架，无法订阅')
  const subs = loadSubs()
  if (!subs.includes(eventId)) {
    subs.push(eventId)
    saveSubs(subs)
  }
  return { subscribed: true, event: decorate(ev, subs) }
}

export function unsubscribe(eventId) {
  const subs = loadSubs()
  const next = subs.filter((x) => x !== eventId)
  saveSubs(next)
  const ev = getEventRaw(eventId)
  return { subscribed: false, event: ev ? decorate(ev, next) : null }
}

// --------------------------------------------------------------------------
// 开发者
// --------------------------------------------------------------------------
export function devEvents(author) {
  const subs = loadSubs()
  const docs = loadEvents().filter((e) => e.author === author)
  const items = docs.map((d) => decorate(d, subs))
  return { items, total: items.length }
}

export function submitEvent(payload) {
  const events = loadEvents()
  const existing = events.find((e) => e.id === payload.id)
  if (existing && existing.status !== 'draft') {
    throw new Error(`事件 ID「${payload.id}」已存在，请更换`)
  }
  const categories = payload.categories && payload.categories.length ? payload.categories : ['communication']
  const doc = {
    id: payload.id,
    name: payload.name,
    source: payload.source,
    category: categories[0],
    categories,
    description: payload.description,
    detail: payload.detail || '',
    schema: payload.schema_,
    examples: payload.examples,
    scenarios: payload.scenarios,
    subscriberCount: 0,
    status: 'pending_review',
    author: payload.author,
    authorContact: payload.author_contact,
    rejectReason: null,
    reviewNote: null,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  }
  if (existing) {
    const idx = events.findIndex((e) => e.id === payload.id)
    events[idx] = doc
  } else {
    events.push(doc)
  }
  saveEvents(events)
  return decorate(doc, loadSubs())
}

export function resubmitEvent(id, payload) {
  const events = loadEvents()
  const idx = events.findIndex((e) => e.id === id)
  if (idx < 0) throw new Error('事件不存在')
  const categories = payload.categories && payload.categories.length ? payload.categories : events[idx].categories || ['communication']
  events[idx] = {
    ...events[idx],
    name: payload.name,
    source: payload.source,
    category: categories[0],
    categories,
    description: payload.description,
    detail: payload.detail || '',
    schema: payload.schema_,
    examples: payload.examples,
    scenarios: payload.scenarios,
    authorContact: payload.author_contact || events[idx].authorContact || '',
    status: 'pending_review',
    rejectReason: null,
    reviewNote: null,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  }
  saveEvents(events)
  return decorate(events[idx], loadSubs())
}

export function deleteEvent(id) {
  const events = loadEvents()
  const ev = events.find((e) => e.id === id)
  if (!ev) throw new Error('事件不存在')
  if (ev.author === '平台官方') throw new Error('官方预置事件不可删除')
  saveEvents(events.filter((e) => e.id !== id))
  return { deleted: true, id }
}

// --------------------------------------------------------------------------
// 审核
// --------------------------------------------------------------------------
export function reviewQueue() {
  const subs = loadSubs()
  const events = loadEvents()
  const pending = events
    .filter((e) => e.status === 'pending_review')
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))
  const reviewed = events
    .filter((e) => ['active', 'rejected', 'draft'].includes(e.status) && e.reviewedAt)
    .sort((a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')))
  return {
    pending: pending.map((e) => ({ ...decorate(e, subs), checklist: autoCheck(e) })),
    reviewed: reviewed.map((e) => decorate(e, subs)),
    pendingCount: pending.length,
    checklist: REVIEW_CHECKLIST,
  }
}

export function reviewDetail(id) {
  const ev = getEventRaw(id)
  if (!ev) throw new Error('事件不存在')
  const subs = loadSubs()
  const out = decorate(ev, subs)
  out.checklist = autoCheck(ev)
  out.idConflict = false
  return out
}

export function review(id, action) {
  const events = loadEvents()
  const idx = events.findIndex((e) => e.id === id)
  if (idx < 0) throw new Error('事件不存在')
  const { decision, note } = action
  if ((decision === 'reject' || decision === 'request_changes') && !(note || '').trim()) {
    throw new Error('驳回 / 要求修改时必须填写理由')
  }
  const mapping = { approve: 'active', reject: 'rejected', request_changes: 'draft' }
  events[idx] = {
    ...events[idx],
    status: mapping[decision],
    reviewedAt: new Date().toISOString(),
    rejectReason: decision === 'reject' ? note : null,
    reviewNote: decision === 'request_changes' ? note : events[idx].reviewNote || note || null,
  }
  saveEvents(events)
  return decorate(events[idx], loadSubs())
}

// --------------------------------------------------------------------------
// 重置
// --------------------------------------------------------------------------
export function resetDemo() {
  localStorage.removeItem(LS_EVENTS)
  localStorage.removeItem(LS_SUBS)
  const seed = clone(SEED_EVENTS)
  saveEvents(seed)
  return { reset: true, events: seed.length }
}
