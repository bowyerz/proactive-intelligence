// 浏览器端「后端」——纯静态、可在 GitHub Pages 部署。
// 数据持久化在 localStorage，所有交互为本地状态。
//
// =================================================================
// v7 数据模型：用户端极简 + 事件触发
// =================================================================
//
// 用户看到的是「事件任务」——每个任务绑定在 2 个固定事件之一下
// （会议开始前 30 分钟 / 会议结束）。事件一旦触发（来自飞书日历），
// 龙虾就自动执行该任务下的动作。用户端没有「定时 / cron」概念，全部由事件驱动。
//
// 系统事件（固定 2 个，不允许开发者改）：
//   EVENTS               飞书日历来的 2 个原生事件（会议开始前 30 分钟 / 会议结束）
//
// 开发者可创建（管理后台审核单位，**仅事件本身**，不再带任何任务）：
//   PROPOSED_EVENTS      开发者提案的新事件（纯元数据：名称/来源/描述/清单/图标/配色）
//                        状态：pending_review / active / rejected
//
// 用户订阅层（v6 的核心简化）：
//   SUBSCRIPTIONS        每个订阅挂在一个 eventId 下，订阅自带一组用户自己定义的任务 tasks[]
//                        字段新增 frequencyText（给用户展示的频率文，如「每天 13:01」）和
//                        runningSince（点击「立即执行」后未过 30s 视为执行中）
//                        提交即启用（status='active', enabled=true），不再走任何审核
//   RUNS                 订阅启用后，每次事件触发产出一条执行记录
//
// 关系：
//   EVENTS          1 → N  SUBSCRIPTIONS
//   PROPOSED_EVENTS (active 后) 也作为可订阅的事件来源
//   SUBSCRIPTION    通过 id 反查 RUNS

const LS_PROPOSED_EVENTS = 'am_proposed_events_v7'
const LS_SUBSCRIPTIONS = 'am_subscriptions_v7'
const LS_RUNS = 'am_runs_v7'

export const DEMO_USER = 'demo_user'

// ============== 元数据（页面渲染标签用）==============

export const SUB_STATUS_META = {
  active: { label: '已启用', color: 'success' },
  pending_review: { label: '待审核', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
}

export const PROPOSED_EVENT_STATUS_META = {
  active: { label: '已上架', color: 'success' },
  pending_review: { label: '审核中', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
}

// ============== 系统事件（固定 2 个，对应产品认知）==============

export const EVENTS = [
  {
    id: 'meeting-start-30min',
    name: '会议开始前 30 分钟',
    icon: 'ClockCircleOutlined',
    bg: '#fff7e6',
    color: '#d48806',
    source: '飞书日历',
    desc: '每个会议开始前 30 分钟触发，来自飞书日历',
    checklist: '梳理议程 · 拉历史议题 · 准备要点',
    systemEvent: true,
  },
  {
    id: 'meeting-end',
    name: '会议结束',
    icon: 'FlagOutlined',
    bg: '#e6fffb',
    color: '#08979c',
    source: '飞书日历',
    desc: '会议结束时触发，来自飞书日历',
    checklist: '纪要 · 行动项 · 收尾通知',
    systemEvent: true,
  },
]

export const EVENT_MAP = Object.fromEntries(EVENTS.map((e) => [e.id, e]))

// ============== Seed 数据 ==============

// 开发者提案的 1 条新事件（纯元数据，没有任务）
const SEED_PROPOSED_EVENTS = [
  {
    id: 'pe_weekly_report_due',
    name: '周报截止前 2 小时',
    icon: 'ThunderboltOutlined',
    bg: '#f0f5ff',
    color: '#2f54eb',
    source: '飞书 OKR',
    desc: '每周五 17:00 周报截止前 2 小时触发',
    checklist: '汇总待办 · 整理进展 · 准备周报',
    proposer: '张开发',
    submittedAt: '2026-08-09T10:00:00Z',
    reviewedAt: null,
    reviewer: null,
    rejectReason: null,
    status: 'pending_review',
  },
]

// 用户侧的订阅：任务完全用户自建（每个订阅自带一组用户定义的 tasks[]）
// 订阅挂在 2 个固定事件之一下（会议开始前30分钟 / 会议结束）；事件触发 → 龙虾自动执行。
// v7 SEED：5 条示例「事件触发任务」，分别绑定到两个事件。
const SEED_SUBSCRIPTIONS = [
  {
    id: 'sub_meeting_start_points',
    eventId: 'meeting-start-30min',
    name: '会议前·开场要点',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_sp_1',
        name: '生成我的开场要点',
        description: '开会前先过一遍要点',
        actionPreview: '基于参会人背景 + 历史议题，整理 3 条要点提醒我',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'sub_meeting_start_agenda',
    eventId: 'meeting-start-30min',
    name: '会议前·议程预读',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_sa_1',
        name: '拉取历史议题与参会人背景',
        description: '会前把议程与背景读一遍',
        actionPreview: '读取本次会议议程 + 参会人历史会议，输出背景速览',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'sub_meeting_end_minutes',
    eventId: 'meeting-end',
    name: '会议后·自动纪要',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_em_1',
        name: '整理会议纪要',
        description: '会后第一时间出纪要',
        actionPreview: '基于会议录音/笔记自动生成议题、结论、待办的结构化纪要',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-03T10:00:00Z',
    updatedAt: '2026-08-03T10:00:00Z',
  },
  {
    id: 'sub_meeting_end_actions',
    eventId: 'meeting-end',
    name: '会议后·行动项归档',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_ea_1',
        name: '提取行动项入我的待办',
        description: '把会议待办归到我名下',
        actionPreview: '提取所有 action item 的 owner + deadline，自动写入我的待办',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-04T10:00:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'sub_meeting_end_weekly',
    eventId: 'meeting-end',
    name: '会议后·周报素材',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_ew_1',
        name: '汇总本周会议进展',
        description: '为周报自动攒素材',
        actionPreview: '汇总本周所有会议的关键结论，生成周报草稿素材',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
]

// 各订阅的执行历史
// v7：为「会议后·自动纪要」准备 10 条样本执行（匹配详情页截图的 100% / 197s / 60K 概览）
const SEED_RUNS = [
  { id: 'run_em_1', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-13T11:10:05Z', status: 'success', tokens: 64719, durationSec: 156, summary: '已执行：整理会议纪要' },
  { id: 'run_em_2', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-12T11:09:15Z', status: 'success', tokens: 58246, durationSec: 106, summary: '已执行：整理会议纪要' },
  { id: 'run_em_3', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-11T11:10:20Z', status: 'success', tokens: 62379, durationSec: 171, summary: '已执行：整理会议纪要' },
  { id: 'run_em_4', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-10T11:57:09Z', status: 'success', tokens: 56059, durationSec: 69, summary: '已执行：整理会议纪要' },
  { id: 'run_em_5', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-09T11:57:20Z', status: 'success', tokens: 55058, durationSec: 40, summary: '已执行：整理会议纪要' },
  { id: 'run_em_6', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-08T11:57:57Z', status: 'success', tokens: 62406, durationSec: 88, summary: '已执行：整理会议纪要' },
  { id: 'run_em_7', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-07T11:59:14Z', status: 'success', tokens: 61746, durationSec: 165, summary: '已执行：整理会议纪要' },
  { id: 'run_em_8', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-06T12:01:11Z', status: 'success', tokens: 63021, durationSec: 210, summary: '已执行：整理会议纪要' },
  { id: 'run_em_9', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-05T11:55:48Z', status: 'success', tokens: 60987, durationSec: 250, summary: '已执行：整理会议纪要' },
  { id: 'run_em_10', ruleId: 'sub_meeting_end_minutes', timestamp: '2026-08-04T11:56:02Z', status: 'success', tokens: 59832, durationSec: 180, summary: '已执行：整理会议纪要' },
  // 其他订阅的少量历史
  { id: 'run_sp_1', ruleId: 'sub_meeting_start_points', timestamp: '2026-08-13T09:30:00Z', status: 'success', tokens: 30000, durationSec: 60, summary: '已执行：生成开场要点' },
  { id: 'run_sp_2', ruleId: 'sub_meeting_start_points', timestamp: '2026-08-11T09:30:00Z', status: 'success', tokens: 28500, durationSec: 55, summary: '已执行：生成开场要点' },
  { id: 'run_aa_1', ruleId: 'sub_meeting_end_actions', timestamp: '2026-08-13T15:00:00Z', status: 'success', tokens: 41200, durationSec: 90, summary: '已执行：提取行动项' },
  { id: 'run_aa_2', ruleId: 'sub_meeting_end_actions', timestamp: '2026-08-10T15:00:00Z', status: 'success', tokens: 36800, durationSec: 80, summary: '已执行：提取行动项' },
  { id: 'run_aa_3', ruleId: 'sub_meeting_end_actions', timestamp: '2026-08-07T15:00:00Z', status: 'success', tokens: 38900, durationSec: 85, summary: '已执行：提取行动项' },
  { id: 'run_ew_1', ruleId: 'sub_meeting_end_weekly', timestamp: '2026-08-08T17:00:00Z', status: 'success', tokens: 45000, durationSec: 120, summary: '已执行：汇总周报素材' },
]

// ============== 工具 ==============

function clone(x) { return JSON.parse(JSON.stringify(x)) }

function loadOrInit(key, seed) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  const fresh = clone(seed)
  localStorage.setItem(key, JSON.stringify(fresh))
  return fresh
}

// 一次性迁移：把更早版本的 LS key 收尾 / 升级
// v4 → v5：剥 bundledTasks；v5 → v6：seed 改了，强制刷新 subs + runs
function migrateFromV4() {
  // v4 → v5：剥 bundledTasks；v5/v6 → v7：seed 已改，旧数据直接丢弃重新初始化
  const v4pe = localStorage.getItem('am_proposed_events_v4')
  if (v4pe && !localStorage.getItem(LS_PROPOSED_EVENTS)) {
    try {
      const arr = JSON.parse(v4pe).map((pe) => {
        const { bundledTasks, ...rest } = pe
        return rest
      })
      localStorage.setItem(LS_PROPOSED_EVENTS, JSON.stringify(arr))
      localStorage.removeItem('am_proposed_events_v4')
    } catch (e) { /* ignore */ }
  }
  ;['am_proposed_events_v4', 'am_subscriptions_v4', 'am_preset_tasks_v4', 'am_runs_v4',
    'am_subscriptions_v5', 'am_runs_v5',
    'am_proposed_events_v6', 'am_subscriptions_v6', 'am_runs_v6'].forEach((k) => localStorage.removeItem(k))
}

function loadProposedEvents() {
  migrateFromV4()
  return loadOrInit(LS_PROPOSED_EVENTS, SEED_PROPOSED_EVENTS)
}
function saveProposedEvents(arr) { localStorage.setItem(LS_PROPOSED_EVENTS, JSON.stringify(arr)) }
function loadSubscriptions() {
  migrateFromV4()
  return loadOrInit(LS_SUBSCRIPTIONS, SEED_SUBSCRIPTIONS)
}
function saveSubscriptions(arr) { localStorage.setItem(LS_SUBSCRIPTIONS, JSON.stringify(arr)) }
function loadRuns() { return loadOrInit(LS_RUNS, SEED_RUNS) }
function saveRuns(arr) { localStorage.setItem(LS_RUNS, JSON.stringify(arr)) }

// 装饰：subscription 附上 event 元数据 + 状态 + 计算字段（lastRunAt / isRunning）
function decorateSubscription(sub) {
  const ev = EVENT_MAP[sub.eventId] || loadProposedEvents().find((e) => e.id === sub.eventId)
  // 该订阅最近一次执行
  const runs = loadRuns().filter((r) => r.ruleId === sub.id)
  const lastRun = runs
    .slice()
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0] || null
  // v6：runningSince 在 60s 内视为「执行中」（用于「当前任务」Tab）
  const runningSince = sub.runningSince ? String(sub.runningSince) : null
  const isRunning = runningSince ? (Date.now() - new Date(runningSince).getTime() < 60 * 1000) : false
  return {
    ...sub,
    eventName: ev?.name || sub.eventId,
    eventIcon: ev?.icon || 'ClockCircleOutlined',
    eventBg: ev?.bg || '#f3f4f6',
    eventColor: ev?.color || '#6b7280',
    eventDesc: ev?.desc || '',
    eventSource: ev?.source || '',
    eventChecklist: ev?.checklist || '',
    statusMeta: SUB_STATUS_META[sub.status] || SUB_STATUS_META.active,
    taskCount: (sub.tasks || []).length,
    // 给 UI 用的便利字段
    triggerText: ev?.name || '未设置',
    lastRunAt: lastRun ? lastRun.timestamp : null,
    lastRunStatus: lastRun ? lastRun.status : null,
    runningSince,
    isRunning,
  }
}

function decorateProposedEvent(pe) {
  return {
    ...pe,
    statusMeta: PROPOSED_EVENT_STATUS_META[pe.status] || PROPOSED_EVENT_STATUS_META.pending_review,
  }
}

// ============== 事件（系统固定）==============

export function listEvents() {
  return clone(EVENTS)
}

export function getEvent(id) {
  const e = EVENTS.find((x) => x.id === id)
  return e ? clone(e) : null
}

// ============== 开发者提案的事件（管理后台审核单位）==============

// 「事件市场」= 系统事件 + 已上架的开发者提案事件
export function listMarketEvents() {
  const systemEvents = clone(EVENTS)
  const proposedActive = loadProposedEvents()
    .filter((pe) => pe.status === 'active')
    .map((pe) => ({ ...clone(pe), systemEvent: false }))
  return [...systemEvents, ...proposedActive]
}

export function listProposedEvents({ status, proposer } = {}) {
  let arr = loadProposedEvents()
  if (status) arr = arr.filter((pe) => pe.status === status)
  if (proposer) arr = arr.filter((pe) => pe.proposer === proposer)
  return {
    items: arr.map(decorateProposedEvent).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))),
    total: arr.length,
  }
}

export function getProposedEvent(id) {
  const pe = loadProposedEvents().find((x) => x.id === id)
  return pe ? decorateProposedEvent(pe) : null
}

// 开发者提交一个新事件提案——**只提交事件元数据**，不带任何任务
export function submitProposedEvent(payload) {
  const arr = loadProposedEvents()
  if (arr.find((pe) => pe.id === payload.id)) {
    throw new Error(`事件提案 ID「${payload.id}」已存在`)
  }
  if (!payload.name || !payload.name.trim()) throw new Error('请填写事件名')
  const doc = {
    id: payload.id,
    name: payload.name.trim(),
    icon: payload.icon || 'ThunderboltOutlined',
    bg: payload.bg || '#f0f5ff',
    color: payload.color || '#2f54eb',
    source: (payload.source || '').trim() || '自定义来源',
    desc: (payload.desc || '').trim(),
    checklist: (payload.checklist || '').trim(),
    proposer: payload.proposer || '张开发',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewer: null,
    rejectReason: null,
    status: 'pending_review',
  }
  arr.push(doc)
  saveProposedEvents(arr)
  return decorateProposedEvent(doc)
}

export function proposerProposedEvents(proposer) {
  const arr = loadProposedEvents().filter((pe) => pe.proposer === proposer)
  return {
    items: arr.map(decorateProposedEvent).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))),
    total: arr.length,
  }
}

// 审核一个事件提案：通过 → 把事件置为 active（仅上架事件本身，不再物化任何任务）；
//                  驳回 → 记录理由，事件留在 rejected 状态。
export function reviewProposedEvent(id, { decision, note, reviewer }) {
  const arr = loadProposedEvents()
  const idx = arr.findIndex((pe) => pe.id === id)
  if (idx < 0) throw new Error('事件提案不存在')
  if (decision === 'reject' && !(note || '').trim()) {
    throw new Error('驳回时必须填写理由')
  }
  const newStatus = decision === 'approve' ? 'active' : 'rejected'
  const updated = {
    ...arr[idx],
    status: newStatus,
    reviewedAt: new Date().toISOString(),
    reviewer: reviewer || '平台管理员',
    rejectReason: decision === 'reject' ? note : null,
  }
  arr[idx] = updated
  saveProposedEvents(arr)
  return decorateProposedEvent(updated)
}

// ============== 订阅 ==============

export function listSubscriptions() {
  const arr = loadSubscriptions()
  return { items: arr.map(decorateSubscription), total: arr.length }
}

export function getSubscription(id) {
  const s = loadSubscriptions().find((x) => x.id === id)
  if (!s) return null
  const out = decorateSubscription(s)
  const runs = loadRuns()
    .filter((run) => run.ruleId === id)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  out.runs = runs
  // 详情页顶部统计：成功率 / 平均耗时 / 平均 Token（最近 10 次）
  const recent = runs.slice(0, 10)
  if (recent.length > 0) {
    const successCount = recent.filter((r) => r.status === 'success').length
    const totalDuration = recent.reduce((s, r) => s + (r.durationSec || 0), 0)
    const totalTokens = recent.reduce((s, r) => s + (r.tokens || 0), 0)
    out.stats = {
      runCount: recent.length,
      successRate: recent.length === 0 ? 0 : (successCount / recent.length) * 100,
      avgDuration: Math.round(totalDuration / recent.length),
      avgTokens: Math.round(totalTokens / recent.length / 100) / 10, // K
    }
  } else {
    out.stats = { runCount: 0, successRate: 0, avgDuration: 0, avgTokens: 0 }
  }
  return out
}

// 列出「当前任务」——包括：执行中的订阅 (runningSince 60s 内) +
// 最近 60s 内刚跑完的订阅（lastRunAt 60s 内）。给 user/当前任务 Tab 用。
export function listCurrentTasks() {
  const now = Date.now()
  const arr = loadSubscriptions()
  const runs = loadRuns()
  const matches = arr.filter((s) => {
    if (s.runningSince) {
      const t = new Date(s.runningSince).getTime()
      if (!Number.isNaN(t) && now - t < 60 * 1000) return true
    }
    // 最近 60s 内跑过
    const lastRun = runs
      .filter((r) => r.ruleId === s.id)
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0]
    if (lastRun) {
      const t = new Date(lastRun.timestamp).getTime()
      if (!Number.isNaN(t) && now - t < 60 * 1000) return true
    }
    return false
  })
  return matches.map(decorateSubscription)
}

// 创建订阅：必传 eventId + 用户自建的 tasks[]（提交即启用，不走审核）
export function createSubscription(payload) {
  const arr = loadSubscriptions()
  const id = payload.id || `sub_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffff).toString(36)}`
  if (arr.find((s) => s.id === id)) throw new Error('订阅 ID 已存在')

  const ev = EVENT_MAP[payload.eventId] || loadProposedEvents().find((e) => e.id === payload.eventId)
  if (!ev) throw new Error('未知事件')
  if (ev.status && ev.status !== 'active') throw new Error('该事件尚未上架，无法订阅')

  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  if (tasks.length === 0) throw new Error('请至少添加 1 个任务')
  for (const t of tasks) {
    if (!t.name || !t.name.trim()) throw new Error('每个任务都需要名称')
    if (!t.actionPreview || !t.actionPreview.trim()) throw new Error('每个任务都需要填写「龙虾会主动…」')
  }

  const doc = {
    id,
    eventId: payload.eventId,
    name: (payload.name || '').trim() || ev.name,
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: tasks.map((t) => ({
      id: t.id || `task_${Math.random().toString(36).slice(2, 8)}`,
      name: t.name.trim(),
      description: (t.description || '').trim(),
      actionPreview: t.actionPreview.trim(),
    })),
    runningSince: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  arr.push(doc)
  saveSubscriptions(arr)
  return decorateSubscription(doc)
}

// 更新订阅的任务清单（用户在详情抽屉里增删改任务）
export function updateSubscriptionTasks(id, tasks) {
  const arr = loadSubscriptions()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('订阅不存在')
  const cleaned = (tasks || []).map((t) => ({
    id: t.id || `task_${Math.random().toString(36).slice(2, 8)}`,
    name: (t.name || '').trim(),
    description: (t.description || '').trim(),
    actionPreview: (t.actionPreview || '').trim(),
  })).filter((t) => t.name && t.actionPreview)
  arr[idx] = {
    ...arr[idx],
    tasks: cleaned,
    updatedAt: new Date().toISOString(),
  }
  saveSubscriptions(arr)
  return decorateSubscription(arr[idx])
}

export function toggleSubscription(id, enabled) {
  const arr = loadSubscriptions()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('订阅不存在')
  arr[idx] = { ...arr[idx], enabled: enabled !== false }
  saveSubscriptions(arr)
  return decorateSubscription(arr[idx])
}

export function deleteSubscription(id) {
  saveSubscriptions(loadSubscriptions().filter((s) => s.id !== id))
  saveRuns(loadRuns().filter((run) => run.ruleId !== id))
  return { deleted: true, id }
}

// ============== 执行 ==============

// 模拟一次「立即执行」——v6：设置 runningSince → 60s 内视为执行中；
// 同时立即落库一条 run 记录（status=success, 带真实时长），
// 这样点击后能在「执行记录」立刻看到效果。
export function simulateRun(subscriptionId) {
  const arrSubs = loadSubscriptions()
  const idx = arrSubs.findIndex((x) => x.id === subscriptionId)
  if (idx < 0) throw new Error('订阅不存在')
  const s = arrSubs[idx]
  if (!s.enabled) throw new Error('订阅未启用')

  const now = new Date().toISOString()
  // 标记执行中（60s 内 UI 显示「执行中…」）
  arrSubs[idx] = { ...s, runningSince: now }
  saveSubscriptions(arrSubs)

  const durationSec = 30 + Math.floor(Math.random() * 60) // 30~90s
  const tokens = 30000 + Math.floor(Math.random() * 30000)
  const run = {
    id: `run_${Date.now()}`,
    ruleId: subscriptionId,
    timestamp: now,
    status: 'success',
    tokens,
    durationSec,
    summary: summarizeFor(arrSubs[idx]),
  }
  const arrRuns = loadRuns()
  arrRuns.push(run)
  saveRuns(arrRuns)
  return run
}

// 模拟聊天创建：直接生成一个新订阅（用户口吻自然语言 → 由龙虾「解读」）
export function createTaskFromChat({ name, eventId, tasks }) {
  return createSubscription({
    eventId: eventId || 'meeting-end',
    name: (name || '').trim(),
    tasks: Array.isArray(tasks) && tasks.length > 0 ? tasks : [
      { name: name || '新任务', description: '', actionPreview: '由龙虾解读' },
    ],
  })
}

function summarizeFor(s) {
  const tasks = s.tasks || []
  if (tasks.length === 0) return `「${s.name}」触发（暂无任务）`
  if (tasks.length === 1) return `「${s.name}」已执行 1 项任务：${tasks[0].name}`
  return `「${s.name}」已执行 ${tasks.length} 项任务：${tasks.map((t) => t.name).join('、')}`
}

// ============== 审核队列（v5：只审「事件提案」本身，无任务）==============

export function reviewQueue() {
  const all = loadProposedEvents()
  const decorate = (pe) => ({ ...decorateProposedEvent(pe), kind: 'proposed_event' })

  const pending = all
    .filter((pe) => pe.status === 'pending_review')
    .map(decorate)
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))

  const reviewed = all
    .filter((pe) => pe.status === 'rejected' || pe.status === 'active')
    .map(decorate)
    .sort((a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')))

  return {
    pending,
    reviewed,
    pendingCount: pending.length,
  }
}

// ============== 统计 ==============

export function getStats() {
  const subs = loadSubscriptions()
  const proposed = loadProposedEvents()
  const runs = loadRuns()
  const active = subs.filter((s) => s.status === 'active')
  return {
    subscriptionCount: subs.length,
    activeSubscriptionCount: active.length,
    enabledCount: active.filter((s) => s.enabled).length,
    pendingSubscriptionCount: subs.filter((s) => s.status === 'pending_review').length,
    rejectedSubscriptionCount: subs.filter((s) => s.status === 'rejected').length,
    pendingProposedEventCount: proposed.filter((pe) => pe.status === 'pending_review').length,
    activeProposedEventCount: proposed.filter((pe) => pe.status === 'active').length,
    totalPending: proposed.filter((pe) => pe.status === 'pending_review').length,
    totalRuns: runs.length,
  }
}

// ============== 重置 ==============

export function resetDemo() {
  // 清空所有新旧版本的 key，避免老数据结构残留
  ;[
    LS_PROPOSED_EVENTS, LS_SUBSCRIPTIONS, LS_RUNS,
    'am_preset_tasks_v4', 'am_proposed_events_v4', 'am_subscriptions_v4', 'am_runs_v4',
    'am_subscriptions_v5', 'am_runs_v5',
    'am_proposed_events_v6', 'am_subscriptions_v6', 'am_runs_v6',
    'am_triggers_v1', 'am_templates_v2', 'am_rules_v2', 'am_runs_v2',
    'am_events_v1', 'am_subs_v1',
    'am_events_v3', 'am_preset_tasks_v3', 'am_subscriptions_v3', 'am_runs_v3',
  ].forEach((k) => localStorage.removeItem(k))
  loadProposedEvents(); loadSubscriptions(); loadRuns()
  return {
    reset: true,
    subscriptions: SEED_SUBSCRIPTIONS.length,
    proposedEvents: SEED_PROPOSED_EVENTS.length,
  }
}