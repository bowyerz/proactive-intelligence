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
  { key: 'user', path: '/', label: '事件市场', icon: <ShopOutlined />, hint: '个人虾用户 / 访客' },
  { key: 'developer', path: '/developer', label: '开发者工作台', icon: <ToolOutlined />, hint: '提交会触发动作的技能' },
  { key: 'admin', path: '/admin', label: '审核工作台', icon: <SafetyCertificateOutlined />, hint: '平台管理员' },
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
          <Tooltip title="把所有数据恢复到初始演示状态（5 个上架 + 1 个待审核）">
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
