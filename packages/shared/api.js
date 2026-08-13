// 前端 API 层。Demo 部署为纯静态站点（GitHub Pages），所有请求由浏览器端
// store.js 处理（数据在 localStorage），不依赖后端服务。
// 接口对应 v4 模型：system_events × proposed_events × preset_tasks × subscriptions × runs。

import * as store from './store.js'

export const EVENTS = store.EVENTS
export const EVENT_MAP = store.EVENT_MAP
export const SUB_STATUS_META = store.SUB_STATUS_META
export const PRESET_STATUS_META = store.PRESET_STATUS_META
export const PROPOSED_EVENT_STATUS_META = store.PROPOSED_EVENT_STATUS_META

async function wrap(fn) {
  return Promise.resolve().then(fn)
}

export const api = {
  // 元信息
  meta: () => wrap(() => ({
    events: store.listEvents(),
    demoUser: store.DEMO_USER,
  })),

  // 统计
  stats: () => wrap(() => store.getStats()),

  // 事件
  listEvents: () => wrap(() => store.listEvents()),
  getEvent: (id) => wrap(() => {
    const e = store.getEvent(id)
    if (!e) throw new Error('事件不存在')
    return e
  }),
  // 事件市场：系统事件 + 已上架的开发者提案事件
  listMarketEvents: () => wrap(() => store.listMarketEvents()),

  // 开发者提案的事件（管理后台的审核单位）
  listProposedEvents: (params) => wrap(() => store.listProposedEvents(params || {})),
  getProposedEvent: (id) => wrap(() => {
    const pe = store.getProposedEvent(id)
    if (!pe) throw new Error('事件提案不存在')
    return pe
  }),
  submitProposedEvent: (payload) => wrap(() => store.submitProposedEvent(payload)),
  proposerProposedEvents: (proposer) => wrap(() => store.proposerProposedEvents(proposer)),

  // 预置任务（订阅用的成品）
  listPresetTasks: (params) => wrap(() => store.listPresetTasks(params || {})),
  getPresetTask: (id) => wrap(() => {
    const t = store.getPresetTask(id)
    if (!t) throw new Error('预置任务不存在')
    return t
  }),

  // 订阅
  listSubscriptions: () => wrap(() => store.listSubscriptions()),
  getSubscription: (id) => wrap(() => {
    const s = store.getSubscription(id)
    if (!s) throw new Error('订阅不存在')
    return s
  }),
  createSubscription: (payload) => wrap(() => store.createSubscription(payload)),
  toggleSubscription: (id, enabled) => wrap(() => store.toggleSubscription(id, enabled)),
  deleteSubscription: (id) => wrap(() => store.deleteSubscription(id)),

  // 执行
  simulateRun: (id) => wrap(() => store.simulateRun(id)),

  // 审核（v4：只审核「事件提案」）
  reviewQueue: () => wrap(() => store.reviewQueue()),
  reviewProposedEvent: (id, body) => wrap(() => store.reviewProposedEvent(id, body)),

  // 重置
  resetDemo: () => wrap(() => store.resetDemo()),
}