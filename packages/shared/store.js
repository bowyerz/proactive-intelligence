// 浏览器端「后端」——纯静态、可在 GitHub Pages 部署。
// 数据持久化在 localStorage，所有交互为本地状态。
//
// =================================================================
// v4 数据模型：管理后台的审核单位从「任务」改为「事件」
// =================================================================
//
// 系统事件（固定 2 个，不允许开发者改）：
//   EVENTS               飞书日历来的 2 个原生事件（会议开始前 30 分钟 / 会议结束）
//
// 开发者可创建（管理后台审核单位）：
//   PROPOSED_EVENTS      开发者提案的「事件包」：事件元数据 + 内置若干任务
//                        状态：pending_review / active / rejected
//                        active 后会上架到「事件市场」，其 bundledTasks 自动物化为 PRESET_TASKS
//
// 预置任务（用户可直接一键订阅的成品任务）：
//   PRESET_TASKS         由系统种子（2 个固定事件的官方任务）+ 开发者提案通过后物化而来
//                        状态：active（系统种子）/ active（开发者提案通过后由 reviewProposedEvent 写入）
//
// 用户的订阅层：
//   SUBSCRIPTIONS        引用 (eventId, taskId) 订阅预置任务；或自建 customName/customAction
//                        自建任务 v4 起自动启用（不再走 pending_review）
//   RUNS                 订阅启用后，每次事件触发产出一条执行记录
//
// 关系：
//   EVENTS          1 → N  PRESET_TASKS（系统种子的官方任务）
//   PROPOSED_EVENTS 1 → N  bundledTasks（审核通过后物化为 PRESET_TASKS）
//   PRESET_TASKS    1 → N  SUBSCRIPTIONS（被多人订阅）
//   SUBSCRIPTION    通过 id 反查 RUNS

const LS_PRESET_TASKS = 'am_preset_tasks_v4'
const LS_PROPOSED_EVENTS = 'am_proposed_events_v4'
const LS_SUBSCRIPTIONS = 'am_subscriptions_v4'
const LS_RUNS = 'am_runs_v4'

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

// ============== Seed 数据：固定事件的官方任务（都是 active）==============

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
]

// Seed：1 条开发者提案的「事件包」（待审核，让管理后台一进来就有事干）
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
    bundledTasks: [
      {
        name: '汇总本周待办完成情况',
        description: '把待办系统拉个清单',
        actionPreview: '拉取我本周所有待办，统计完成率与卡点项，生成 1 段摘要',
      },
      {
        name: '生成周报草稿',
        description: '基于完成情况出周报',
        actionPreview: '基于本周完成情况和进行中事项，生成一份不超过 200 字的周报草稿',
      },
    ],
    proposer: '张开发',
    submittedAt: '2026-08-09T10:00:00Z',
    reviewedAt: null,
    reviewer: null,
    rejectReason: null,
    status: 'pending_review',
  },
]

// 用户侧的订阅：2 条 active 启用、1 条 active 但未启用（草稿），无 pending（自建任务现在自动启用）
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
]

// 各订阅的执行历史（订阅启用后的事件触发记录）
const SEED_RUNS = [
  { id: 'run_seed_1', ruleId: 'sub_demo_open_points', timestamp: '2026-08-12T14:30:00Z', status: 'success', tokens: 30000, summary: '已生成 3 条开场要点；提示参会人 A 上次会后还有 2 条未闭环' },
  { id: 'run_seed_2', ruleId: 'sub_demo_open_points', timestamp: '2026-08-11T14:30:00Z', status: 'success', tokens: 28500, summary: '已生成 3 条开场要点；今日议程：产品路线 / 财务复盘 / 招聘' },
  { id: 'run_seed_3', ruleId: 'sub_demo_open_points', timestamp: '2026-08-08T14:30:00Z', status: 'success', tokens: 32700, summary: '已生成 3 条开场要点；已拉参会人 B、C 的近 3 次决议' },
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

function loadPresetTasks() { return loadOrInit(LS_PRESET_TASKS, SEED_PRESET_TASKS) }
function savePresetTasks(arr) { localStorage.setItem(LS_PRESET_TASKS, JSON.stringify(arr)) }
function loadProposedEvents() { return loadOrInit(LS_PROPOSED_EVENTS, SEED_PROPOSED_EVENTS) }
function saveProposedEvents(arr) { localStorage.setItem(LS_PROPOSED_EVENTS, JSON.stringify(arr)) }
function loadSubscriptions() {
  const arr = loadOrInit(LS_SUBSCRIPTIONS, SEED_SUBSCRIPTIONS)
  // v4 迁移：旧版本遗留的 pending_review 自建订阅，自动启用（v4 起自建不再走审核）
  let changed = false
  for (const s of arr) {
    if (s.isCustom && s.status === 'pending_review') {
      s.status = 'active'
      s.enabled = true
      s.reviewedAt = s.reviewedAt || new Date().toISOString()
      s.reviewer = s.reviewer || '系统（自动迁移）'
      changed = true
    }
  }
  if (changed) saveSubscriptions(arr)
  return arr
}
function saveSubscriptions(arr) { localStorage.setItem(LS_SUBSCRIPTIONS, JSON.stringify(arr)) }
function loadRuns() { return loadOrInit(LS_RUNS, SEED_RUNS) }
function saveRuns(arr) { localStorage.setItem(LS_RUNS, JSON.stringify(arr)) }

// 装饰：subscription 附上 event 元数据 + 状态
function decorateSubscription(sub) {
  const ev = EVENT_MAP[sub.eventId] || loadProposedEvents().find((e) => e.id === sub.eventId)
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
    statusMeta: SUB_STATUS_META[sub.status] || SUB_STATUS_META.active,
  }
}

function decoratePresetTask(t) {
  const ev = EVENT_MAP[t.eventId] || loadProposedEvents().find((e) => e.id === t.eventId)
  return {
    ...t,
    eventName: ev?.name || t.eventId,
    eventIcon: ev?.icon || 'ClockCircleOutlined',
    eventBg: ev?.bg || '#f3f4f6',
    eventColor: ev?.color || '#6b7280',
    statusMeta: PRESET_STATUS_META[t.status] || PRESET_STATUS_META.active,
  }
}

function decorateProposedEvent(pe) {
  return {
    ...pe,
    statusMeta: PROPOSED_EVENT_STATUS_META[pe.status] || PROPOSED_EVENT_STATUS_META.pending_review,
    taskCount: (pe.bundledTasks || []).length,
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

// ============== 预置任务（订阅用的成品）==============

export function listPresetTasks({ eventId, status, q } = {}) {
  let arr = loadPresetTasks()
  if (eventId) arr = arr.filter((t) => t.eventId === eventId)
  if (status) arr = arr.filter((t) => t.status === status)
  else arr = arr.filter((t) => t.status === 'active') // 默认只看已上架
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
  return { items: arr.map(decorateProposedEvent).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))), total: arr.length }
}

export function getProposedEvent(id) {
  const pe = loadProposedEvents().find((x) => x.id === id)
  return pe ? decorateProposedEvent(pe) : null
}

export function submitProposedEvent(payload) {
  const arr = loadProposedEvents()
  if (arr.find((pe) => pe.id === payload.id)) {
    throw new Error(`事件提案 ID「${payload.id}」已存在`)
  }
  if (!payload.name || !payload.name.trim()) throw new Error('请填写事件名')
  if (!Array.isArray(payload.bundledTasks) || payload.bundledTasks.length === 0) {
    throw new Error('至少包含 1 个内置任务')
  }
  for (const t of payload.bundledTasks) {
    if (!t.name || !t.name.trim()) throw new Error('每个内置任务都需要名称')
    if (!t.actionPreview || !t.actionPreview.trim()) throw new Error('每个内置任务都需要填写「龙虾会主动…」')
  }
  // id 由调用方按 `pe_<proposer>_<slug>_<rand>` 形式生成；这里兜底再校验
  const doc = {
    id: payload.id,
    name: payload.name.trim(),
    icon: payload.icon || 'ThunderboltOutlined',
    bg: payload.bg || '#f0f5ff',
    color: payload.color || '#2f54eb',
    source: (payload.source || '').trim() || '自定义来源',
    desc: (payload.desc || '').trim(),
    checklist: (payload.checklist || '').trim(),
    bundledTasks: payload.bundledTasks.map((t) => ({
      name: t.name.trim(),
      description: (t.description || '').trim(),
      actionPreview: t.actionPreview.trim(),
    })),
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
  return { items: arr.map(decorateProposedEvent).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))), total: arr.length }
}

// 审核一个事件提案：通过 → 把事件置为 active，并物化其 bundledTasks 为 PRESET_TASKS；
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

  // 通过时：把 bundledTasks 物化为 PRESET_TASKS，让用户可在事件市场一键订阅
  if (decision === 'approve') {
    const presets = loadPresetTasks()
    const baseId = `pt_${updated.id}`
    updated.bundledTasks.forEach((bt, i) => {
      const tid = `${baseId}_${i + 1}`
      if (!presets.find((p) => p.id === tid)) {
        presets.push({
          id: tid,
          eventId: updated.id,
          name: bt.name,
          description: bt.description || '',
          actionPreview: bt.actionPreview,
          proposer: updated.proposer,
          status: 'active',
          installs: 0,
          submittedAt: updated.submittedAt,
          reviewedAt: updated.reviewedAt,
        })
      }
    })
    savePresetTasks(presets)
  }

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
  out.runs = loadRuns()
    .filter((run) => run.ruleId === id)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  return out
}

// 创建订阅：传 taskId 表示从预置订阅；不传则视为自定义（v4 起自定义自动启用）
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
    // 自定义 —— v4 起不再走 pending_review，提交即启用
    const ev = EVENT_MAP[payload.eventId] || loadProposedEvents().find((e) => e.id === payload.eventId)
    if (!ev) throw new Error('未知事件')
    if (ev.status && ev.status !== 'active') throw new Error('该事件尚未上架，无法自定义任务')
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
      enabled: true,
      isCustom: true,
      proposer: DEMO_USER,
      creator: DEMO_USER,
      status: 'active',
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      rejectReason: null,
      createdAt: new Date().toISOString(),
    }
  }

  arr.push(doc)
  saveSubscriptions(arr)
  return decorateSubscription(doc)
}

export function toggleSubscription(id, enabled) {
  const arr = loadSubscriptions()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('订阅不存在')
  if (arr[idx].status !== 'active') {
    throw new Error('订阅尚未启用，无法切换')
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
  if (s.status !== 'active') throw new Error('订阅未启用')
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

// ============== 审核队列（v4：只审「事件提案」，不再审任务/订阅）==============

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
  const presets = loadPresetTasks()
  const proposed = loadProposedEvents()
  const runs = loadRuns()
  const active = subs.filter((s) => s.status === 'active')
  return {
    subscriptionCount: subs.length,
    activeSubscriptionCount: active.length,
    enabledCount: active.filter((s) => s.enabled).length,
    pendingSubscriptionCount: subs.filter((s) => s.status === 'pending_review').length,
    rejectedSubscriptionCount: subs.filter((s) => s.status === 'rejected').length,
    presetTaskCount: presets.filter((t) => t.status === 'active').length,
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
    LS_PRESET_TASKS, LS_PROPOSED_EVENTS, LS_SUBSCRIPTIONS, LS_RUNS,
    'am_triggers_v1', 'am_templates_v2', 'am_rules_v2', 'am_runs_v2',
    'am_events_v1', 'am_subs_v1',
    'am_events_v3', 'am_preset_tasks_v3', 'am_subscriptions_v3', 'am_runs_v3',
  ].forEach((k) => localStorage.removeItem(k))
  loadPresetTasks(); loadProposedEvents(); loadSubscriptions(); loadRuns()
  return {
    reset: true,
    subscriptions: SEED_SUBSCRIPTIONS.length,
    presetTasks: SEED_PRESET_TASKS.length,
    proposedEvents: SEED_PROPOSED_EVENTS.length,
  }
}