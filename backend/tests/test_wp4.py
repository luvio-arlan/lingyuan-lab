import subprocess
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID

import psycopg
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request
from typer.testing import CliRunner

from lingyuan_api.admin import app as admin_app
from lingyuan_api.config import Settings
from lingyuan_api.main import create_app
from lingyuan_api.ratelimit import RateLimiter


def cli(url: str, *args: str) -> object:
    return CliRunner().invoke(admin_app, list(args), env={"DATABASE_URL": url})


def setup(url: str) -> None:
    result = cli(url, "migrate")
    assert result.exit_code == 0, result.output
    result = cli(
        url,
        "sync-topics",
        str(Path(__file__).resolve().parents[2] / "frontend/src/content/questions"),
    )
    assert result.exit_code == 0, result.output


def client(url: str) -> TestClient:
    return TestClient(create_app(Settings(database_url=url, rate_limit_salt="test-secret")))


def post(test_client: TestClient, slug: str = "what-changes-first", **updates: object):
    payload = {
        "kind": "opinion",
        "body": "这是足够长的测试投稿，讨论组织中的真实变化和复核责任。",
        "website": "",
    }
    payload.update(updates)
    return test_client.post(f"/api/v1/topics/{slug}/contributions", json=payload)


def count(url: str, table: str) -> int:
    assert table in {"contributions", "moderation_events"}
    with psycopg.connect(url) as conn:
        return conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]


def test_migration_and_sync_are_repeatable(database: str) -> None:
    setup(database)
    assert cli(database, "migrate").exit_code == 0
    assert (
        cli(
            database,
            "sync-topics",
            str(Path(__file__).resolve().parents[2] / "frontend/src/content/questions"),
        ).exit_code
        == 0
    )
    with psycopg.connect(database) as conn:
        assert conn.execute("SELECT count(*) FROM schema_migrations").fetchone()[0] == 1
        assert conn.execute(
            "SELECT slug, state, sort_order FROM discussion_topics ORDER BY sort_order"
        ).fetchall() == [
            ("what-changes-first", "open", 1),
            ("which-element-moves", "open", 2),
            ("which-layer-changed", "open", 3),
            ("task-process-or-relationship", "open", 4),
            ("who-owns-agent-output", "open", 5),
            ("who-can-challenge-the-default", "open", 6),
            ("which-boundary-should-move", "open", 7),
            ("what-counts-as-learning", "open", 8),
        ]


def test_unmigrated_database_refuses_start(database: str) -> None:
    with pytest.raises(RuntimeError, match="lingyuan-admin migrate"), client(database):
        pass


def test_submission_validation_and_honeypot(database: str) -> None:
    setup(database)
    # Keep closed-topic rejection independent of which courses are published.
    with psycopg.connect(database) as conn:
        conn.execute(
            "UPDATE discussion_topics SET state = %s WHERE slug = %s",
            ("planned", "who-owns-agent-output"),
        )
    with client(database) as web:
        good = post(web)
        assert good.status_code == 201
        assert good.headers["content-type"] == "application/json; charset=utf-8"
        assert UUID(good.json()["id"])
        assert good.json()["status"] == "pending"
        assert post(web, body="太短").status_code == 422
        assert post(web, body="字" * 2001).status_code == 422
        assert post(web, kind="unknown").status_code == 422
        invalid = web.post(
            "/api/v1/topics/what-changes-first/contributions",
            content="not-json",
            headers={"content-type": "text/plain"},
        )
        assert invalid.status_code == 415
        assert invalid.headers["content-type"] == "application/json; charset=utf-8"
        malformed = web.post(
            "/api/v1/topics/what-changes-first/contributions",
            content="{",
            headers={"content-type": "application/json"},
        )
        assert malformed.status_code == 422
        assert malformed.json()["error"]["details"][0]["field"] == "body"
        assert post(web, "missing-topic").status_code == 404
        assert post(web, "who-owns-agent-output").status_code == 409
        assert post(web, website="spambot.example").status_code == 201
        assert count(database, "contributions") == 1
        assert (
            web.post(
                "/api/v1/topics/what-changes-first/contributions",
                json={"kind": "opinion", "body": "字" * 17000},
            ).status_code
            == 413
        )


def test_rate_limit_and_health(database: str) -> None:
    setup(database)
    with client(database) as web:
        assert web.get("/api/v1/health").json() == {"status": "ok"}
        for _ in range(5):
            assert post(web).status_code == 201
        limited = post(web)
        assert limited.status_code == 429
        assert int(limited.headers["Retry-After"]) > 0
    socket = Path(parse_qs(urlparse(database).query)["host"][0])
    data = socket.parent / "data"
    with client(database) as web:
        subprocess.run(
            ["pg_ctl", "-D", str(data), "-m", "immediate", "-w", "stop"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            assert web.get("/api/v1/health").status_code == 503
        finally:
            subprocess.run(
                [
                    "pg_ctl",
                    "-D",
                    str(data),
                    "-o",
                    f"-c listen_addresses='' -c unix_socket_directories={socket} -c port=55439",
                    "-w",
                    "start",
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )


def test_review_is_atomic_and_public_only_after_publish(database: str) -> None:
    setup(database)
    with client(database) as web:
        first = post(web).json()["id"]
        second = post(web).json()["id"]
        assert web.get("/api/v1/topics/what-changes-first/contributions").json() == {
            "items": [],
            "next_cursor": None,
        }
    assert cli(database, "publish", first).exit_code != 0
    assert count(database, "moderation_events") == 0
    assert cli(database, "reject", second, "--actor", "editor").exit_code != 0
    assert (
        CliRunner()
        .invoke(
            admin_app,
            ["publish", first, "--response", "初始回应"],
            env={"DATABASE_URL": database, "LINGYUAN_ACTOR": "editor"},
        )
        .exit_code
        == 0
    )
    assert (
        cli(database, "reject", second, "--reason", "不符合主题", "--actor", "editor").exit_code
        == 0
    )
    assert (
        cli(database, "respond", first, "--text", "感谢你的观察。", "--actor", "editor").exit_code
        == 0
    )
    assert count(database, "moderation_events") == 3
    with psycopg.connect(database) as conn:
        assert (
            conn.execute(
                "SELECT actor FROM moderation_events WHERE contribution_id=%s ORDER BY id LIMIT 1",
                (first,),
            ).fetchone()[0]
            == "editor"
        )
    with client(database) as web:
        items = web.get("/api/v1/topics/what-changes-first/contributions").json()["items"]
        assert len(items) == 1
        assert items[0]["id"] == first
        assert items[0]["lab_response"] == "感谢你的观察。"
        assert "published_at" in items[0]
    assert cli(database, "unpublish", first, "--reason", "撤回", "--actor", "editor").exit_code == 0
    assert count(database, "moderation_events") == 4
    with client(database) as web:
        assert web.get("/api/v1/topics/what-changes-first/contributions").json()["items"] == []
    with psycopg.connect(database) as conn:
        assert conn.execute(
            "SELECT status, published_at FROM contributions WHERE id=%s", (first,)
        ).fetchone() == ("rejected", None)


def test_admin_inspection_and_event_failure_rolls_back(database: str) -> None:
    setup(database)
    with client(database) as web:
        identifier = post(web).json()["id"]
    assert identifier in cli(database, "pending").output
    assert identifier in cli(database, "pending", "--topic", "what-changes-first").output
    assert identifier not in cli(database, "pending", "--topic", "which-element-moves").output
    assert "body:" in cli(database, "show", identifier).output
    with psycopg.connect(database) as conn:
        conn.execute(
            """CREATE FUNCTION fail_moderation() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'injected event failure'; END $$"""
        )
        conn.execute(
            "CREATE TRIGGER fail_moderation BEFORE INSERT ON moderation_events "
            "FOR EACH ROW EXECUTE FUNCTION fail_moderation()"
        )
    assert cli(database, "publish", identifier, "--actor", "editor").exit_code != 0
    with psycopg.connect(database) as conn:
        assert conn.execute(
            "SELECT status, published_at FROM contributions WHERE id=%s", (identifier,)
        ).fetchone() == ("pending", None)
    assert count(database, "moderation_events") == 0


def test_normalized_body_and_public_order(database: str) -> None:
    setup(database)
    with client(database) as web:
        first = post(
            web, body="  e\u0301 这是包含\x00控制字符的内容，长度足够通过验证。\r\n下一行。  "
        ).json()["id"]
        second = post(web).json()["id"]
    with psycopg.connect(database) as conn:
        assert (
            conn.execute("SELECT body FROM contributions WHERE id=%s", (first,)).fetchone()[0]
            == "é 这是包含控制字符的内容，长度足够通过验证。\n下一行。"
        )
    assert cli(database, "publish", first, "--actor", "editor").exit_code == 0
    assert cli(database, "publish", second, "--actor", "editor").exit_code == 0
    with psycopg.connect(database) as conn:
        conn.execute(
            "UPDATE contributions SET published_at='2026-01-01T00:00:00Z' WHERE id=%s", (first,)
        )
        conn.execute(
            "UPDATE contributions SET published_at='2026-02-01T00:00:00Z' WHERE id=%s", (second,)
        )
    with client(database) as web:
        response = web.get("/api/v1/topics/what-changes-first/contributions")
        assert [item["id"] for item in response.json()["items"]] == [second, first]
        assert set(response.json()["items"][0]) == {
            "id",
            "kind",
            "body",
            "published_at",
            "lab_response",
        }


def test_public_page_is_capped_at_fifty_and_planned_is_empty(database: str) -> None:
    setup(database)
    with psycopg.connect(database) as conn:
        conn.execute(
            """INSERT INTO contributions (topic_slug, kind, body, status, published_at)
            SELECT 'what-changes-first', 'opinion', '第 ' || n || ' 条测试投稿，内容长度足够通过数据库约束。',
            'published', now() + (n || ' seconds')::interval FROM generate_series(1, 51) n"""
        )
    with client(database) as web:
        result = web.get("/api/v1/topics/what-changes-first/contributions")
        assert result.status_code == 200
        assert len(result.json()["items"]) == 50
        planned = web.get("/api/v1/topics/who-owns-agent-output/contributions")
        assert planned.status_code == 200
        assert planned.json() == {"items": [], "next_cursor": None}


def test_day_and_topic_rate_budgets() -> None:
    daily = RateLimiter(
        Settings(
            database_url="postgresql://unused",
            rate_limit_ten_minutes=100,
            rate_limit_day=20,
            rate_limit_topic_hour=100,
        )
    )
    assert all(daily.check_and_record("client-a", "topic") is None for _ in range(20))
    assert daily.check_and_record("client-a", "topic") is not None
    assert daily.check_and_record("client-b", "topic") is None

    shared = RateLimiter(
        Settings(
            database_url="postgresql://unused",
            rate_limit_ten_minutes=100,
            rate_limit_day=100,
            rate_limit_topic_hour=60,
        )
    )
    assert all(shared.check_and_record(f"client-{i}", "topic") is None for i in range(60))
    assert shared.check_and_record("client-61", "topic") is not None
    assert shared.check_and_record("client-61", "other-topic") is None


def test_forwarded_ip_only_from_configured_proxy() -> None:
    def request(peer: str, forwarded: bool) -> Request:
        return Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/",
                "headers": [(b"x-forwarded-for", b"203.0.113.7")] if forwarded else [],
                "client": (peer, 1234),
                "server": ("localhost", 8000),
                "scheme": "http",
            }
        )

    ordinary = RateLimiter(Settings(database_url="postgresql://unused", rate_limit_salt="test"))
    assert ordinary.client_key(request("127.0.0.1", True)) == ordinary.client_key(
        request("127.0.0.1", False)
    )
    proxied = RateLimiter(
        Settings(
            database_url="postgresql://unused", rate_limit_salt="test", trusted_proxy="127.0.0.1/32"
        )
    )
    assert proxied.client_key(request("127.0.0.1", True)) != proxied.client_key(
        request("127.0.0.1", False)
    )
    assert proxied.client_key(request("198.51.100.5", True)) == proxied.client_key(
        request("198.51.100.5", False)
    )
    spoofed_chain = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [(b"x-forwarded-for", b"1.2.3.4, 198.51.100.5")],
            "client": ("127.0.0.1", 1234),
            "server": ("localhost", 8000),
            "scheme": "http",
        }
    )
    assert proxied.client_key(spoofed_chain) == proxied.client_key(request("198.51.100.5", False))
