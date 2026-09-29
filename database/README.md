# 讨论数据库（WP3）

PostgreSQL 16 或以上版本只保存讨论主题、投稿和审核记录。文章、工具、术语和研究问题正文仍在 `frontend/src/content/`；本库不存姓名、邮箱、IP 或 User-Agent。

## 本地启动

以下命令在仓库根目录执行，使用已安装的 PostgreSQL 16 命令行工具。在 macOS 上可用 Homebrew 安装 PostgreSQL 16。示例只开放本机 Unix socket，端口 55432；已有本机服务时可直接设置 `PGHOST`、`PGPORT`、`PGUSER` 并从 `createdb` 开始。

```sh
export LINGYUAN_PGDATA="$HOME/.local/share/lingyuan-lab/postgres"
mkdir -p "$(dirname "$LINGYUAN_PGDATA")"
initdb -D "$LINGYUAN_PGDATA" --auth-local=peer --auth-host=scram-sha-256 # 仅首次
pg_ctl -D "$LINGYUAN_PGDATA" -o "-c listen_addresses='' -c port=55432" start
export PGHOST=/tmp PGPORT=55432 PGDATABASE=lingyuan
createdb "$PGDATABASE"
```

完成后用 `pg_ctl -D "$LINGYUAN_PGDATA" stop` 停止。WP5 将提供包含 PostgreSQL、API 和静态站点的统一 Docker Compose 环境；这套本地命令让 WP3 可独立验收。

## 迁移与讨论主题

迁移归 `database/migrations/` 所有，按 `0001_xxx.sql` 的字典序执行，并在 `schema_migrations` 记录版本。应用启动时不改表。WP4 的 `lingyuan-admin migrate` 将成为正式迁移入口；在 WP3 阶段可直接执行：

```sh
psql -X -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f database/migrations/0001_init.sql
psql -X -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f database/tests/verify.sql
psql -X -At -d "$PGDATABASE" -c 'SELECT version, count(*) FROM schema_migrations GROUP BY version ORDER BY version'
```

`0001_init.sql` 是一个事务，重复执行不会报错或重复记录版本。以后的迁移由 WP4 管理命令按版本跳过；已应用的 SQL 文件不可修改。`database/tests/verify.sql` 会检查表、边界值及拒绝非法数据，最后回滚所有测试数据。

WP3 提供一份当前四个问题的引导种子数据；首次迁移后运行：

```sh
psql -X -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f database/seeds/topics.sql
```

它取自 `frontend/src/content/questions/*.md` 与学习路径顺序，只插入缺失的 slug，重复运行不会覆盖运行中的主题状态。WP4 将实现 `lingyuan-admin sync-topics frontend/src/content/questions`，以文件名和 frontmatter 为来源同步 slug、`open`/`planned` 状态及排序。问题文件更改后不要手工维护种子 SQL，改用该管理命令。备份演练使用独立临时库中的测试行。

## 每日备份与保留

`database/scripts/backup.sh` 使用 `pg_dump -Fc` 生成自定义格式归档，先验证归档目录，再原子移动到备份目录。只有成功备份后才清理至少 14 天前、符合 `lingyuan-*.dump` 命名的旧归档。备份目录应在仓库外，且由执行账号独占；数据库认证建议使用受限权限的 `.pgpass`，不要把密码写入仓库或 crontab。

手动备份：

```sh
export BACKUP_DIR="$HOME/lingyuan-backups"
database/scripts/backup.sh
```

每日 03:00 的 crontab 示例（按实际绝对路径替换）：

```cron
PGHOST=/tmp
PGPORT=55432
PGDATABASE=lingyuan
BACKUP_DIR=/absolute/path/outside/repository/lingyuan-backups
0 3 * * * /absolute/path/to/lingyuan-lab/database/scripts/backup.sh >> /absolute/path/outside/repository/backup.log 2>&1
```

生产环境使用对应数据库连接参数，并监控 cron 退出状态和最新归档时间；失败告警与完整部署流程在 WP5 配置。仅有备份文件还不代表可恢复，应定期在独立空库演练。

## 恢复与行数核对

始终恢复到**新建的空库**，先检查归档，再恢复。不要覆盖正在运行的生产库。

```sh
export ARCHIVE=/absolute/path/to/lingyuan-YYYYMMDDTHHMMSSZ-PID.dump
pg_restore --list "$ARCHIVE" >/dev/null
createdb lingyuan_restore
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges \
  -d lingyuan_restore "$ARCHIVE"
psql -X -At -d "$PGDATABASE" -c \
  'SELECT (SELECT count(*) FROM schema_migrations), (SELECT count(*) FROM discussion_topics), (SELECT count(*) FROM contributions), (SELECT count(*) FROM moderation_events)'
psql -X -At -d lingyuan_restore -c \
  'SELECT (SELECT count(*) FROM schema_migrations), (SELECT count(*) FROM discussion_topics), (SELECT count(*) FROM contributions), (SELECT count(*) FROM moderation_events)'
```

列的顺序为迁移记录、主题、投稿、审核事件。比较两行数字；演练结束后可删除演练库。对于持续写入的生产库，比较应以备份时的源库快照为准。

## 恢复演练记录

| 日期 | 环境与步骤 | 原库行数 | 恢复库行数 | 结果 |
| --- | --- | --- | --- | --- |
| 2026-09-29 | 本机 PostgreSQL 16.14 临时实例；空库应用 `0001_init.sql`，插入 1 个测试主题、2 条测试投稿、1 条审核事件；运行 `backup.sh` 后在另一空库执行 `pg_restore --exit-on-error --single-transaction` | 1 / 1 / 2 / 1 | 1 / 1 / 2 / 1 | 恢复成功，四表行数一致 |

这里的测试数据只在临时实例里，未进入仓库或正式数据库。公网部署后的恢复演练另见 WP5 验收项。
