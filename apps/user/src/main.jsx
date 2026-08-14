import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.jsx'
import '@shared/theme.css'
import './App.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 用户端主色：清爽蓝（任务清单 / 龙虾对话），区别于管理后台的橙（fa541c）
          colorPrimary: '#2f54eb',
          colorInfo: '#2f54eb',
          colorLink: '#2f54eb',
          borderRadius: 10,
          fontSize: 14,
        },
      }}
    >
      <AntApp>
        <HashRouter>
          <App />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
)
