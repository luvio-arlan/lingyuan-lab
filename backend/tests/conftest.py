import getpass
import shutil
import subprocess
import tempfile
from pathlib import Path

import psycopg
import pytest


@pytest.fixture(scope="session")
def postgres_url(tmp_path_factory: pytest.TempPathFactory) -> str:
    if not shutil.which("initdb") or not shutil.which("pg_ctl"):
        pytest.fail("Real PostgreSQL binaries initdb and pg_ctl are required")
    with tempfile.TemporaryDirectory(prefix="lywp4-", dir="/tmp") as temporary:
        root = Path(temporary)
        data = root / "data"
        socket = root / "socket"
        socket.mkdir()
        subprocess.run(
            ["initdb", "-D", str(data), "-A", "trust", "--no-instructions"],
            check=True,
            capture_output=True,
        )
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
        url = f"postgresql://{getpass.getuser()}@/postgres?host={socket}&port=55439"
        try:
            yield url
        finally:
            subprocess.run(
                ["pg_ctl", "-D", str(data), "-m", "immediate", "-w", "stop"],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )


@pytest.fixture()
def database(postgres_url: str) -> str:
    with psycopg.connect(postgres_url, autocommit=True) as conn:
        conn.execute(
            "DROP TABLE IF EXISTS moderation_events, contributions, discussion_topics, schema_migrations CASCADE"
        )
    return postgres_url
