"""数据模型（对应需求文档第六章）。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

EventStatus = Literal["active", "pending_review", "rejected", "draft"]

CATEGORIES: dict[str, str] = {
    "communication": "沟通",
    "development": "开发",
    "approval": "审批",
    "monitoring": "监控",
    "data": "数据",
}

# 来源 → 标签配色（对应需求「事件卡片来源标签颜色」）
SOURCE_COLORS: dict[str, str] = {
    "飞书": "blue",
    "邮件": "green",
    "GitHub": "default",
    "运维": "orange",
    "自定义": "purple",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class EventDef(CamelModel):
    id: str
    name: str
    source: str
    category: str
    categories: list[str] = Field(default_factory=list)
    description: str
    detail: str = ""
    schema_: dict[str, Any] = Field(default_factory=dict, alias="schema")
    examples: list[dict[str, Any]] = Field(default_factory=list)
    scenarios: list[str] = Field(default_factory=list)
    subscriber_count: int = Field(default=0, alias="subscriberCount")
    status: EventStatus = "pending_review"
    author: str = ""
    author_contact: str = Field(default="", alias="authorContact")
    reject_reason: Optional[str] = Field(default=None, alias="rejectReason")
    review_note: Optional[str] = Field(default=None, alias="reviewNote")
    submitted_at: str = Field(default_factory=now_iso, alias="submittedAt")
    reviewed_at: Optional[str] = Field(default=None, alias="reviewedAt")


class EventSubmit(CamelModel):
    """开发者提交表单（对应需求「提交新事件表单」）。"""

    id: str
    name: str
    source: str
    categories: list[str] = Field(default_factory=list)
    description: str
    detail: str = ""
    schema_: dict[str, Any] = Field(default_factory=dict, alias="schema")
    examples: list[dict[str, Any]] = Field(default_factory=list)
    scenarios: list[str] = Field(default_factory=list)
    author: str = "开发者"
    author_contact: str = Field(default="", alias="authorContact")

    @field_validator("id")
    @classmethod
    def _vid(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("事件 ID 不能为空")
        if " " in v or "." not in v:
            raise ValueError("事件 ID 需形如 source.object.action，且不含空格")
        return v

    @field_validator("name", "description")
    @classmethod
    def _vreq(cls, v: str) -> str:
        if not (v or "").strip():
            raise ValueError("必填字段不能为空")
        return v.strip()


class ReviewAction(CamelModel):
    decision: Literal["approve", "reject", "request_changes"]
    note: str = ""
    reviewer: str = "平台管理员"


class SubscribeRequest(CamelModel):
    event_id: str = Field(alias="eventId")
    user_id: str = Field(default="demo_user", alias="userId")


class UserSubscription(CamelModel):
    id: str
    user_id: str = Field(alias="userId")
    event_id: str = Field(alias="eventId")
    subscribed_at: str = Field(default_factory=now_iso, alias="subscribedAt")
