"""SQLite 存储层。表结构简单：索引列 + JSON 文档。"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Iterable, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent   # event-market/
DATA_DIR = Path(os.getenv("EM_DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.getenv("EM_DB_PATH", DATA_DIR / "event_market.db"))

_LOCK = threading.RLock()
_CONN: Optional[sqlite3.Connection] = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    source       TEXT NOT NULL,
    category     TEXT NOT NULL,
    status       TEXT NOT NULL,
    author       TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL,
    doc          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

CREATE TABLE IF NOT EXISTS subscriptions (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    event_id      TEXT NOT NULL,
    subscribed_at TEXT NOT NULL,
    UNIQUE(user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
"""


def connect() -> sqlite3.Connection:
    global _CONN
    with _LOCK:
        if _CONN is None:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            _CONN = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            _CONN.row_factory = sqlite3.Row
            _CONN.executescript(SCHEMA)
            _CONN.commit()
        return _CONN


def close() -> None:
    global _CONN
    with _LOCK:
        if _CONN is not None:
            _CONN.close()
            _CONN = None


def _exec(sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
    conn = connect()
    with _LOCK:
        cur = conn.execute(sql, tuple(params))
        conn.commit()
        return cur


def _query(sql: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
    conn = connect()
    with _LOCK:
        return conn.execute(sql, tuple(params)).fetchall()


# ---------------------------------------------------------------- events

def save_event(doc: dict[str, Any]) -> dict[str, Any]:
    _exec(
        "INSERT INTO events(id,name,source,category,status,author,submitted_at,doc) "
        "VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
        "name=excluded.name, source=excluded.source, category=excluded.category, "
        "status=excluded.status, author=excluded.author, doc=excluded.doc",
        (doc["id"], doc["name"], doc["source"], doc["category"], doc["status"],
         doc.get("author", ""), doc["submittedAt"], json.dumps(doc, ensure_ascii=False)),
    )
    return doc


def get_event(event_id: str) -> Optional[dict[str, Any]]:
    rows = _query("SELECT doc FROM events WHERE id=?", (event_id,))
    return json.loads(rows[0]["doc"]) if rows else None


def list_events(*, status: Optional[str] = None, statuses: Optional[list[str]] = None,
                category: Optional[str] = None, source: Optional[str] = None,
                author: Optional[str] = None, q: Optional[str] = None) -> list[dict[str, Any]]:
    sql = "SELECT doc FROM events WHERE 1=1"
    params: list[Any] = []
    if status:
        sql += " AND status=?"
        params.append(status)
    if statuses:
        sql += f" AND status IN ({','.join('?' * len(statuses))})"
        params.extend(statuses)
    if source:
        sql += " AND source=?"
        params.append(source)
    if author:
        sql += " AND author=?"
        params.append(author)
    sql += " ORDER BY submitted_at DESC"
    docs = [json.loads(r["doc"]) for r in _query(sql, params)]
    if category:
        docs = [d for d in docs
                if d.get("category") == category or category in (d.get("categories") or [])]
    if q:
        kw = q.strip().lower()
        docs = [d for d in docs if kw in
                f"{d['id']} {d['name']} {d['description']} {d.get('detail','')} {d['source']}".lower()]
    return docs


def delete_event(event_id: str) -> bool:
    return _exec("DELETE FROM events WHERE id=?", (event_id,)).rowcount > 0


def count_events_by_status() -> dict[str, int]:
    rows = _query("SELECT status, COUNT(*) c FROM events GROUP BY status")
    return {r["status"]: r["c"] for r in rows}


# ---------------------------------------------------------- subscriptions

def add_subscription(doc: dict[str, Any]) -> bool:
    try:
        _exec("INSERT INTO subscriptions(id,user_id,event_id,subscribed_at) VALUES(?,?,?,?)",
              (doc["id"], doc["userId"], doc["eventId"], doc["subscribedAt"]))
        return True
    except sqlite3.IntegrityError:
        return False


def remove_subscription(user_id: str, event_id: str) -> bool:
    return _exec("DELETE FROM subscriptions WHERE user_id=? AND event_id=?",
                 (user_id, event_id)).rowcount > 0


def list_subscriptions(user_id: str) -> list[dict[str, Any]]:
    rows = _query("SELECT * FROM subscriptions WHERE user_id=? ORDER BY subscribed_at DESC",
                  (user_id,))
    return [{"id": r["id"], "userId": r["user_id"], "eventId": r["event_id"],
             "subscribedAt": r["subscribed_at"]} for r in rows]


def is_subscribed(user_id: str, event_id: str) -> bool:
    return bool(_query("SELECT 1 FROM subscriptions WHERE user_id=? AND event_id=?",
                       (user_id, event_id)))


def count_subscriptions(event_id: str) -> int:
    return _query("SELECT COUNT(*) c FROM subscriptions WHERE event_id=?",
                  (event_id,))[0]["c"]


def reset() -> None:
    conn = connect()
    with _LOCK:
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM subscriptions")
        conn.commit()
