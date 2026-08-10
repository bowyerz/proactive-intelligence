// 前端 API 层。Demo 部署为纯静态站点（GitHub Pages）时，所有请求由浏览器端
// store.js 处理（数据在 localStorage），不再依赖后端服务。
// 接口签名与原后端 FastAPI 对齐 → 迁移到新数据模型（rule + template + run）。

import * as store from './store.js'

export const TRIGGERS = store.TRIGGERS
export const TRIGGER_MAP = store.TRIGGER_MAP
export const RULE_STATUS_META = store.RULE_STATUS_META
export const TEMPLATE_STATUS_META = {
  active: { label: '已上架', color: 'success' },
  pending_review: { label: '审核中', color: 'processing' },
  rejected: { label: '已驳回', color: 'error' },
}

async function wrap(fn) {
  return Promise.resolve().then(fn)
}

export const api = {
  // 元信息
  meta: () => wrap(() => ({
    triggers: store.listTriggers(),
    demoUser: store.DEMO_USER,
  })),

  // 统计
  stats: () => wrap(() => store.getStats()),

  // 我的规则
  listMyRules: () => wrap(() => store.listMyRules()),
  getRule: (id) => wrap(() => {
    const d = store.getRule(id)
    if (!d) throw new Error('规则不存在')
    return d
  }),
  createRule: (payload) => wrap(() => store.createRule(payload)),
  toggleRule: (id, enabled) => wrap(() => store.toggleRule(id, enabled)),
  updateRule: (id, patch) => wrap(() => store.updateRule(id, patch)),
  deleteRule: (id) => wrap(() => store.deleteRule(id)),
  simulateRun: (id) => wrap(() => store.simulateRun(id)),
  addFromTemplate: (templateId, opts) => wrap(() => store.addFromTemplate(templateId, opts)),

  // 模板
  listTemplates: (params) => wrap(() => store.listTemplates(params || {})),
  getTemplate: (id) => wrap(() => {
    const t = store.getTemplate(id)
    if (!t) throw new Error('模板不存在')
    return t
  }),
  submitTemplate: (payload) => wrap(() => store.submitTemplate(payload)),
  proposerTemplates: (proposer) => wrap(() => store.proposerTemplates(proposer)),

  // 审核
  reviewQueue: () => wrap(() => store.reviewQueue()),
  reviewTemplate: (id, body) => wrap(() => store.reviewTemplate(id, body)),
  reviewRule: (id, body) => wrap(() => store.reviewRule(id, body)),

  // 重置
  resetDemo: () => wrap(() => store.resetDemo()),
}
