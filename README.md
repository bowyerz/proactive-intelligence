# 主动智能 · 让个人虾先你一步（Event-Triggered Action Hub）

把个人助理「龙虾」（Lobster）从「定时轮询」升级为 **事件触发的主动智能**：订阅你关心的事件，事件一发生，个人虾就主动替你执行动作。
本 Demo 用 **三个角色、三个页面** 讲清平台闭环：**浏览/订阅 → 开发者提交 → 管理员审核上架**，并用「模拟触发」直观演示事件如何被个人虾主动消费。

> ⚠️ 这是纯前端交互演示，**没有真实消息队列 / Webhook / 订阅推送**，也没有登录鉴权（通过顶部导航切换角色）。
> 部署到 GitHub Pages 的分享版**完全在浏览器内运行**：数据预烘焙进前端，订阅/提交/审核等交互状态存于浏览器 localStorage，刷新不丢，但只存在当前浏览器、不跨设备共享。

---

## 角色与页面

| 角色 | 页面 | 能做什么 |
| --- | --- | --- |
| 🦞 个人虾用户 / 访客 | 事件市场 | 浏览上架事件、搜索/筛选、查看详情（说明 + 个人虾会主动做的动作 + 模拟触发）、**让龙虾主动处理 / 取消**、看相关事件。**技术细节（Payload Schema / 示例）折叠收起**，普通用户无感 |
| 🛠️ 开发者 | 开发者工作台 | 查看自己提交的事件及状态、提交新事件 Skill（表单：ID/来源/分类/Schema/示例/场景） |
| 🛡️ 平台管理员 | 审核工作台 | 待审核队列、审核详情（自动预检清单 + Schema + 示例）、**通过 / 驳回 / 要求修改** |

预置数据（首次打开自动写入浏览器）：
- **5 个已上架**事件：`email.received`(邮件)、`feishu.message.created`(飞书)、`feishu.approval.created`(飞书)、`github.pull_request.opened`(GitHub)、`monitor.alert.triggered`(运维)
- **1 个待审核**事件：`data.warehouse.anomaly`(自定义) — 作者「张开发」

---

## 技术栈

- 前端：React 18 + Ant Design 5 + react-router-dom 6（Vite 构建）
- 分享版（GitHub Pages）：**纯静态**，数据由 `src/store.js` 在浏览器内模拟后端（localStorage 持久化），无需任何服务器
- 本地全栈版（可选）：Python FastAPI 单服务 + SQLite（见文末「本地全栈开发」）
- 零额外渲染依赖：Markdown 与 JSON 高亮均为自研轻量组件，避免离线构建失败

---

## 目录结构

```
event-market/
├── .github/workflows/deploy.yml   # 推送到 main 即自动部署到 GitHub Pages
├── backend/                       # 可选：本地全栈版后端（FastAPI + SQLite）
│   ├── app/{main,models,db,seed}.py
│   └── requirements.txt
├── frontend/
│   ├── public/.nojekyll           # 关闭 GitHub Pages 的 Jekyll 处理
│   ├── src/
│   │   ├── brand.js               # 品牌名（改一处全局换名）
│   │   ├── api.js                 # 请求封装（分享版指向 store）
│   │   ├── store.js               # 浏览器内「后端」：数据 + 逻辑 + localStorage
│   │   ├── seedData.js            # 由 backend/app/seed.py 自动生成的 6 条预置数据
│   │   ├── theme.css
│   │   ├── App.jsx                # 路由 + 顶部角色导航
│   │   ├── components/           # SourceIcon / Markdown / JsonBlock
│   │   └── pages/                # MarketPage / DeveloperPage / ReviewPage
│   └── vite.config.js            # base: './' 适配 Pages 子路径；HashRouter 免服务端配置
└── data/event_market.db          # 仅本地全栈版使用
```

---

## 部署到 GitHub Pages（给别人点开就能看）

部署后别人打开链接即可使用，无需安装任何环境。

### 方式一：一键 Fork + Actions 自动部署（推荐）

1. 把这个目录推到你自己的 GitHub 仓库（仓库默认分支需为 `main`）：
   ```bash
   cd event-market
   git init
   git add .
   git commit -m "init 主动智能 demo"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. 推送后，GitHub Actions 会自动执行 `.github/workflows/deploy.yml`（构建前端 → 部署到 `gh-pages`）。
3. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 稍等片刻，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 之后每次 `git push` 到 `main`，站点都会自动更新。

### 方式二：本地直接预览静态产物

不想建仓库也能看效果——构建后用任意静态服务器打开 `frontend/dist`：

```bash
cd event-market/frontend
npm install
npm run build
# 用 Python 起一个静态服务器（或任意静态托管工具）
python -m http.server 4173 --directory dist
# 浏览器打开 http://127.0.0.1:4173
```

> 注意：分享版用 `HashRouter`，链接形如 `…/#/developer`，**直接刷新 / 分享深链接都不会 404**。

---

## 本地全栈开发（可选，保留真实后端）

若想体验真实的 FastAPI + SQLite 后端（数据跨会话持久化）：

```bash
cd event-market
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
# 浏览器打开 http://127.0.0.1:8000
```

前后端分离热更新：再开一个终端 `cd frontend && npm install && npm run dev`（Vite 会把 `/api` 代理到 8000）。

---

## 演示脚本（建议点击顺序）

> 目标：3 分钟走完「订阅 → 提交 → 审核上架」闭环，展示主动智能的价值。

### 0. 开场（事件市场）
1. 顶部导航默认在 **事件市场**。看顶部 4 个统计卡（已可用 / 待上架 / 正在用 / 我已开启）。
2. 用搜索框搜「邮件」或按「来源 = 邮件」筛选，凸显**按需发现事件**而非全量轮询。
3. 点击「新邮件到达」卡片进入详情。

### 1. 订阅（用户视角亮点）
4. 详情页右侧「让龙虾主动处理」按钮为**蓝色主按钮**；点击后变**灰色「已开启 · 点击取消」**，统计卡「我已开启」+1。
5. 看顶部「🔔 什么时候会触发」与「🤖 龙虾会主动替你做的动作」两块友好说明——**技术细节（Payload Schema / 示例）默认折叠收起**，普通用户无感。
6. 点 **⚡ 先看一次它怎么工作**，看「事件触发 → 个人虾理解 → 主动执行 → 完成」的实时推演。

### 2. 开发者提交（打通供给端）
7. 顶部切到 **开发者工作台**。表格列出「张开发」的事件，状态有「已上架 / 审核中」。
8. 点 **提交新事件**，填写：ID=`crm.lead.created`、名称「销售线索创建」、来源「自定义」、分类「数据」。
9. 展开 Schema/示例（表单内已带模板），提交。该事件进入**审核中**状态 —— 演示「提交即进审核队列」。

### 3. 管理员审核（闭环收口）
10. 顶部切到 **审核工作台**。看到刚才提交的 `crm.lead.created` 出现在待审核队列（计数 +1）。
11. 点击该卡片打开审核抽屉：看 **自动预检清单**（描述/Schema/示例/安全/ID 唯一性，自动给出建议勾选）、Schema 与示例。
12. 点 **通过并上架** → 事件从队列消失，回到事件市场即可看到它已上架、可订阅。
13. （可选）再提交一个并点 **驳回 / 要求修改**，演示必须填写理由并反馈给开发者。

### 4. 复位
- 顶部右侧 **重置演示** 一键恢复为初始 6 条数据（仅当前浏览器），方便反复演示。

---

## 备注

- 分享版所有状态（订阅 / 提交 / 审核）存于浏览器 localStorage，换设备 / 无痕模式不共享，符合 Demo 预期。
- 无鉴权：角色靠前端导航切换，所有操作使用固定演示用户 `demo_user` / 开发者 `张开发`。
- 想换品牌名：改 `frontend/src/brand.js` 一处即可（主名、标题、副标题、slogan 一次搞定）。
