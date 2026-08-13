// 浏览器端「后端」——纯静态、可在 GitHub Pages 部署。
// 数据持久化在 localStorage，所有交互为本地状态。
//
// =================================================================
// v3 数据模型：从「触发器 × 模板」改造为「事件 × 任务」
// =================================================================
//
// EVENTS          系统事件（用户不能创建）：当前 2 个 —— 会议开始前 30 分钟、会议结束
// PRESET_TASKS    每个事件下的预置任务：开发者提案、平台认定 → 审核通过后上架到「事件市场」
// SUBSCRIPTIONS   用户已订阅的任务：引用 (eventId, taskId)（来自预置），或携带 customName/customAction（自建）
// RUNS            执行历史：订阅启用后，每次事件触发产出一条记录
//
// 关系：
//   EVENTS     1 → N  PRESET_TASKS（每个任务绑定一个 event）
//   PRESET_TASKS 1 → N  SUBSCRIPTIONS（被多人订阅）
//   SUBSCRIPTION 通过 subscriptionId 反查 RUNS

const LS_EVENTS = 'am_events_v3'                 // 事件为常量，但保留 key 以便将来扩展
const LS_PRESET_TASKS = 'am_preset_tasks_v3'
const LS_SUBSCRIPTIONS = 'am_subscriptions_v3'
const LS_RUNS = 'am_runs_v3'

export const DEMO_USER = 'demo_user'

// ============== 元数据（页面渲染标签用）==============

export const SUB_STATUS_META = {
  active: { label: '已启用', color: 'success' },
  pending_review: { label: '待审核', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
}

export const PRESET_STATUS_META = {
  active: { label: '已上架', color: 'success' },
  pending_review: { label: '审核中', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
}

// ============== 事件（固定 2 个，对应产品认知）==============

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
  },
]

export const EVENT_MAP = Object.fromEntries(EVENTS.map((e) => [e.id, e]))

// ============== Seed 数据：4 条预置任务（其中 1 条 pending_review 走审核流）==============

const SEED_PRESET_TASKS = [
  {
    id: 'pt_open_points',
    eventId: 'meeting-start-30min',
    name: '生成我的开场要点',
    description: '开会前先过一遍要点',
    actionPreview: '基于参会人背景 + 历史议题，整理 3 条要点提醒我',
    proposer: '平台官方',
    status: 'active',
    installs: 184,
    submittedAt: '2026-07-20T10:00:00Z',
    reviewedAt: '2026-07-20T18:00:00Z',
  },
  {
    id: 'pt_minutes',
    eventId: 'meeting-end',
    name: '整理会议纪要',
    description: '会后第一时间纪要',
    actionPreview: '基于录音/笔记自动生成议题、结论、待办的结构化纪要',
    proposer: '平台官方',
    status: 'active',
    installs: 312,
    submittedAt: '2026-07-21T10:00:00Z',
    reviewedAt: '2026-07-21T18:00:00Z',
  },
  {
    id: 'pt_actions',
    eventId: 'meeting-end',
    name: '归档行动项',
    description: '把待办归到我名下',
    actionPreview: '提取所有 action item 的 owner + deadline，自动入我的待办',
    proposer: '平台官方',
    status: 'active',
    installs: 247,
    submittedAt: '2026-07-22T10:00:00Z',
    reviewedAt: '2026-07-22T18:00:00Z',
  },
  // pending_review —— 让审核页有事干
  {
    id: 'pt_digest_for_skippers',
    eventId: 'meeting-end',
    name: '同步纪要给未参会人',
    description: '没参会的人也能拿到要点',
    actionPreview: '会后把纪要摘要发到部门群，标注「参与者 / 未参与者」',
    proposer: '张开发',
    status: 'pending_review',
    installs: 0,
    submittedAt: '2026-08-09T11:32:00Z',
    reviewedAt: null,
  },
]

// 用户侧的订阅：2 条 active 启用、1 条 active 但未启用（草稿）、1 条 pending_review 自建
const SEED_SUBSCRIPTIONS = [
  {
    id: 'sub_demo_open_points',
    eventId: 'meeting-start-30min',
    taskId: 'pt_open_points',
    customName: null,
    customAction: null,
    name: '生成我的开场要点',
    description: '开会前先过一遍要点',
    action: '基于参会人背景 + 历史议题，整理 3 条要点提醒我',
    enabled: true,
    isCustom: false,
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-01T10:00:00Z',
    reviewedAt: '2026-08-01T10:00:00Z',
    rejectReason: null,
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'sub_demo_minutes',
    eventId: 'meeting-end',
    taskId: 'pt_minutes',
    customName: null,
    customAction: null,
    name: '整理会议纪要',
    description: '会后第一时间纪要',
    action: '基于录音/笔记自动生成议题、结论、待办的结构化纪要',
    enabled: true,
    isCustom: false,
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-02T10:00:00Z',
    reviewedAt: '2026-08-02T10:00:00Z',
    rejectReason: null,
    createdAt: '2026-08-02T10:00:00Z',
  },
  // active 但是 enabled=false —— 演示「草稿」状态
  {
    id: 'sub_demo_actions_draft',
    eventId: 'meeting-end',
    taskId: 'pt_actions',
    customName: null,
    customAction: null,
    name: '归档行动项',
    description: '把待办归到我名下',
    action: '提取所有 action item 的 owner + deadline，自动入我的待办',
    enabled: false,
    isCustom: false,
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-03T10:00:00Z',
    reviewedAt: '2026-08-03T10:00:00Z',
    rejectReason: null,
    createdAt: '2026-08-03T10:00:00Z',
  },
  // 自建、待审核 —— 让管理员页一打开就有事干
  {
    id: 'sub_seed_pending_custom',
    eventId: 'meeting-end',
    taskId: null,
    customName: '把纪要同步给直属 leader',
    customAction: '会后把会议纪要整理成不超过 8 行的要点，发私聊给直属 leader',
    name: '把纪要同步给直属 leader',
    description: '自建 · 会后',
    action: '会后把会议纪要整理成不超过 8 行的要点，发私聊给直属 leader',
    enabled: false,
    isCustom: true,
    proposer: DEMO_USER,
    creator: DEMO_USER,
    status: 'pending_review',
    submittedAt: '2026-08-12T09:30:00Z',
    reviewedAt: null,
    rejectReason: null,
    createdAt: '2026-08-12T09:30:00Z',
  },
]

// 各订阅的执行历史（订阅启用后的事件触发记录）
const SEED_RUNS = [
  // 开场要点（多次会前准备）
  { id: 'run_seed_1', ruleId: 'sub_demo_open_points', timestamp: '2026-08-12T14:30:00Z', status: 'success', tokens: 30000, summary: '已生成 3 条开场要点；提示参会人 A 上次会后还有 2 条未闭环' },
  { id: 'run_seed_2', ruleId: 'sub_demo_open_points', timestamp: '2026-08-11T14:30:00Z', status: 'success', tokens: 28500, summary: '已生成 3 条开场要点；今日议程：产品路线 / 财务复盘 / 招聘' },
  { id: 'run_seed_3', ruleId: 'sub_demo_open_points', timestamp: '2026-08-08T14:30:00Z', status: 'success', tokens: 32700, summary: '已生成 3 条开场要点；已拉参会人 B、C 的近 3 次决议' },
  // 会议纪要（多次会议）
  { id: 'run_seed_4', ruleId: 'sub_demo_minutes', timestamp: '2026-08-12T11:00:00Z', status: 'success', tokens: 41200, summary: '周会纪要已生成（5 个议题、3 条待办已分配）' },
  { id: 'run_seed_5', ruleId: 'sub_demo_minutes', timestamp: '2026-08-10T16:00:00Z', status: 'success', tokens: 36800, summary: '产品评审会纪要已生成，2 条待办已分配 owner' },
  { id: 'run_seed_6', ruleId: 'sub_demo_minutes', timestamp: '2026-08-07T17:00:00Z', status: 'success', tokens: 38900, summary: '客户需求评审会纪要已生成（4 条待办）' },
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

// EVENTS 是常量，直接克隆
function loadEvents() { return clone(EVENTS) }
function loadPresetTasks() { return loadOrInit(LS_PRESET_TASKS, SEED_PRESET_TASKS) }
function savePresetTasks(arr) { localStorage.setItem(LS_PRESET_TASKS, JSON.stringify(arr)) }
function loadSubscriptions() { return loadOrInit(LS_SUBSCRIPTIONS, SEED_SUBSCRIPTIONS) }
function saveSubscriptions(arr) { localStorage.setItem(LS_SUBSCRIPTIONS, JSON.stringify(arr)) }
function loadRuns() { return loadOrInit(LS_RUNS, SEED_RUNS) }
function saveRuns(arr) { localStorage.setItem(LS_RUNS, JSON.stringify(arr)) }

// 装饰：subscription 附上 event 元数据 + 状态
function decorateSubscription(sub) {
  const ev = EVENT_MAP[sub.eventId]
  const task = sub.taskId ? loadPresetTasks().find((t) => t.id === sub.taskId) : null
  return {
    ...sub,
    eventName: ev?.name || sub.eventId,
    eventIcon: ev?.icon || 'ClockCircleOutlined',
    eventBg: ev?.bg || '#f3f4f6',
    eventColor: ev?.color || '#6b7280',
    eventDesc: ev?.desc || '',
    eventSource: ev?.source || '',
    taskName: task?.name || sub.customName || '自定义任务',
    statusMeta: SUB_STATUS_META[sub.status] || SUB_STATUS_META.pending_review,
  }
}

function decoratePresetTask(t) {
  const ev = EVENT_MAP[t.eventId]
  return {
    ...t,
    eventName: ev?.name || t.eventId,
    eventIcon: ev?.icon || 'ClockCircleOutlined',
    eventBg: ev?.bg || '#f3f4f6',
    eventColor: ev?.color || '#6b7280',
    statusMeta: PRESET_STATUS_META[t.status] || PRESET_STATUS_META.pending_review,
  }
}

// ============== 事件（只读）==============

export function listEvents() {
  return loadEvents()
}

export function getEvent(id) {
  const e = EVENTS.find((x) => x.id === id)
  return e ? clone(e) : null
}

// ============== 预置任务 ==============

export function listPresetTasks({ eventId, status, proposer, q } = {}) {
  let arr = loadPresetTasks()
  if (eventId) arr = arr.filter((t) => t.eventId === eventId)
  if (status) arr = arr.filter((t) => t.status === status)
  else arr = arr.filter((t) => t.status === 'active') // 默认只看已上架
  if (proposer) arr = arr.filter((t) => t.proposer === proposer)
  if (q) {
    const k = String(q).trim().toLowerCase()
    arr = arr.filter((t) => `${t.name} ${t.description} ${t.actionPreview}`.toLowerCase().includes(k))
  }
  return { items: arr.map(decoratePresetTask), total: arr.length }
}

export function getPresetTask(id) {
  const t = loadPresetTasks().find((x) => x.id === id)
  return t ? decoratePresetTask(t) : null
}

export function submitPresetTask(payload) {
  const arr = loadPresetTasks()
  if (arr.find((t) => t.id === payload.id)) {
    throw new Error(`预置任务 ID「${payload.id}」已存在`)
  }
  if (!EVENT_MAP[payload.eventId]) {
    throw new Error(`未知事件「${payload.eventId}」`)
  }
  const doc = {
    id: payload.id,
    eventId: payload.eventId,
    name: payload.name,
    description: payload.description || '',
    actionPreview: payload.actionPreview,
    proposer: payload.proposer || '张开发',
    status: 'pending_review',
    installs: 0,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  }
  arr.push(doc)
  savePresetTasks(arr)
  return decoratePresetTask(doc)
}

export function reviewPresetTask(id, { decision, note, reviewer }) {
  const arr = loadPresetTasks()
  const idx = arr.findIndex((t) => t.id === id)
  if (idx < 0) throw new Error('预置任务不存在')
  if (decision === 'reject' && !(note || '').trim()) {
    throw new Error('驳回时必须填写理由')
  }
  arr[idx] = {
    ...arr[idx],
    status: decision === 'approve' ? 'active' : 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewer: reviewer || '平台管理员',
    rejectReason: decision === 'reject' ? note : null,
  }
  savePresetTasks(arr)
  return decoratePresetTask(arr[idx])
}

export function proposerPresetTasks(proposer) {
  const arr = loadPresetTasks().filter((t) => t.proposer === proposer)
  return { items: arr.map(decoratePresetTask), total: arr.length }
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
  out.runs = loadRuns()
    .filter((run) => run.ruleId === id)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  return out
}

// 创建订阅：传 taskId 表示从预置订阅；不传则视为自定义
export function createSubscription(payload) {
  const arr = loadSubscriptions()
  const id = payload.id || `sub_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffff).toString(36)}`
  if (arr.find((s) => s.id === id)) throw new Error('订阅 ID 已存在')

  let doc
  if (payload.taskId) {
    // 从预置订阅
    const t = loadPresetTasks().find((x) => x.id === payload.taskId)
    if (!t) throw new Error('预置任务不存在')
    if (t.status !== 'active') throw new Error('该预置任务尚未上架')
    doc = {
      id,
      eventId: t.eventId,
      taskId: t.id,
      customName: null,
      customAction: null,
      name: t.name,
      description: t.description,
      action: t.actionPreview,
      enabled: !payload.asDraft,
      isCustom: false,
      proposer: t.proposer,
      creator: DEMO_USER,
      status: 'active',
      submittedAt: t.submittedAt || new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      rejectReason: null,
      createdAt: new Date().toISOString(),
    }
  } else {
    // 自定义 —— 必须经过审核
    const ev = EVENT_MAP[payload.eventId]
    if (!ev) throw new Error('未知事件')
    const customName = (payload.customName || '').trim()
    const customAction = (payload.customAction || '').trim()
    if (customName.length < 2) throw new Error('请填写任务名称（至少 2 个字）')
    if (customAction.length < 4) throw new Error('请填写执行内容（至少 4 个字）')
    doc = {
      id,
      eventId: payload.eventId,
      taskId: null,
      customName,
      customAction,
      name: customName,
      description: '我的自定义任务',
      action: customAction,
      enabled: false,
      isCustom: true,
      proposer: DEMO_USER,
      creator: DEMO_USER,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      rejectReason: null,
      createdAt: new Date().toISOString(),
    }
  }

  arr.push(doc)
  saveSubscriptions(arr)
  return decorateSubscription(doc)
}

export function reviewSubscription(id, { decision, note, reviewer }) {
  const arr = loadSubscriptions()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('订阅不存在')
  if (decision === 'reject' && !(note || '').trim()) {
    throw new Error('驳回时必须填写理由')
  }
  arr[idx] = {
    ...arr[idx],
    status: decision === 'approve' ? 'active' : 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewer: reviewer || '平台管理员',
    rejectReason: decision === 'reject' ? note : null,
    enabled: decision === 'approve' ? true : arr[idx].enabled,
  }
  saveSubscriptions(arr)
  return decorateSubscription(arr[idx])
}

export function toggleSubscription(id, enabled) {
  const arr = loadSubscriptions()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('订阅不存在')
  if (arr[idx].status !== 'active') {
    throw new Error('订阅尚未通过审核，无法切换')
  }
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

export function simulateRun(subscriptionId) {
  const s = loadSubscriptions().find((x) => x.id === subscriptionId)
  if (!s) throw new Error('订阅不存在')
  if (s.status !== 'active') throw new Error('订阅尚未通过审核')
  if (!s.enabled) throw new Error('订阅未启用')

  const run = {
    id: `run_${Date.now()}`,
    ruleId: subscriptionId,
    timestamp: new Date().toISOString(),
    status: 'success',
    tokens: 30000 + Math.floor(Math.random() * 30000),
    summary: summarizeFor(s),
  }
  const arr = loadRuns()
  arr.push(run)
  saveRuns(arr)
  return run
}

function summarizeFor(s) {
  if (s.eventId === 'meeting-start-30min') {
    return `「${s.name}」已执行：拉取参会人 + 历史议题，整理 3 条要点提醒`
  }
  if (s.eventId === 'meeting-end') {
    if (s.taskId === 'pt_minutes') return `会议纪要已生成（议题 / 结论 / 待办）`
    if (s.taskId === 'pt_actions') return `已提取所有行动项并归档到我的待办`
    return `「${s.name}」已按自定义动作执行`
  }
  return `「${s.name}」已执行`
}

// ============== 审核队列（合并预置任务 + 自定义订阅）==============

export function reviewQueue() {
  const presets = loadPresetTasks()
  const subs = loadSubscriptions()

  const pendingPreset = presets
    .filter((t) => t.status === 'pending_review')
    .map(decoratePresetTask)
    .map((t) => ({ ...t, kind: 'preset' }))
  const pendingSub = subs
    .filter((s) => s.status === 'pending_review')
    .map(decorateSubscription)
    .map((s) => ({ ...s, kind: 'subscription' }))

  const pending = [...pendingPreset, ...pendingSub].sort(
    (a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')),
  )

  const reviewedPreset = presets
    .filter((t) => t.status === 'rejected' || t.status === 'active')
    .map(decoratePresetTask)
    .map((t) => ({ ...t, kind: 'preset' }))
  const reviewedSub = subs
    .filter((s) => s.status === 'rejected' || s.status === 'active')
    .map(decorateSubscription)
    .map((s) => ({ ...s, kind: 'subscription' }))

  const reviewed = [...reviewedPreset, ...reviewedSub].sort(
    (a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')),
  )

  return {
    pending,
    reviewed,
    pendingCount: pending.length,
    presetPending: pendingPreset.length,
    subPending: pendingSub.length,
  }
}

// ============== 统计 ==============

export function getStats() {
  const subs = loadSubscriptions()
  const presets = loadPresetTasks()
  const runs = loadRuns()
  const active = subs.filter((s) => s.status === 'active')
  return {
    subscriptionCount: subs.length,
    activeSubscriptionCount: active.length,
    enabledCount: active.filter((s) => s.enabled).length,
    pendingSubscriptionCount: subs.filter((s) => s.status === 'pending_review').length,
    rejectedSubscriptionCount: subs.filter((s) => s.status === 'rejected').length,
    presetTaskCount: presets.filter((t) => t.status === 'active').length,
    pendingPresetTaskCount: presets.filter((t) => t.status === 'pending_review').length,
    totalPending: subs.filter((s) => s.status === 'pending_review').length
      + presets.filter((t) => t.status === 'pending_review').length,
    totalRuns: runs.length,
  }
}

// ============== 重置 ==============

export function resetDemo() {
  // 清空所有新旧版本的 key，避免老数据结构残留
  ;[
    LS_EVENTS, LS_PRESET_TASKS, LS_SUBSCRIPTIONS, LS_RUNS,
    'am_triggers_v1', 'am_templates_v2', 'am_rules_v2', 'am_runs_v2',
    'am_events_v1', 'am_subs_v1',
  ].forEach((k) => localStorage.removeItem(k))
  loadPresetTasks(); loadSubscriptions(); loadRuns()
  return {
    reset: true,
    subscriptions: SEED_SUBSCRIPTIONS.length,
    presetTasks: SEED_PRESET_TASKS.length,
  }
}
