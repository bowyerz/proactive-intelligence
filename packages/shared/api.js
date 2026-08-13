// 前端 API 层。Demo 部署为纯静态站点（GitHub Pages），所有请求由浏览器端
// store.js 处理（数据在 localStorage），不依赖后端服务。
// 接口对应 v3 模型：events × preset_tasks × subscriptions × runs。

import * as store from './store.js'

export const EVENTS = store.EVENTS
export const EVENT_MAP = store.EVENT_MAP
export const SUB_STATUS_META = store.SUB_STATUS_META
export const PRESET_STATUS_META = store.PRESET_STATUS_META

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

  // 事件（常量）
  listEvents: () => wrap(() => store.listEvents()),
  getEvent: (id) => wrap(() => {
    const e = store.getEvent(id)
    if (!e) throw new Error('事件不存在')
    return e
  }),

  // 预置任务
  listPresetTasks: (params) => wrap(() => store.listPresetTasks(params || {})),
  getPresetTask: (id) => wrap(() => {
    const t = store.getPresetTask(id)
    if (!t) throw new Error('预置任务不存在')
    return t
  }),
  submitPresetTask: (payload) => wrap(() => store.submitPresetTask(payload)),
  proposerPresetTasks: (proposer) => wrap(() => store.proposerPresetTasks(proposer)),

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

  // 审核
  reviewQueue: () => wrap(() => store.reviewQueue()),
  reviewPresetTask: (id, body) => wrap(() => store.reviewPresetTask(id, body)),
  reviewSubscription: (id, body) => wrap(() => store.reviewSubscription(id, body)),

  // 重置
  resetDemo: () => wrap(() => store.resetDemo()),
}
