// 浏览器端「后端」——纯静态、可在 GitHub Pages 部署。
// 数据持久化在 localStorage，所有交互为本地状态。
//
// =================================================================
// v6 数据模型：用户端极简
// =================================================================
//
// 用户看到的只有「任务」——一个任务 = 标题 + 频率描述 + 用户创建时定义的
// 一条或多条动作 + 执行历史。任务的触发仍然是事件（系统事件 / 开发者提案
// 事件），但用户端不再区分；在订阅里直接保存 frequencyText 给用户看。
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

const LS_PROPOSED_EVENTS = 'am_proposed_events_v6'
const LS_SUBSCRIPTIONS = 'am_subscriptions_v6'
const LS_RUNS = 'am_runs_v6'

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
// v6 SEED：5 条 sample 任务，匹配产品截图的「定时任务」列表
const SEED_SUBSCRIPTIONS = [
  {
    id: 'sub_demo_meeting1',
    eventId: 'meeting-end',
    name: '智能会议1·午间归档纪要与申请权限',
    frequencyText: '每天 13:01',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_m1_1',
        name: '执行 office-meeting-data-archiver 技能的同步模块',
        description: '查询昨天和今天的会议列表，将会议信息自动写入多维表格，并自动申请会议纪要权限',
        actionPreview: '查询昨天和今天的会议列表；将会议信息自动写入多维表格；自动申请会议纪要权限',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'sub_demo_meeting2',
    eventId: 'meeting-end',
    name: '智能会议2·晚间归档纪要与申请权限',
    frequencyText: '每天 21:00',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_m2_1',
        name: '归档当日所有会议',
        description: '晚上 21:00 把当天所有会议自动归档',
        actionPreview: '汇总当天的会议纪要，自动归档到云文档',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'sub_demo_meeting3',
    eventId: 'meeting-end',
    name: '智能会议3·日度会议数据回顾（需补充会议标签）',
    frequencyText: '每天 14:17',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_m3_1',
        name: '日度会议数据回顾',
        description: '每天下午回顾当日已开会议的数据',
        actionPreview: '拉取当日会议数据 → 输出回顾短报告',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-03T10:00:00Z',
    updatedAt: '2026-08-03T10:00:00Z',
  },
  {
    id: 'sub_demo_meeting4',
    eventId: 'meeting-end',
    name: '智能会议4·周度报告推送与会议洞察（需补充会议标签）',
    frequencyText: '每逢周日 18:48',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_m4_1',
        name: '周度报告推送与会议洞察',
        description: '每周日 18:48 推送上周会议洞察',
        actionPreview: '汇总上周所有会议 → 生成洞察 → 推送到群里',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-04T10:00:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'sub_demo_weight_loss',
    eventId: 'meeting-end',
    name: 'weight-loss-weekly-report',
    frequencyText: '每逢周一 09:00',
    enabled: true,
    status: 'active',
    proposer: '我',
    creator: DEMO_USER,
    tasks: [
      {
        id: 'task_w_1',
        name: '本周体重周报',
        description: '汇总本周体重变化并推送周报',
        actionPreview: '从表格读取本周体重 → 生成周报 → 发送',
      },
    ],
    runningSince: null,
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
]

// 各订阅的执行历史
// v6：为 sub_demo_meeting1 准备 10 条样本执行（匹配详情页截图的 100% / 197s / 60K 概览）
const SEED_RUNS = [
  { id: 'run_m1_1', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-13T13:10:05Z', status: 'success', tokens: 64719, durationSec: 156, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_2', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-12T13:09:15Z', status: 'success', tokens: 58246, durationSec: 106, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_3', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-11T13:10:20Z', status: 'success', tokens: 62379, durationSec: 171, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_4', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-10T11:57:09Z', status: 'success', tokens: 56059, durationSec: 69, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_5', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-09T11:57:20Z', status: 'success', tokens: 55058, durationSec: 40, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_6', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-08T11:57:57Z', status: 'success', tokens: 62406, durationSec: 88, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_7', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-07T11:59:14Z', status: 'success', tokens: 61746, durationSec: 165, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_8', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-06T12:01:11Z', status: 'success', tokens: 63021, durationSec: 210, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_9', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-05T11:55:48Z', status: 'success', tokens: 60987, durationSec: 250, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  { id: 'run_m1_10', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-04T11:56:02Z', status: 'success', tokens: 59832, durationSec: 180, summary: '已执行：归档昨日 + 今日会议、自动申请纪要权限' },
  // 历史：meeting1 一条最早跑过；其他 4 条订阅尚未触发过（匹配截图的「暂无记录」）
  { id: 'run_seed_old1', ruleId: 'sub_demo_meeting1', timestamp: '2026-08-02T11:50:00Z', status: 'success', tokens: 56000, summary: '首次启用：已执行' },
  { id: 'run_seed_old_meet', ruleId: 'sub_demo_open_points', timestamp: '2026-08-12T14:30:00Z', status: 'success', tokens: 30000, summary: '「会议前的开场准备」已执行 1 项任务：生成我的开场要点' },
  { id: 'run_seed_old_meet2', ruleId: 'sub_demo_open_points', timestamp: '2026-08-11T14:30:00Z', status: 'success', tokens: 28500, summary: '「会议前的开场准备」已执行 1 项任务：生成我的开场要点' },
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
  ;['am_subscriptions_v4', 'am_preset_tasks_v4', 'am_runs_v4'].forEach((k) => localStorage.removeItem(k))
  // v5 subs/runs seed 已被 v6 替换；旧 v5 数据丢弃，从 v6 seed 重新初始化
  ;['am_subscriptions_v5', 'am_runs_v5'].forEach((k) => localStorage.removeItem(k))
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
    frequencyText: sub.frequencyText || ev?.name || '未设置',
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
    // v6 用户端新字段
    frequencyText: (payload.frequencyText || '').trim() || ev.name,
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
export function createTaskFromChat({ name, frequencyText, eventId, tasks }) {
  return createSubscription({
    eventId: eventId || 'meeting-end',
    name: (name || '').trim(),
    frequencyText: (frequencyText || '').trim(),
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