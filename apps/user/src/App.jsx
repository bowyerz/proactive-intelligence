import { useState } from 'react'
import { App as AntApp, Button, Space, Tag, Tooltip } from 'antd'
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons'
import { api } from '@shared/api.js'
import { BRAND } from '@shared/brand.js'
import MarketPage from './pages/MarketPage.jsx'

export default function App() {
  const { message } = AntApp.useApp()
  const [resetting, setResetting] = useState(false)

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
        <div className="app-logo" onClick={() => { window.location.href = '../' }} style={{ cursor: 'pointer' }}>
          <span className="logo-dot">🦞</span>
          <span>{BRAND.name}</span>
          <span style={{ opacity: 0.55, fontSize: 12, marginLeft: 8, fontWeight: 400 }}>我的任务</span>
        </div>
        <Space size={8} wrap>
          <Button size="small" icon={<HomeOutlined />} href="../">门户首页</Button>
          <Tag color="orange" style={{ marginRight: 0 }}>Demo · 无登录</Tag>
          <Tooltip title="把所有数据恢复到初始演示状态">
            <Button size="small" icon={<ReloadOutlined />} loading={resetting} onClick={onReset}>
              重置演示
            </Button>
          </Tooltip>
        </Space>
      </header>

      <main className="app-content">
        <MarketPage />
      </main>
    </>
  )
}
