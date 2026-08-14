// 前端 API 层。Demo 部署为纯静态站点（GitHub Pages），所有请求由浏览器端
// store.js 处理（数据在 localStorage），不依赖后端服务。
// 接口对应 v6 模型：用户端极简——只看到「任务」（事件仍是触发器，但用户端无感）。
// 管理后台仍负责审核「事件提案」本身，开发者创建事件、用户自建任务。

import * as store from './store.js'

export const EVENTS = store.EVENTS
export const EVENT_MAP = store.EVENT_MAP
export const SUB_STATUS_META = store.SUB_STATUS_META
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
  // 事件市场：系统事件 + 已上架的开发者提案事件（管理后台开发者/审核流程使用）
  listMarketEvents: () => wrap(() => store.listMarketEvents()),

  // 开发者提案的事件（管理后台的审核单位，**仅事件本身**）
  listProposedEvents: (params) => wrap(() => store.listProposedEvents(params || {})),
  getProposedEvent: (id) => wrap(() => {
    const pe = store.getProposedEvent(id)
    if (!pe) throw new Error('事件提案不存在')
    return pe
  }),
  submitProposedEvent: (payload) => wrap(() => store.submitProposedEvent(payload)),
  proposerProposedEvents: (proposer) => wrap(() => store.proposerProposedEvents(proposer)),

  // 订阅 / 任务（v6 用户端主入口）
  listSubscriptions: () => wrap(() => store.listSubscriptions()),
  listCurrentTasks: () => wrap(() => store.listCurrentTasks()),
  getSubscription: (id) => wrap(() => {
    const s = store.getSubscription(id)
    if (!s) throw new Error('订阅不存在')
    return s
  }),
  createSubscription: (payload) => wrap(() => store.createSubscription(payload)),
  // 与龙虾对话创建 —— 便捷入口（内部调用 createSubscription）
  createTaskFromChat: (payload) => wrap(() => store.createTaskFromChat(payload || {})),
  updateSubscriptionTasks: (id, tasks) => wrap(() => store.updateSubscriptionTasks(id, tasks)),
  toggleSubscription: (id, enabled) => wrap(() => store.toggleSubscription(id, enabled)),
  deleteSubscription: (id) => wrap(() => store.deleteSubscription(id)),

  // 执行
  simulateRun: (id) => wrap(() => store.simulateRun(id)),

  // 审核（管理后台：只审核「事件提案」本身，不审核任何任务）
  reviewQueue: () => wrap(() => store.reviewQueue()),
  reviewProposedEvent: (id, body) => wrap(() => store.reviewProposedEvent(id, body)),

  // 重置
  resetDemo: () => wrap(() => store.resetDemo()),
}