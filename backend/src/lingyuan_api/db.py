import os
from pathlib import Path
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

MIGRATIONS = Path(
    os.environ.get(
        "LINGYUAN_MIGRATIONS_DIR",
        str(Path(__file__).resolve().parents[3] / "database" / "migrations"),
    )
)


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql"))


def ensure_migrated(conn: psycopg.Connection[dict[str, object]]) -> None:
    files = migration_files()
    if not files:
        raise RuntimeError(f"No migration files found in {MIGRATIONS}")
    try:
        rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
    except psycopg.Error as exc:
        raise RuntimeError("Database is not migrated. Run lingyuan-admin migrate.") from exc
    applied = {str(row["version"]) for row in rows}
    missing = {path.stem for path in files} - applied
    if missing:
        raise RuntimeError(
            f"Missing database migrations: {', '.join(sorted(missing))}. Run lingyuan-admin migrate."
        )


def migrate(url: str) -> list[str]:
    applied_now: list[str] = []
    files = migration_files()
    if not files:
        raise RuntimeError(f"No migration files found in {MIGRATIONS}")
    with psycopg.connect(url, autocommit=True) as conn:
        for path in files:
            try:
                applied = conn.execute(
                    "SELECT 1 FROM schema_migrations WHERE version=%s", (path.stem,)
                ).fetchone()
            except psycopg.errors.UndefinedTable:
                applied = None
            if applied:
                continue
            conn.execute(path.read_text(encoding="utf-8"))
            recorded = conn.execute(
                "SELECT 1 FROM schema_migrations WHERE version=%s", (path.stem,)
            ).fetchone()
            if not recorded:
                raise RuntimeError(f"Migration {path.name} did not record its version")
            applied_now.append(path.stem)
    return applied_now


def topic_state(conn: psycopg.Connection[dict[str, object]], slug: str) -> str | None:
    row = conn.execute("SELECT state FROM discussion_topics WHERE slug=%s", (slug,)).fetchone()
    return str(row["state"]) if row else None


def insert_submission(
    conn: psycopg.Connection[dict[str, object]], slug: str, kind: str, body: str
) -> UUID:
    row = conn.execute(
        "INSERT INTO contributions (topic_slug, kind, body) VALUES (%s, %s, %s) RETURNING id",
        (slug, kind, body),
    ).fetchone()
    assert row is not None
    return row["id"]  # type: ignore[return-value]


def published(conn: psycopg.Connection[dict[str, object]], slug: str) -> list[dict[str, object]]:
    rows = conn.execute(
        """SELECT id, kind, body, published_at, lab_response FROM contributions
        WHERE topic_slug=%s AND status='published'
        ORDER BY published_at DESC, id DESC LIMIT 50""",
        (slug,),
    ).fetchall()
    return rows


def connect(url: str) -> psycopg.Connection[dict[str, object]]:
    return psycopg.connect(url, row_factory=dict_row)
