import { useEffect, useState, useCallback } from 'react'
import { App as AntApp, Tag, Modal } from 'antd'
import {
  ArrowLeftOutlined, ArrowRightOutlined,
  RotateLeftOutlined, MinusOutlined,
  BorderOutlined, CloseOutlined, MoreOutlined,
} from '@ant-design/icons'
import { api } from '@shared/api.js'
import { BRAND } from '@shared/brand.js'
import ScheduledPage from './pages/ScheduledPage.jsx'
import CurrentPage from './pages/CurrentPage.jsx'
import TaskDetailPage from './pages/TaskDetailPage.jsx'
import LobsterChatPanel from './components/LobsterChatPanel.jsx'

export default function App() {
  const { message, modal } = AntApp.useApp()
  const [activeTab, setActiveTab] = useState('scheduled')
  const [detailId, setDetailId] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  // 触发器：list 改了（创建/删除/触发）后自增，让 children 重拉数据
  const [refreshTick, setRefreshTick] = useState(0)
  const bumpRefresh = useCallback(() => setRefreshTick((x) => x + 1), [])

  // 浏览器返回 / 前进
  const goBack = () => window.history.back()
  const goForward = () => window.history.forward()
  const reload = () => window.location.reload()

  // 重置演示数据
  const onReset = () => {
    modal.confirm({
      title: '重置全部演示数据？',
      content: '会把 5 条示例任务 + 它们的执行记录全部恢复到初始状态。',
      okText: '重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setResetting(true)
        try {
          await api.resetDemo()
          message.success('已重置')
          setTimeout(() => window.location.reload(), 300)
        } catch (e) {
          message.error(e.message || '重置失败')
          setResetting(false)
        }
      },
    })
  }

  if (detailId) {
    return (
      <TaskDetailPage
        id={detailId}
        onBack={() => setDetailId(null)}
        onChanged={bumpRefresh}
      />
    )
  }

  return (
    <div className="ua-shell">
      {/* ===== macOS 风格顶栏 ===== */}
      <div className="ua-topbar">
        <button className="ua-window-btn" onClick={goBack} title="后退"><ArrowLeftOutlined /></button>
        <button className="ua-window-btn" onClick={goForward} title="前进"><ArrowRightOutlined /></button>
        <button className="ua-window-btn" onClick={reload} title="刷新"><RotateLeftOutlined /></button>
        <div className="ua-topbar-spacer" />
        <Tag color="orange" style={{ marginRight: 8 }}>Demo · 无登录</Tag>
        <button className="ua-topbar-portal" onClick={() => (window.location.href = '../')}>
          门户首页
        </button>
        <button className="ua-topbar-reset" onClick={onReset} disabled={resetting}>
          {resetting ? '重置中…' : '重置演示'}
        </button>
        <button className="ua-window-btn" title="—" disabled><MinusOutlined /></button>
        <button className="ua-window-btn" title="□" disabled><BorderOutlined /></button>
        <button className="ua-window-btn" title="×" disabled><CloseOutlined /></button>
        <button className="ua-window-btn" title="···" disabled><MoreOutlined /></button>
      </div>

      {/* ===== 页面标题 + Tab ===== */}
      <div className="ua-page-head">
          <div className="ua-page-title">
          任务中心
          <span className="ua-page-tag">v7 · 事件触发</span>
        </div>
      </div>
      <div className="ua-tabs">
        <div
          className={`ua-tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          事件任务
        </div>
        <div
          className={`ua-tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          当前任务
        </div>
      </div>

      {/* ===== 主列表 ===== */}
      {activeTab === 'scheduled' ? (
        <ScheduledPage
          refreshTick={refreshTick}
          onOpenDetail={setDetailId}
          onChanged={bumpRefresh}
        />
      ) : (
        <CurrentPage
          refreshTick={refreshTick}
          onOpenDetail={setDetailId}
          onChanged={bumpRefresh}
        />
      )}

      {/* ===== 浮动 Pill：与龙虾对话 ===== */}
      <div className="ua-chat-pill" onClick={() => setChatOpen(true)}>
        <span className="ua-pill-emoji">💬</span>
        与龙虾对话，创建事件任务
        <span className="ua-pill-caret">~</span>
      </div>

      {/* ===== 抽屉：与龙虾对话 ===== */}
      <Modal
        open={chatOpen}
        onCancel={() => setChatOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
        title={null}
        closable={false}
        styles={{
          body: { padding: 0 },
          content: { padding: 0, borderRadius: 16, overflow: 'hidden' },
        }}
      >
        <LobsterChatPanel
          onClose={() => setChatOpen(false)}
          onCreated={() => { bumpRefresh(); setChatOpen(false) }}
        />
      </Modal>
    </div>
  )
}
