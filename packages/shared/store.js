// 浏览器端「后端」——纯静态、可在 GitHub Pages 部署。
// 数据持久化在 localStorage，所有交互（创建任务、从模板添加、提交/审核模板、重置）均为本地状态。
//
// ===========================================================================
// 新数据模型（v2，原 v1 的 events+subscriptions 模型已废弃）
// ===========================================================================
//
// TRIGGERS          5 个固定触发器类型（截图 1）：聊天消息 / 邮件 / 会议纪要 / 审批 / Webhook
// TEMPLATES         公共模板库（含待审核）：开发者提交 / 管理员审核通过后上架
// MY_RULES          用户已安装的规则（含从模板添加 / 自建）：每条都是 (trigger × action)，带开关
// RUNS              执行历史：每条对应一次「触发→执行」的结果记录
//
// 关系：
//   templates 是一对多 my_rules 的来源（点「从模板添加」会克隆出一条 isFromTemplate:true 的 my_rule）
//   my_rules 通过 ruleId 反查 runs 看执行历史
//

const LS_TRIGGERS = 'am_triggers_v1' // 触发器是常量，但保留 key 以便将来扩展
const LS_TEMPLATES = 'am_templates_v2'
const LS_RULES = 'am_rules_v2'
const LS_RUNS = 'am_runs_v2'

export const DEMO_USER = 'demo_user'

// 规则状态元数据（给页面渲染标签）
export const RULE_STATUS_META = {
  active: { label: '已启用', color: 'success' },
  pending_review: { label: '待审核', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
  draft: { label: '草稿', color: 'default' },
}

// ----- 6 个触发器（含「自定义」—— 用户可以自命名触发场景） -----
export const TRIGGERS = [
  { id: 'chat', name: '聊天消息', icon: 'MessageOutlined', desc: '接收聊天消息时触发', sourceKey: '飞书' },
  { id: 'email', name: '邮件', icon: 'MailOutlined', desc: '收到新邮件时触发', sourceKey: '邮件' },
  { id: 'minutes', name: '会议纪要', icon: 'FileTextOutlined', desc: '生成会议纪要时触发', sourceKey: '飞书' },
  { id: 'approval', name: '审批', icon: 'AuditOutlined', desc: '审批状态变更时触发', sourceKey: '飞书' },
  { id: 'webhook', name: 'Webhook', icon: 'ApiOutlined', desc: '接收 HTTP 请求时触发', sourceKey: '自定义' },
  { id: 'custom', name: '自定义', icon: 'SettingOutlined', desc: '自己命名一个触发场景', sourceKey: '自定义' },
]

// 给页面复用的：把 trigger.id → TRIGGERS item
export const TRIGGER_MAP = Object.fromEntries(TRIGGERS.map((t) => [t.id, t]))

// ----- 预置：6 个公共模板（5 上架 + 1 待审核）-----
const SEED_TEMPLATES = [
  {
    id: 'tpl_email_triage',
    name: '新邮件智能分级与摘要',
    trigger: 'email',
    description: '自动给邮件分级并写摘要',
    action: '把收到的新邮件做智能分级（重要/常规/垃圾），并写一份 50 字内的摘要同步到我的对话框。',
    proposer: '平台官方',
    status: 'active',
    installs: 1234,
    submittedAt: '2026-03-12T10:00:00Z',
    reviewedAt: '2026-03-13T10:00:00Z',
  },
  {
    id: 'tpl_approval_reminder',
    name: '待审批任务智能提醒',
    trigger: 'approval',
    description: '审批快超时自动通知',
    action: '对待审批任务做摘要，超时前 2 小时自动给我发提醒，并附一键审批跳转链接。',
    proposer: '平台官方',
    status: 'active',
    installs: 852,
    submittedAt: '2026-03-15T10:00:00Z',
    reviewedAt: '2026-03-15T18:00:00Z',
  },
  {
    id: 'tpl_minutes_summary',
    name: '会议纪要自动生成与授权',
    trigger: 'minutes',
    description: '会后自动整理纪要和待办',
    action: '会议结束后自动生成纪要 + 待办分配（动作人 / 截止时间），并把纪要同步到群对话。',
    proposer: '平台官方',
    status: 'active',
    installs: 642,
    submittedAt: '2026-03-18T10:00:00Z',
    reviewedAt: '2026-03-18T16:00:00Z',
  },
  {
    id: 'tpl_chat_urgent',
    name: '群消息加急关键词提醒',
    trigger: 'chat',
    description: '出现加急词立刻私聊推送',
    action: '当群里消息出现「加急」「@我」「老板」等关键词，立刻私聊推送给我，并把原消息附在末尾。',
    proposer: '平台官方',
    status: 'active',
    installs: 423,
    submittedAt: '2026-03-22T10:00:00Z',
    reviewedAt: '2026-03-22T20:00:00Z',
  },
  {
    id: 'tpl_webhook_monitor',
    name: '监控系统报警自动处置',
    trigger: 'webhook',
    description: 'Prometheus / Grafana 告警自动归并',
    action: '收到监控告警 Webhook 时，自动按服务/等级归并，给出 1 段处置建议，并写一行进日报。',
    proposer: '平台官方',
    status: 'active',
    installs: 311,
    submittedAt: '2026-03-25T10:00:00Z',
    reviewedAt: '2026-03-25T18:00:00Z',
  },
  {
    id: 'tpl_warehouse_anomaly',
    name: '数据仓库异常自动归因',
    trigger: 'webhook',
    description: '数据任务异常自动给出根因',
    action: '当数据仓库任务失败 / 延迟告警时，自动拉最近 24 小时相关 SQL 与变更记录，给出 1 段根因分析。',
    proposer: '张开发',
    status: 'pending_review',
    installs: 0,
    submittedAt: '2026-08-09T11:32:00Z',
    reviewedAt: null,
  },
]

// 6 个模板预设的执行历史（截图 5 的设计），与"我的任务"开机的 3 条规则对应
const SEED_RUNS = (() => {
  const rows = []
  let seq = 0
  const seedForRule = (ruleId, summaries) => {
    const base = new Date('2026-04-14T14:20:59Z').getTime()
    summaries.forEach((s, i) => {
      // 按天回退：2026-04-14 14:20:59 → 4-13 → 4-12 → 4-7 → 4-5（与截图 5 时间戳完全一致）
      const dates = [
        '2026-04-14T14:20:59Z',
        '2026-04-13T14:20:59Z',
        '2026-04-12T14:20:59Z',
        '2026-04-07T14:20:59Z',
        '2026-04-05T14:20:59Z',
      ]
      rows.push({
        id: `run_seed_${++seq}`,
        ruleId,
        timestamp: dates[i] || dates[dates.length - 1],
        status: 'success',
        tokens: 50000,
        summary: s,
      })
    })
  }
  seedForRule('rule_demo_email', [
    '处理 12 封邮件，重要 2 封、客户邮件 1 封、垃圾 4 封',
    '处理 8 封邮件，重要 1 封为合同法务邮件',
    '处理 15 封邮件，重要 3 封含 1 封紧急',
    '处理 6 封邮件，均为常规',
    '处理 10 封邮件，重要 2 封、垃圾 1 封',
  ])
  seedForRule('rule_demo_approval', [
    '扫描待审批 4 条，1 条 1 小时内超时，已推送提醒',
    '扫描待审批 3 条，无超时',
    '扫描待审批 5 条，1 条 30 分钟内超时',
    '扫描待审批 2 条，无超时',
    '扫描待审批 6 条，2 条超时，已推送提醒',
  ])
  seedForRule('rule_demo_minutes', [
    '周会纪要已生成，3 条待办已分配',
    '产品评审会纪要已生成',
    '客户需求评审会纪要已生成，2 条待办',
    '月复盘会议纪要已生成',
    '研发周会纪要已生成，4 条待办',
  ])
  return rows
})()

// 3 条已安装规则 + 1 条草稿，对应截图 1 的初始列表（全部预审为 active）
const SEED_RULES = [
  {
    id: 'rule_demo_email',
    name: '新邮件智能分级与摘要',
    trigger: 'email',
    action: '把收到的新邮件做智能分级（重要/常规/垃圾），并写一份 50 字内的摘要同步到我的对话框。',
    enabled: true,
    isFromTemplate: 'tpl_email_triage',
    templateName: '新邮件智能分级与摘要',
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-01T10:00:00Z',
    reviewedAt: '2026-08-01T10:00:00Z',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'rule_demo_approval',
    name: '待审批任务智能提醒',
    trigger: 'approval',
    action: '对待审批任务做摘要，超时前 2 小时自动给我发提醒，并附一键审批跳转链接。',
    enabled: true,
    isFromTemplate: 'tpl_approval_reminder',
    templateName: '待审批任务智能提醒',
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-02T10:00:00Z',
    reviewedAt: '2026-08-02T10:00:00Z',
    createdAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'rule_demo_minutes',
    name: '会议纪要自动生成与授权',
    trigger: 'minutes',
    action: '会议结束后自动生成纪要 + 待办分配（动作人 / 截止时间），并把纪要同步到群对话。',
    enabled: true,
    isFromTemplate: 'tpl_minutes_summary',
    templateName: '会议纪要自动生成与授权',
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-03T10:00:00Z',
    reviewedAt: '2026-08-03T10:00:00Z',
    createdAt: '2026-08-03T10:00:00Z',
  },
  {
    id: 'rule_demo_chat_draft',
    name: '群消息加急关键词提醒（草稿）',
    trigger: 'chat',
    action: '当群里消息出现「加急」「@我」「老板」等关键词，立刻私聊推送给我，并把原消息附在末尾。',
    enabled: false,
    isFromTemplate: 'tpl_chat_urgent',
    templateName: '群消息加急关键词提醒',
    proposer: '平台官方',
    creator: DEMO_USER,
    status: 'active',
    submittedAt: '2026-08-04T10:00:00Z',
    reviewedAt: '2026-08-04T10:00:00Z',
    createdAt: '2026-08-04T10:00:00Z',
  },
  // 一条预置的「待审核」用户自建规则 — 让管理员页一打开就有事干
  {
    id: 'rule_seed_pending',
    name: '每日 8 点自动拉日报',
    trigger: 'custom',
    customName: '每日 8 点',
    action: '早上 8 点拉昨日日报汇总（指标 + 关键事件）并私聊推送给我。',
    enabled: false,
    isFromTemplate: null,
    templateName: null,
    proposer: DEMO_USER,
    creator: DEMO_USER,
    status: 'pending_review',
    submittedAt: '2026-08-10T09:30:00Z',
    reviewedAt: null,
    rejectReason: null,
    createdAt: '2026-08-10T09:30:00Z',
  },
]

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

function loadTemplates() { return loadOrInit(LS_TEMPLATES, SEED_TEMPLATES) }
function saveTemplates(arr) { localStorage.setItem(LS_TEMPLATES, JSON.stringify(arr)) }
function loadRules() { return loadOrInit(LS_RULES, SEED_RULES) }
function saveRules(arr) { localStorage.setItem(LS_RULES, JSON.stringify(arr)) }
function loadRuns() { return loadOrInit(LS_RUNS, SEED_RUNS) }
function saveRuns(arr) { localStorage.setItem(LS_RUNS, JSON.stringify(arr)) }

// 给 my_rule 附加触发器信息 + 状态元数据
function decorateRule(rule) {
  const t = TRIGGER_MAP[rule.trigger]
  return {
    ...rule,
    triggerName: t?.name || rule.trigger,
    triggerIcon: t?.icon || 'ApiOutlined',
    triggerDesc: t?.desc || '',
    statusMeta: RULE_STATUS_META[rule.status] || RULE_STATUS_META.pending_review,
  }
}

// ===== 触发器列表（页面用） =====
export function listTriggers() {
  return clone(TRIGGERS)
}

// ===== 公共模板 =====
export function listTemplates({ status, proposer, q } = {}) {
  let arr = loadTemplates()
  if (status) arr = arr.filter((t) => t.status === status)
  else arr = arr.filter((t) => t.status === 'active') // 默认只看已上架
  if (proposer) arr = arr.filter((t) => t.proposer === proposer)
  if (q) {
    const k = String(q).trim().toLowerCase()
    arr = arr.filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(k))
  }
  return { items: arr.map((t) => ({ ...t, triggerInfo: TRIGGER_MAP[t.trigger] })), total: arr.length }
}

export function getTemplate(id) {
  const t = loadTemplates().find((x) => x.id === id)
  return t ? { ...t, triggerInfo: TRIGGER_MAP[t.trigger] } : null
}

export function submitTemplate(payload) {
  const arr = loadTemplates()
  if (arr.find((t) => t.id === payload.id)) {
    throw new Error(`模板 ID「${payload.id}」已存在`)
  }
  const doc = {
    id: payload.id,
    name: payload.name,
    trigger: payload.trigger,
    description: payload.description || '',
    action: payload.action,
    proposer: payload.proposer || '开发者',
    status: 'pending_review',
    installs: 0,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  }
  arr.push(doc)
  saveTemplates(arr)
  return { ...doc, triggerInfo: TRIGGER_MAP[doc.trigger] }
}

export function reviewTemplate(id, { decision, note, reviewer }) {
  const arr = loadTemplates()
  const idx = arr.findIndex((t) => t.id === id)
  if (idx < 0) throw new Error('模板不存在')
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
  saveTemplates(arr)
  return { ...arr[idx], triggerInfo: TRIGGER_MAP[arr[idx].trigger] }
}

// 审核队列：合并「待审规则」与「待审模板」，按提交时间倒序
export function reviewQueue() {
  const templates = loadTemplates()
  const rules = loadRules()

  const pendingTpl = templates
    .filter((t) => t.status === 'pending_review')
    .map((t) => ({ ...t, kind: 'template', triggerInfo: TRIGGER_MAP[t.trigger] }))
  const pendingRules = rules
    .filter((r) => r.status === 'pending_review')
    .map((r) => ({ ...decorateRule(r), kind: 'rule' }))

  const pending = [...pendingTpl, ...pendingRules].sort(
    (a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')),
  )

  // 已审核历史：模板和规则的 rejected + 已通过(active) —— 形成完整审核档案
  const reviewedTpl = templates
    .filter((t) => t.status === 'rejected' || t.status === 'active')
    .map((t) => ({ ...t, kind: 'template', triggerInfo: TRIGGER_MAP[t.trigger] }))
  const reviewedRules = rules
    .filter((r) => r.status === 'rejected' || r.status === 'active')
    .map((r) => ({ ...decorateRule(r), kind: 'rule' }))

  const reviewed = [...reviewedTpl, ...reviewedRules].sort(
    (a, b) => String(b.reviewedAt || '').localeCompare(String(a.reviewedAt || '')),
  )

  return {
    pending,
    reviewed,
    pendingCount: pending.length,
    templatePending: pendingTpl.length,
    rulePending: pendingRules.length,
  }
}

export function proposerTemplates(proposer) {
  const arr = loadTemplates().filter((t) => t.proposer === proposer)
  return {
    items: arr.map((t) => ({ ...t, triggerInfo: TRIGGER_MAP[t.trigger] })),
    total: arr.length,
  }
}

// ===== 我的规则 =====
export function listMyRules() {
  const rules = loadRules().map(decorateRule)
  return { items: rules, total: rules.length }
}

export function getRule(id) {
  const r = loadRules().find((x) => x.id === id)
  if (!r) return null
  const out = decorateRule(r)
  out.runs = loadRuns().filter((run) => run.ruleId === id)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  return out
}

export function createRule(payload) {
  const arr = loadRules()
  // 时间戳 + 4 位随机后缀，同毫秒多次创建也不会冲突
  const id = payload.id || `rule_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffff).toString(36)}`
  if (arr.find((r) => r.id === id)) throw new Error('规则 ID 已存在')
  // 默认进「待审核」—— 所有用户创建的规则都需要管理员审核
  const doc = {
    id,
    name: payload.name,
    trigger: payload.trigger,
    customName: payload.trigger === 'custom' ? (payload.customName || '').trim() : null,
    action: payload.action,
    enabled: false, // 待审核通过之前不允许启用
    isFromTemplate: payload.isFromTemplate || null,
    templateName: payload.templateName || null,
    proposer: DEMO_USER,
    creator: DEMO_USER,
    status: 'pending_review',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    rejectReason: null,
    createdAt: new Date().toISOString(),
  }
  arr.push(doc)
  saveRules(arr)
  return decorateRule(doc)
}

// 管理员审核规则
export function reviewRule(id, { decision, note, reviewer }) {
  const arr = loadRules()
  const idx = arr.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('规则不存在')
  if (decision === 'reject' && !(note || '').trim()) {
    throw new Error('驳回时必须填写理由')
  }
  arr[idx] = {
    ...arr[idx],
    status: decision === 'approve' ? 'active' : 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewer: reviewer || '平台管理员',
    rejectReason: decision === 'reject' ? note : null,
    // 通过时自动启用
    enabled: decision === 'approve' ? true : arr[idx].enabled,
  }
  saveRules(arr)
  return decorateRule(arr[idx])
}

export function addFromTemplate(templateId, { asDraft = false } = {}) {
  const t = getTemplate(templateId)
  if (!t) throw new Error('模板不存在或未上架')
  if (t.status !== 'active') throw new Error('该模板尚未上架')
  // 模板默认 active，通过后会启用
  const doc = {
    id: `rule_${Date.now().toString(36)}_${Math.floor(Math.random() * 0xffff).toString(36)}`,
    name: t.name,
    trigger: t.trigger,
    customName: t.trigger === 'custom' ? t.name : null,
    action: t.action,
    enabled: !asDraft,
    isFromTemplate: t.id,
    templateName: t.name,
    proposer: t.proposer,
    creator: DEMO_USER,
    status: 'active', // 从模板添加相当于已审核通过
    submittedAt: t.submittedAt || new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    rejectReason: null,
    createdAt: new Date().toISOString(),
  }
  const arr = loadRules()
  arr.push(doc)
  saveRules(arr)
  return decorateRule(doc)
}

export function toggleRule(id, enabled) {
  const arr = loadRules()
  const idx = arr.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('规则不存在')
  // 只有审核通过的规则才能启停
  if (arr[idx].status !== 'active') {
    throw new Error('规则尚未通过审核，无法切换')
  }
  arr[idx] = { ...arr[idx], enabled: enabled !== false }
  saveRules(arr)
  return decorateRule(arr[idx])
}

export function updateRule(id, patch) {
  const arr = loadRules()
  const idx = arr.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('规则不存在')
  arr[idx] = { ...arr[idx], ...patch }
  saveRules(arr)
  return decorateRule(arr[idx])
}

export function deleteRule(id) {
  saveRules(loadRules().filter((r) => r.id !== id))
  saveRuns(loadRuns().filter((run) => run.ruleId !== id))
  return { deleted: true, id }
}

// 执行一次（演示效果，模拟一次"触发→执行"）
export function simulateRun(ruleId) {
  const r = loadRules().find((x) => x.id === ruleId)
  if (!r) throw new Error('规则不存在')
  if (r.status !== 'active') throw new Error('规则尚未通过审核')
  if (!r.enabled) throw new Error('规则未启用')
  const arr = loadRuns()
  const run = {
    id: `run_${Date.now()}`,
    ruleId,
    timestamp: new Date().toISOString(),
    status: 'success',
    tokens: 30000 + Math.floor(Math.random() * 30000),
    summary: summarizeFor(r.trigger),
  }
  arr.push(run)
  saveRuns(arr)
  return run
}

function summarizeFor(trigger) {
  const map = {
    email: '处理新邮件，已生成分级与摘要',
    chat: '识别加急词，已推送提醒',
    approval: '扫描待审批，发现 1 条快超时已提醒',
    minutes: '会议结束，已生成纪要与待办',
    webhook: '收到外部信号，已按规则归并并写一行日报',
  }
  return map[trigger] || '已按规则处理触发事件'
}

// ===== 统计 =====
export function getStats() {
  const rules = loadRules()
  const templates = loadTemplates()
  const runs = loadRuns()
  const activeRules = rules.filter((r) => r.status === 'active')
  const enabled = activeRules.filter((r) => r.enabled).length
  return {
    ruleCount: rules.length,
    activeRuleCount: activeRules.length,
    enabledCount: enabled,
    disabledCount: activeRules.length - enabled,
    pendingRuleCount: rules.filter((r) => r.status === 'pending_review').length,
    rejectedRuleCount: rules.filter((r) => r.status === 'rejected').length,
    templateCount: templates.filter((t) => t.status === 'active').length,
    pendingTemplateCount: templates.filter((t) => t.status === 'pending_review').length,
    totalPending: rules.filter((r) => r.status === 'pending_review').length
      + templates.filter((t) => t.status === 'pending_review').length,
    totalRuns: runs.length,
  }
}

// ===== 重置 =====
export function resetDemo() {
  // 清空新旧版本的 key，避免老数据结构残留
  ;[
    LS_TEMPLATES, LS_RULES, LS_RUNS,
    'am_events_v1', 'am_subs_v1', // legacy v1 keys (废弃)
  ].forEach((k) => localStorage.removeItem(k))
  loadTemplates(); loadRules(); loadRuns()
  return {
    reset: true,
    rules: SEED_RULES.length,
    templates: SEED_TEMPLATES.length,
  }
}
