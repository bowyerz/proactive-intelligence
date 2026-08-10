// 前端 API 层。Demo 部署为纯静态站点（GitHub Pages）时，所有请求由浏览器端
// store.js 处理（数据在 localStorage），不再依赖后端服务。
// 接口签名与后端 FastAPI 保持一致，页面代码无需改动。

import * as store from './store.js'

export const CATEGORY_LABELS = store.CATEGORY_LABELS
export const SOURCE_COLORS = store.SOURCE_COLORS
export const STATUS_META = store.STATUS_META

async function wrap(fn) {
  // 用 microtask 包装，保持与真实网络请求一致的异步语义
  return Promise.resolve().then(fn)
}

export const api = {
  meta: () => wrap(() => ({
    categories: Object.entries(store.CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
    sources: Object.entries(store.SOURCE_COLORS).map(([value, color]) => ({ value, color })),
    statuses: [
      { value: 'active', label: '已上架', color: 'success' },
      { value: 'pending_review', label: '审核中', color: 'processing' },
      { value: 'rejected', label: '已驳回', color: 'error' },
      { value: 'draft', label: '草稿', color: 'default' },
    ],
    demoUser: store.DEMO_USER,
  })),

  stats: () => wrap(() => store.getStats()),

  listEvents: (params) => wrap(() => store.listEvents(params || {})),
  getEvent: (id) => wrap(() => {
    const d = store.getEvent(id)
    if (!d) throw new Error('事件不存在')
    return d
  }),

  mySubscriptions: () => wrap(() => store.mySubscriptions()),
  subscribe: (eventId) => wrap(() => store.subscribe(eventId)),
  unsubscribe: (eventId) => wrap(() => store.unsubscribe(eventId)),

  devEvents: (author) => wrap(() => store.devEvents(author)),
  submitEvent: (payload) => wrap(() => store.submitEvent(payload)),
  resubmitEvent: (id, payload) => wrap(() => store.resubmitEvent(id, payload)),
  deleteEvent: (id) => wrap(() => store.deleteEvent(id)),

  reviewQueue: () => wrap(() => store.reviewQueue()),
  reviewDetail: (id) => wrap(() => store.reviewDetail(id)),
  review: (id, body) => wrap(() => store.review(id, body)),

  resetDemo: () => wrap(() => store.resetDemo()),
}
