"""预置演示数据（对应需求文档第三章）。

初始化时写入 5 个「已上架」事件 + 1 个「审核中」事件。
"""
from __future__ import annotations

from typing import Any

from . import db
from .models import now_iso

SEED_EVENTS: list[dict[str, Any]] = [
    # ---------------------------------------------------------------- 1
    {
        "id": "email.received",
        "name": "新邮件到达",
        "source": "邮件",
        "category": "communication",
        "categories": ["communication"],
        "description": "用户收到新邮件时触发，支持关键词过滤",
        "detail": """### 这个事件是什么

订阅后，你的邮箱每收到一封新邮件，平台会在**秒级**把邮件内容推送给你的个人助理，
不再需要助理每 5 分钟去轮询一次收件箱。

### 什么时候触发

- 邮箱收到新邮件（含抄送、密送）的瞬间
- 支持在订阅时配置**过滤条件**，例如只推送标题含「紧急 / urgent / P0」的邮件

### 能帮你解决什么

- **秒级感知**：重要邮件到达 5 秒内收到助理提醒，不再错过
- **省配额**：邮件场景的定时轮询调用量下降 90% 以上
- **自动起草**：助理可在收到事件后直接生成回复草稿，等你一句话确认

> 注意：附件内容不随事件推送，只推送附件元信息（文件名/大小/类型）。
""",
        "schema": {
            "type": "object",
            "required": ["messageId", "from", "subject", "receivedAt"],
            "properties": {
                "messageId": {"type": "string", "description": "邮件唯一 ID"},
                "from": {"type": "string", "description": "发件人邮箱"},
                "to": {"type": "array", "items": {"type": "string"}, "description": "收件人列表"},
                "subject": {"type": "string", "description": "邮件主题"},
                "body": {"type": "string", "description": "正文纯文本"},
                "receivedAt": {"type": "string", "format": "date-time", "description": "收信时间"},
                "attachments": {
                    "type": "array",
                    "description": "附件元信息",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "size": {"type": "integer"},
                            "type": {"type": "string"},
                        },
                    },
                },
            },
        },
        "examples": [
            {
                "messageId": "<CAF=abc123@mail.example.com>",
                "from": "ops-alert@example.com",
                "to": ["me@example.com"],
                "subject": "【紧急】生产环境数据库连接池耗尽",
                "body": "P0 告警：order-db 连接池使用率 100%，请立即处理。",
                "receivedAt": "2026-08-07T16:00:00+08:00",
                "attachments": [{"name": "metrics.png", "size": 20480, "type": "image/png"}],
            },
            {
                "messageId": "<CAF=xyz789@mail.example.com>",
                "from": "hr@example.com",
                "to": ["me@example.com", "team@example.com"],
                "subject": "本周五团建报名截止提醒",
                "body": "请在周四 18:00 前完成报名。",
                "receivedAt": "2026-08-07T09:12:00+08:00",
                "attachments": [],
            },
        ],
        "scenarios": [
            "客户在邮件里追问方案进度 —— 助理立刻提醒你，并把历史沟通记录一起附上",
            "监控系统发出 P0 告警邮件 —— 助理秒级推送到手机，并自动拉起值班群",
            "合同/发票类邮件到达 —— 助理识别附件类型后自动归档到对应项目文件夹",
        ],
        "subscriberCount": 1284,
        "status": "active",
        "author": "平台官方",
        "authorContact": "platform@lobster.ai",
        "submittedAt": "2026-07-12T10:20:00+08:00",
        "reviewedAt": "2026-07-13T11:00:00+08:00",
    },
    # ---------------------------------------------------------------- 2
    {
        "id": "feishu.message.created",
        "name": "群消息到达",
        "source": "飞书",
        "category": "communication",
        "categories": ["communication"],
        "description": "机器人所在群有新消息时触发",
        "detail": """### 这个事件是什么

助理机器人所在的飞书群里，只要有人发言就会触发该事件，把消息内容推送给你的助理。

### 什么时候触发

- 群聊 / 单聊中有新消息（文本、富文本、图片、文件）
- 可按**关键词**、**群 ID**、**发送人**过滤，避免刷屏

### 能帮你解决什么

- **关键词值守**：群里出现「紧急 / 故障 / 上线」时立刻单独提醒你
- **自动归纳**：助理按小时汇总群内讨论要点，不用回头爬楼
- **免打扰**：只有命中规则的消息才会打扰你，其余静默

> 建议配合过滤规则使用，否则活跃群会产生大量事件。
""",
        "schema": {
            "type": "object",
            "required": ["chatId", "content"],
            "properties": {
                "chatId": {"type": "string", "description": "会话 ID"},
                "messageId": {"type": "string", "description": "消息 ID"},
                "messageType": {"type": "string", "enum": ["text", "post", "image", "file"]},
                "content": {"type": "string", "description": "消息文本内容"},
                "chatType": {"type": "string", "enum": ["group", "p2p"]},
                "sender": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                    },
                },
                "createdAt": {"type": "string", "format": "date-time"},
            },
        },
        "examples": [
            {
                "chatId": "oc_9f1b2c8e",
                "messageId": "om_88a1f0",
                "messageType": "text",
                "content": "紧急：生产环境数据库连接异常，谁在值班？",
                "chatType": "group",
                "sender": {"id": "ou_7d3e", "name": "张三"},
                "createdAt": "2026-08-07T16:02:11+08:00",
            }
        ],
        "scenarios": [
            "研发群里有人喊「线上故障」—— 助理立即把上下文整理成工单推给值班同学",
            "客户群提到「续约 / 报价」—— 助理提醒销售负责人并调出上次报价单",
            "每天 19:00 助理自动汇总当天群内待办，形成一条清单",
        ],
        "subscriberCount": 967,
        "status": "active",
        "author": "平台官方",
        "authorContact": "platform@lobster.ai",
        "submittedAt": "2026-07-12T10:25:00+08:00",
        "reviewedAt": "2026-07-13T11:05:00+08:00",
    },
    # ---------------------------------------------------------------- 3
    {
        "id": "feishu.approval.created",
        "name": "审批创建",
        "source": "飞书",
        "category": "approval",
        "categories": ["approval"],
        "description": "有人提交审批流时触发",
        "detail": """### 这个事件是什么

当有人发起一条需要你审批的流程（报销、采购、请假、用印等），事件会第一时间到达助理。

### 什么时候触发

- 审批实例被创建，且当前处理人包含你
- 可按**审批类型**、**金额区间**、**发起人部门**过滤

### 能帮你解决什么

- **不再压单**：审批到达即提醒，避免流程卡在你这里
- **辅助决策**：助理自动附上该申请人的历史审批记录与预算余量
- **批量处理**：小额、常规审批可配置助理给出建议，你一键确认
""",
        "schema": {
            "type": "object",
            "required": ["instanceCode", "approvalName", "applicant"],
            "properties": {
                "instanceCode": {"type": "string", "description": "审批实例编号"},
                "approvalName": {"type": "string", "description": "审批模板名称"},
                "applicant": {"type": "string", "description": "发起人"},
                "department": {"type": "string", "description": "发起人部门"},
                "amount": {"type": "number", "description": "涉及金额（元），无金额时为 0"},
                "status": {"type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"]},
                "createdAt": {"type": "string", "format": "date-time"},
            },
        },
        "examples": [
            {
                "instanceCode": "AP-20260807-0031",
                "approvalName": "服务器采购申请",
                "applicant": "李四",
                "department": "基础架构部",
                "amount": 128000,
                "status": "PENDING",
                "createdAt": "2026-08-07T14:30:00+08:00",
            }
        ],
        "scenarios": [
            "大额采购审批到达 —— 助理同时拉出本季度预算执行情况供你判断",
            "重复报销风险 —— 助理比对历史单据，提示疑似重复提交",
            "出差审批 —— 助理顺手查好机票酒店价格，附在提醒里",
        ],
        "subscriberCount": 452,
        "status": "active",
        "author": "平台官方",
        "authorContact": "platform@lobster.ai",
        "submittedAt": "2026-07-14T09:00:00+08:00",
        "reviewedAt": "2026-07-14T15:40:00+08:00",
    },
    # ---------------------------------------------------------------- 4
    {
        "id": "github.pull_request.opened",
        "name": "PR 创建",
        "source": "GitHub",
        "category": "development",
        "categories": ["development"],
        "description": "有人在指定仓库提了 PR",
        "detail": """### 这个事件是什么

指定仓库中有新的 Pull Request 被创建时触发，把 PR 标题、作者、改动范围推送给助理。

### 什么时候触发

- PR 状态从无到有（`opened`）
- 可按**仓库**、**目标分支**、**改动文件数**、**作者**过滤

### 能帮你解决什么

- **及时评审**：作为 Reviewer 时第一时间收到提醒，缩短 PR 停留时长
- **自动预审**：助理先跑一遍 lint / 影响面分析，把结论贴在提醒里
- **发布把关**：命中 `main` 分支的 PR 单独高亮提醒
""",
        "schema": {
            "type": "object",
            "required": ["repo", "number", "title", "author"],
            "properties": {
                "repo": {"type": "string", "description": "仓库全名 owner/name"},
                "number": {"type": "integer", "description": "PR 编号"},
                "title": {"type": "string"},
                "author": {"type": "string"},
                "base": {"type": "string", "description": "目标分支"},
                "head": {"type": "string", "description": "来源分支"},
                "changedFiles": {"type": "integer"},
                "additions": {"type": "integer"},
                "deletions": {"type": "integer"},
                "url": {"type": "string", "format": "uri"},
            },
        },
        "examples": [
            {
                "repo": "lobster/event-market",
                "number": 42,
                "title": "feat: 事件市场支持分类筛选",
                "author": "wangwu",
                "base": "main",
                "head": "feature/category-filter",
                "changedFiles": 12,
                "additions": 486,
                "deletions": 73,
                "url": "https://github.com/lobster/event-market/pull/42",
            }
        ],
        "scenarios": [
            "有人向 main 分支提 PR —— 助理立刻提醒并附上改动摘要",
            "PR 改动超过 500 行 —— 助理提示「建议拆分」并 @ 作者",
            "外部贡献者首次提 PR —— 助理自动回复贡献指南",
        ],
        "subscriberCount": 733,
        "status": "active",
        "author": "平台官方",
        "authorContact": "platform@lobster.ai",
        "submittedAt": "2026-07-15T16:10:00+08:00",
        "reviewedAt": "2026-07-16T10:00:00+08:00",
    },
    # ---------------------------------------------------------------- 5
    {
        "id": "monitor.alert.triggered",
        "name": "监控告警",
        "source": "运维",
        "category": "monitoring",
        "categories": ["monitoring"],
        "description": "监控系统检测到异常时触发",
        "detail": """### 这个事件是什么

对接 Prometheus / 云监控等告警源，异常发生时**秒级**推送给助理。
这是最能体现「事件驱动 vs 定时轮询」价值的场景 —— Cron 最短分钟级，而告警要求秒级。

### 什么时候触发

- 告警规则从 `resolved` 变为 `firing`
- 可按**服务名**、**告警等级**、**指标阈值**过滤，例如只订阅 `severity = critical`

### 能帮你解决什么

- **秒级响应**：从告警产生到助理提醒 < 3 秒（P99）
- **降噪**：只有 critical 级别才打扰你，warning 汇总成日报
- **辅助排障**：助理自动附上最近一次发布记录与相关日志片段
""",
        "schema": {
            "type": "object",
            "required": ["alertName", "severity", "service"],
            "properties": {
                "alertName": {"type": "string", "description": "告警规则名"},
                "severity": {"type": "string", "enum": ["info", "warning", "critical"]},
                "service": {"type": "string", "description": "受影响服务"},
                "summary": {"type": "string", "description": "告警摘要"},
                "value": {"type": "number", "description": "触发时的指标值"},
                "threshold": {"type": "number", "description": "阈值"},
                "firedAt": {"type": "string", "format": "date-time"},
                "runbookUrl": {"type": "string", "format": "uri"},
            },
        },
        "examples": [
            {
                "alertName": "HighErrorRate",
                "severity": "critical",
                "service": "order-api",
                "summary": "5xx 错误率 12.3% 持续 5 分钟",
                "value": 12.3,
                "threshold": 1.0,
                "firedAt": "2026-08-07T15:58:42+08:00",
                "runbookUrl": "https://wiki.example.com/runbook/high-error-rate",
            }
        ],
        "scenarios": [
            "核心接口错误率飙升 —— 助理秒级推送并自动建值班群",
            "磁盘使用率超过 90% —— 助理提前 2 小时预警并给出清理建议",
            "告警恢复 —— 助理自动补一条「已恢复」，避免你反复确认",
        ],
        "subscriberCount": 1105,
        "status": "active",
        "author": "平台官方",
        "authorContact": "platform@lobster.ai",
        "submittedAt": "2026-07-16T11:30:00+08:00",
        "reviewedAt": "2026-07-16T18:20:00+08:00",
    },
    # ------------------------------------------------- 6（待审核，演示用）
    {
        "id": "data.warehouse.anomaly",
        "name": "数据仓库异常",
        "source": "自定义",
        "category": "data",
        "categories": ["data", "monitoring"],
        "description": "离线任务产出的核心指标出现异常波动时触发",
        "detail": """### 这个事件是什么

数仓每日离线任务跑完后会做一次指标校验，当核心指标（GMV、订单量、DAU 等）
相对前 7 日均值波动超过阈值时，判定为异常并触发事件。

### 什么时候触发

- 离线任务完成且校验规则命中异常
- 每个指标每天最多触发一次，避免重复打扰

### 能帮你解决什么

- 早上打开电脑前就知道昨天数据有没有问题
- 助理自动附上同比 / 环比曲线与可能的归因维度

### 注意事项

- 依赖数仓 `dw_metric_daily` 表，任务延迟会导致事件延迟
- 阈值默认 ±15%，可在订阅时覆盖
""",
        "schema": {
            "type": "object",
            "required": ["metric", "bizDate", "value", "deviation"],
            "properties": {
                "metric": {"type": "string", "description": "指标名"},
                "bizDate": {"type": "string", "description": "业务日期 YYYY-MM-DD"},
                "value": {"type": "number", "description": "当日指标值"},
                "baseline": {"type": "number", "description": "前 7 日均值"},
                "deviation": {"type": "number", "description": "偏离比例，正负号表示方向"},
                "dimension": {"type": "string", "description": "可能的归因维度"},
                "reportUrl": {"type": "string", "format": "uri"},
            },
        },
        "examples": [
            {
                "metric": "daily_gmv",
                "bizDate": "2026-08-06",
                "value": 8420000,
                "baseline": 10530000,
                "deviation": -0.2,
                "dimension": "channel=app_push",
                "reportUrl": "https://dw.example.com/report/daily_gmv/2026-08-06",
            }
        ],
        "scenarios": [
            "昨日 GMV 下跌 20% —— 助理早上 8 点主动汇报并附归因分析",
            "某渠道订单量异常翻倍 —— 助理提示可能存在刷单风险",
        ],
        "subscriberCount": 0,
        "status": "pending_review",
        "author": "张开发",
        "authorContact": "zhangkf@example.com",
        "submittedAt": "2026-08-07T11:45:00+08:00",
        "reviewedAt": None,
    },
]


def seed(force: bool = False) -> int:
    written = 0
    for item in SEED_EVENTS:
        if not force and db.get_event(item["id"]):
            continue
        doc = dict(item)
        doc.setdefault("rejectReason", None)
        doc.setdefault("reviewNote", None)
        doc.setdefault("reviewedAt", None)
        doc.setdefault("submittedAt", now_iso())
        db.save_event(doc)
        written += 1
    return written
