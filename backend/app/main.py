"""事件订阅平台 Demo —— FastAPI 单服务后端。

角色说明（Demo 无认证，通过前端导航栏切换）：
- 个人虾用户：浏览事件市场、查看详情、安装/取消订阅
- 开发者：提交新事件、查看自己提交的事件状态
- 平台管理员：审核队列，通过 / 驳回 / 要求修改
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .models import (
    CATEGORIES, SOURCE_COLORS, EventSubmit, ReviewAction, SubscribeRequest,
    gen_id, now_iso,
)
from .seed import seed

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)-7s %(message)s")
log = logging.getLogger("event-market")

DEMO_USER = "demo_user"
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.connect()
    n = seed()
    log.info("SQLite: %s", db.DB_PATH)
    if n:
        log.info("预置演示数据写入 %d 条事件", n)
    log.info("事件市场 Demo 已就绪 → http://127.0.0.1:8000/")
    yield
    db.close()


app = FastAPI(
    title="事件订阅平台 Demo · 事件 Skill 市场",
    version="1.0.0",
    description="把个人助理从「定时轮询」升级为「事件驱动订阅」的事件 Skill 市场演示后端。",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# 工具
# --------------------------------------------------------------------------

def _decorate(doc: dict[str, Any], user_id: str = DEMO_USER) -> dict[str, Any]:
    """补充前端需要的派生字段。"""
    out = dict(doc)
    extra = db.count_subscriptions(doc["id"])
    out["subscriberCount"] = (doc.get("subscriberCount") or 0) + extra
    out["subscribed"] = db.is_subscribed(user_id, doc["id"])
    out["sourceColor"] = SOURCE_COLORS.get(doc["source"], "purple")
    out["categoryLabels"] = [CATEGORIES.get(c, c)
                             for c in (doc.get("categories") or [doc.get("category")])
                             if c]
    return out


# --------------------------------------------------------------------------
# 元数据
# --------------------------------------------------------------------------

@app.get("/api/meta", tags=["meta"], summary="分类 / 来源 / 状态字典")
async def meta() -> dict[str, Any]:
    return {
        "categories": [{"value": k, "label": v} for k, v in CATEGORIES.items()],
        "sources": [{"value": k, "color": v} for k, v in SOURCE_COLORS.items()],
        "statuses": [
            {"value": "active", "label": "已上架", "color": "success"},
            {"value": "pending_review", "label": "审核中", "color": "processing"},
            {"value": "rejected", "label": "已驳回", "color": "error"},
            {"value": "draft", "label": "草稿", "color": "default"},
        ],
        "demoUser": DEMO_USER,
    }


@app.get("/api/stats", tags=["meta"], summary="首页概览数字")
async def stats() -> dict[str, Any]:
    by_status = db.count_events_by_status()
    active = db.list_events(status="active")
    return {
        "byStatus": by_status,
        "activeCount": by_status.get("active", 0),
        "pendingCount": by_status.get("pending_review", 0),
        "totalSubscribers": sum((e.get("subscriberCount") or 0) for e in active),
        "mySubscriptions": len(db.list_subscriptions(DEMO_USER)),
    }


# --------------------------------------------------------------------------
# 事件市场（用户视角）
# --------------------------------------------------------------------------

@app.get("/api/events", tags=["events"], summary="事件列表")
async def list_events(
    status: Optional[str] = Query(default=None, description="缺省只返回已上架"),
    category: Optional[str] = None,
    source: Optional[str] = None,
    author: Optional[str] = None,
    q: Optional[str] = None,
    include_all: bool = Query(default=False, alias="includeAll"),
) -> dict[str, Any]:
    if status:
        docs = db.list_events(status=status, category=category, source=source,
                              author=author, q=q)
    elif include_all:
        docs = db.list_events(category=category, source=source, author=author, q=q)
    else:
        docs = db.list_events(status="active", category=category, source=source,
                              author=author, q=q)
    items = [_decorate(d) for d in docs]
    items.sort(key=lambda x: -x["subscriberCount"])
    return {"items": items, "total": len(items)}


@app.get("/api/events/{event_id}", tags=["events"], summary="事件详情")
async def get_event(event_id: str) -> dict[str, Any]:
    doc = db.get_event(event_id)
    if not doc:
        raise HTTPException(404, "事件不存在")
    out = _decorate(doc)
    out["related"] = _related(doc)
    return out


def _related(doc: dict[str, Any], limit: int = 3) -> list[dict[str, Any]]:
    """相关事件推荐：同分类优先，其次同来源，最后按订阅数补齐。"""
    pool = [e for e in db.list_events(status="active") if e["id"] != doc["id"]]
    same_cat = [e for e in pool if e["category"] == doc["category"]]
    same_src = [e for e in pool if e["source"] == doc["source"] and e not in same_cat]
    rest = [e for e in pool if e not in same_cat and e not in same_src]
    rest.sort(key=lambda x: -(x.get("subscriberCount") or 0))
    picked = (same_cat + same_src + rest)[:limit]
    return [_decorate(e) for e in picked]


# --------------------------------------------------------------------------
# 订阅（Demo 中仅做状态记录）
# --------------------------------------------------------------------------

@app.get("/api/subscriptions", tags=["subscriptions"], summary="我的订阅")
async def my_subscriptions(user_id: str = Query(default=DEMO_USER, alias="userId")) -> dict[str, Any]:
    subs = db.list_subscriptions(user_id)
    items = []
    for s in subs:
        ev = db.get_event(s["eventId"])
        if ev:
            items.append({**s, "event": _decorate(ev, user_id)})
    return {"items": items, "total": len(items)}


@app.post("/api/subscriptions", tags=["subscriptions"], status_code=201, summary="安装订阅")
async def subscribe(payload: SubscribeRequest) -> dict[str, Any]:
    ev = db.get_event(payload.event_id)
    if not ev:
        raise HTTPException(404, "事件不存在")
    if ev["status"] != "active":
        raise HTTPException(400, "该事件尚未上架，无法订阅")
    created = db.add_subscription({
        "id": gen_id("sub"),
        "userId": payload.user_id,
        "eventId": payload.event_id,
        "subscribedAt": now_iso(),
    })
    return {"subscribed": True, "created": created,
            "event": _decorate(ev, payload.user_id)}


@app.delete("/api/subscriptions/{event_id}", tags=["subscriptions"], summary="取消订阅")
async def unsubscribe(event_id: str,
                      user_id: str = Query(default=DEMO_USER, alias="userId")) -> dict[str, Any]:
    removed = db.remove_subscription(user_id, event_id)
    if not removed:
        raise HTTPException(404, "未找到该订阅")
    ev = db.get_event(event_id)
    return {"subscribed": False, "event": _decorate(ev, user_id) if ev else None}


# --------------------------------------------------------------------------
# 开发者工作台
# --------------------------------------------------------------------------

@app.get("/api/dev/events", tags=["developer"], summary="我提交的事件")
async def dev_events(author: str = Query(default="张开发")) -> dict[str, Any]:
    docs = db.list_events(author=author)
    return {"items": [_decorate(d) for d in docs], "total": len(docs)}


@app.post("/api/dev/events", tags=["developer"], status_code=201, summary="提交新事件")
async def submit_event(payload: EventSubmit) -> dict[str, Any]:
    existing = db.get_event(payload.id)
    if existing and existing["status"] != "draft":
        raise HTTPException(409, f"事件 ID「{payload.id}」已存在，请更换")
    categories = payload.categories or ["communication"]
    doc = {
        "id": payload.id,
        "name": payload.name,
        "source": payload.source,
        "category": categories[0],
        "categories": categories,
        "description": payload.description,
        "detail": payload.detail,
        "schema": payload.schema_,
        "examples": payload.examples,
        "scenarios": payload.scenarios,
        "subscriberCount": 0,
        "status": "pending_review",
        "author": payload.author,
        "authorContact": payload.author_contact,
        "rejectReason": None,
        "reviewNote": None,
        "submittedAt": now_iso(),
        "reviewedAt": None,
    }
    db.save_event(doc)
    log.info("开发者提交事件 %s（%s）", doc["id"], doc["name"])
    return _decorate(doc)


@app.put("/api/dev/events/{event_id}", tags=["developer"], summary="修改后重新提交")
async def resubmit_event(event_id: str, payload: EventSubmit) -> dict[str, Any]:
    doc = db.get_event(event_id)
    if not doc:
        raise HTTPException(404, "事件不存在")
    categories = payload.categories or doc.get("categories") or ["communication"]
    doc.update({
        "name": payload.name,
        "source": payload.source,
        "category": categories[0],
        "categories": categories,
        "description": payload.description,
        "detail": payload.detail,
        "schema": payload.schema_,
        "examples": payload.examples,
        "scenarios": payload.scenarios,
        "authorContact": payload.author_contact or doc.get("authorContact", ""),
        "status": "pending_review",
        "rejectReason": None,
        "reviewNote": None,
        "submittedAt": now_iso(),
        "reviewedAt": None,
    })
    db.save_event(doc)
    return _decorate(doc)


@app.delete("/api/dev/events/{event_id}", tags=["developer"], summary="删除自己的事件")
async def delete_event(event_id: str) -> dict[str, Any]:
    doc = db.get_event(event_id)
    if not doc:
        raise HTTPException(404, "事件不存在")
    if doc.get("author") == "平台官方":
        raise HTTPException(403, "官方预置事件不可删除")
    db.delete_event(event_id)
    return {"deleted": True, "id": event_id}


# --------------------------------------------------------------------------
# 审核工作台
# --------------------------------------------------------------------------

REVIEW_CHECKLIST = [
    {"key": "description", "label": "事件描述清晰完整"},
    {"key": "schema", "label": "Payload Schema 规范"},
    {"key": "examples", "label": "触发示例有效"},
    {"key": "safety", "label": "不含敏感 / 违规内容"},
    {"key": "unique", "label": "事件 ID 无冲突"},
]

SENSITIVE_WORDS = {"password", "passwd", "token", "secret", "api_key",
                   "apikey", "身份证", "银行卡", "私钥"}


def _auto_check(doc: dict[str, Any]) -> list[dict[str, Any]]:
    """给审核人做的自动预检，UI 上默认勾选建议值。"""
    import json as _json
    blob = _json.dumps(doc, ensure_ascii=False).lower()
    schema_props = (doc.get("schema") or {}).get("properties") or {}
    checks = {
        "description": len(doc.get("description") or "") >= 6 and len(doc.get("detail") or "") >= 20,
        "schema": bool(schema_props),
        "examples": bool(doc.get("examples")),
        "safety": not any(w in blob for w in SENSITIVE_WORDS),
        "unique": len(str(doc.get("id", "")).split(".")) >= 2,
    }
    return [{**c, "suggested": checks.get(c["key"], False)} for c in REVIEW_CHECKLIST]


@app.get("/api/admin/reviews", tags=["admin"], summary="审核队列")
async def review_queue() -> dict[str, Any]:
    pending = db.list_events(status="pending_review")
    pending.sort(key=lambda x: x.get("submittedAt", ""), reverse=True)
    reviewed = db.list_events(statuses=["active", "rejected", "draft"])
    reviewed = [e for e in reviewed if e.get("reviewedAt")]
    reviewed.sort(key=lambda x: x.get("reviewedAt") or "", reverse=True)
    return {
        "pending": [{**_decorate(e), "checklist": _auto_check(e)} for e in pending],
        "reviewed": [_decorate(e) for e in reviewed],
        "pendingCount": len(pending),
        "checklist": REVIEW_CHECKLIST,
    }


@app.get("/api/admin/reviews/{event_id}", tags=["admin"], summary="审核详情")
async def review_detail(event_id: str) -> dict[str, Any]:
    doc = db.get_event(event_id)
    if not doc:
        raise HTTPException(404, "事件不存在")
    out = _decorate(doc)
    out["checklist"] = _auto_check(doc)
    out["idConflict"] = False
    return out


@app.post("/api/admin/reviews/{event_id}", tags=["admin"], summary="提交审核结论")
async def review_event(event_id: str, action: ReviewAction) -> dict[str, Any]:
    doc = db.get_event(event_id)
    if not doc:
        raise HTTPException(404, "事件不存在")
    if action.decision in ("reject", "request_changes") and not action.note.strip():
        raise HTTPException(422, "驳回 / 要求修改时必须填写理由")

    mapping = {"approve": "active", "reject": "rejected", "request_changes": "draft"}
    doc["status"] = mapping[action.decision]
    doc["reviewedAt"] = now_iso()
    doc["rejectReason"] = action.note if action.decision == "reject" else None
    doc["reviewNote"] = action.note if action.decision == "request_changes" else (
        action.note or None)
    db.save_event(doc)
    log.info("审核 %s → %s（%s）", event_id, doc["status"], action.decision)
    return _decorate(doc)


# --------------------------------------------------------------------------
# Demo 复位
# --------------------------------------------------------------------------

@app.post("/api/demo/reset", tags=["meta"], summary="恢复演示初始状态")
async def reset_demo(confirm: bool = Body(default=True, embed=True)) -> dict[str, Any]:
    db.reset()
    n = seed(force=True)
    return {"reset": True, "events": n}


@app.get("/healthz", tags=["meta"], summary="健康检查")
async def healthz() -> dict[str, Any]:
    return {"status": "ok", "time": now_iso(), "db": str(db.DB_PATH)}


# --------------------------------------------------------------------------
# 静态资源（前端构建产物）
# --------------------------------------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    async def spa_index() -> FileResponse:
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
