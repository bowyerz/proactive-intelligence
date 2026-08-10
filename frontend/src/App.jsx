import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { App as AntApp, Button, Space, Tag, Tooltip } from 'antd'
import { ReloadOutlined, ShopOutlined, ToolOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { api } from './api.js'
import { BRAND } from './brand.js'
import MarketPage from './pages/MarketPage.jsx'
import DeveloperPage from './pages/DeveloperPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'

const ROLES = [
  { key: 'user', path: '/', label: '我的任务', icon: <ShopOutlined />, hint: '🦞 个人虾：创建 / 启用 / 触发你自己的主动智能规则' },
  { key: 'developer', path: '/developer', label: '模板策划', icon: <ToolOutlined />, hint: '🛠️ 开发者：提交触发器 × 默认动作的模板提案' },
  { key: 'admin', path: '/admin', label: '所有任务审核', icon: <SafetyCertificateOutlined />, hint: '✅ 管理员：审核用户提交的规则与开发者提交的模板提案' },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const [resetting, setResetting] = useState(false)

  const active = ROLES.find((r) => r.path === location.pathname) || ROLES[0]

  const onReset = async () => {
    setResetting(true)
    try {
      await api.resetDemo()
      message.success('演示数据已重置')
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      message.error(e.message || '重置失败')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="logo-dot">🦞</span>
          <span>{BRAND.name}</span>
        </div>
        <nav className="app-nav">
          {ROLES.map((r) => (
            <div
              key={r.key}
              className={`nav-item ${active.key === r.key ? 'active' : ''}`}
              onClick={() => navigate(r.path)}
              title={r.hint}
            >
              {r.icon} {r.label}
            </div>
          ))}
        </nav>
        <Space size={8} wrap>
          <Tag color="orange" style={{ marginRight: 0 }}>
            Demo · 无登录
          </Tag>
          <Tooltip title="把所有数据恢复到初始演示状态（3 个已启用规则 + 1 个草稿规则 + 1 个待审用户规则 + 5 个公共模板 + 1 个待审模板）">
            <Button size="small" icon={<ReloadOutlined />} loading={resetting} onClick={onReset}>
              重置演示
            </Button>
          </Tooltip>
        </Space>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<MarketPage />} />
          <Route path="/developer" element={<DeveloperPage />} />
          <Route path="/admin" element={<ReviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
