import os
import re
from pathlib import Path
from typing import Annotated
from uuid import UUID

import typer
import yaml

from lingyuan_api.db import connect
from lingyuan_api.db import migrate as run_migrations

app = typer.Typer(no_args_is_help=True)


def database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise typer.BadParameter("DATABASE_URL is required")
    return url


def require_actor(actor: str | None) -> str:
    value = (actor or os.getenv("LINGYUAN_ACTOR") or "").strip()
    if not value:
        raise typer.BadParameter("--actor or LINGYUAN_ACTOR is required")
    return value


def question_rows(path: Path) -> list[tuple[str, str, int]]:
    if not path.is_dir():
        raise typer.BadParameter(f"Question directory does not exist: {path}")
    course_file = path.parents[1] / "data" / "path.ts"
    if not course_file.is_file():
        raise typer.BadParameter(f"Learning path not found: {course_file}")
    course_numbers = {
        slug: int(number)
        for number, slug in re.findall(
            r"no: '(\d+)',\s*slug: '([^']+)'", course_file.read_text(encoding="utf-8")
        )
    }
    rows: list[tuple[str, str, int]] = []
    for file in sorted(path.glob("*.md")):
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", file.stem):
            raise typer.BadParameter(f"Invalid question slug: {file.stem}")
        match = re.match(r"\A---\s*\n(.*?)\n---", file.read_text(encoding="utf-8"), re.DOTALL)
        if not match:
            raise typer.BadParameter(f"Missing frontmatter: {file}")
        data = yaml.safe_load(match.group(1))
        if not isinstance(data, dict) or data.get("state") not in {"open", "planned"}:
            raise typer.BadParameter(f"Invalid question state: {file}")
        lesson = data.get("lesson")
        if lesson not in course_numbers:
            raise typer.BadParameter(f"Unknown lesson: {lesson}")
        rows.append((file.stem, data["state"], course_numbers[lesson]))
    return rows


@app.command()
def migrate() -> None:
    applied = run_migrations(database_url())
    typer.echo("Applied: " + (", ".join(applied) if applied else "none"))


@app.command("sync-topics")
def sync_topics(path: Path) -> None:
    rows = question_rows(path)
    with connect(database_url()) as conn:
        for slug, state, order in rows:
            conn.execute(
                """INSERT INTO discussion_topics (slug, state, sort_order) VALUES (%s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET state=excluded.state,
                sort_order=excluded.sort_order, updated_at=now()""",
                (slug, state, order),
            )
    typer.echo(f"Synced {len(rows)} topics")


@app.command()
def pending(topic: Annotated[str | None, typer.Option()] = None) -> None:
    with connect(database_url()) as conn:
        sql = "SELECT id, topic_slug, kind, created_at FROM contributions WHERE status='pending'"
        params: tuple[str, ...] = ()
        if topic is not None:
            sql += " AND topic_slug=%s"
            params = (topic,)
        rows = conn.execute(sql + " ORDER BY created_at", params).fetchall()
    for row in rows:
        typer.echo(f"{row['id']}  {row['topic_slug']}  {row['kind']}  {row['created_at']}")


@app.command()
def show(identifier: UUID) -> None:
    with connect(database_url()) as conn:
        row = conn.execute("SELECT * FROM contributions WHERE id=%s", (identifier,)).fetchone()
    if row is None:
        raise typer.BadParameter("Contribution not found")
    for key, value in row.items():
        typer.echo(f"{key}: {value}")


def moderate(
    identifier: UUID,
    action: str,
    actor: str,
    reason: str | None = None,
    response: str | None = None,
) -> None:
    expected = "pending" if action in {"publish", "reject"} else "published"
    if action in {"reject", "unpublish"} and not (reason or "").strip():
        raise typer.BadParameter("A nonempty reason is required")
    if response is not None and len(response) > 2000:
        raise typer.BadParameter("Response exceeds 2000 characters")
    with connect(database_url()) as conn, conn.transaction():
        row = conn.execute(
            "SELECT status FROM contributions WHERE id=%s FOR UPDATE", (identifier,)
        ).fetchone()
        if row is None or row["status"] != expected:
            raise typer.BadParameter(f"Contribution must be {expected} for {action}")
        if action == "publish":
            conn.execute(
                "UPDATE contributions SET status='published', published_at=now(), lab_response=%s WHERE id=%s",
                (response, identifier),
            )
        elif action in {"reject", "unpublish"}:
            conn.execute(
                "UPDATE contributions SET status='rejected', published_at=NULL WHERE id=%s",
                (identifier,),
            )
        elif action == "respond":
            conn.execute(
                "UPDATE contributions SET lab_response=%s WHERE id=%s", (response, identifier)
            )
        conn.execute(
            "INSERT INTO moderation_events (contribution_id, action, reason, actor) VALUES (%s, %s, %s, %s)",
            (identifier, action, reason, actor),
        )
    typer.echo(f"{action}: {identifier}")


@app.command()
def publish(
    identifier: UUID,
    response: Annotated[str | None, typer.Option()] = None,
    actor: Annotated[str | None, typer.Option()] = None,
) -> None:
    moderate(identifier, "publish", require_actor(actor), response=response)


@app.command()
def reject(
    identifier: UUID,
    reason: Annotated[str, typer.Option()],
    actor: Annotated[str | None, typer.Option()] = None,
) -> None:
    moderate(identifier, "reject", require_actor(actor), reason=reason)


@app.command()
def respond(
    identifier: UUID,
    text: Annotated[str, typer.Option()],
    actor: Annotated[str | None, typer.Option()] = None,
) -> None:
    moderate(identifier, "respond", require_actor(actor), response=text)


@app.command()
def unpublish(
    identifier: UUID,
    reason: Annotated[str, typer.Option()],
    actor: Annotated[str | None, typer.Option()] = None,
) -> None:
    moderate(identifier, "unpublish", require_actor(actor), reason=reason)


if __name__ == "__main__":
    app()
