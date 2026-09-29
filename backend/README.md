# 讨论 API 与审核命令（WP4）

后端只处理研究问题的投稿与审核。文章、工具和术语仍由 Astro 构建成静态页面；数据库结构由 `../database/migrations/` 管理，API 启动时只检查版本，不自动迁移。

## 本地启动

需要 Python 3.12+、`uv` 和 PostgreSQL 16+。先按 [数据库说明](../database/README.md) 启动数据库，然后在 `backend/` 目录运行：

```sh
uv sync
export DATABASE_URL='postgresql:///lingyuan?host=/tmp&port=55432'
uv run lingyuan-admin migrate
uv run lingyuan-admin sync-topics ../frontend/src/content/questions
uv run uvicorn --factory lingyuan_api.main:create_app \
  --host 127.0.0.1 --port 8000 --workers 1 --no-proxy-headers --no-access-log
```

`DATABASE_URL` 按实际数据库账号、主机或 socket 修改。若迁移文件未随安装包放在仓库相对位置，设置 `LINGYUAN_MIGRATIONS_DIR` 为 `database/migrations` 的绝对路径。新增 SQL 迁移须按编号排序，在自己的事务中执行并写入 `schema_migrations`；已应用文件不再修改。

前端 `npm run dev` 将同域 `/api` 代理到 `127.0.0.1:8000`。检查 `GET http://127.0.0.1:8000/api/v1/health`；数据库运行中断时返回 503。启动时缺少迁移会直接报错并提示执行 `lingyuan-admin migrate`。

## 审核

审核不提供 HTTP 接口。在 `backend/` 目录、同一个 `DATABASE_URL` 下运行：

```sh
uv run lingyuan-admin pending
uv run lingyuan-admin pending --topic what-changes-first
uv run lingyuan-admin show UUID
uv run lingyuan-admin publish UUID --actor editor
uv run lingyuan-admin publish UUID --response '实验室回应' --actor editor
uv run lingyuan-admin reject UUID --reason '拒绝理由' --actor editor
uv run lingyuan-admin respond UUID --text '更新回应' --actor editor
uv run lingyuan-admin unpublish UUID --reason '撤回理由' --actor editor
```

也可设置 `LINGYUAN_ACTOR`，代替每次传入 `--actor`。状态变化与审核事件在同一事务提交；没有审核人或必要理由时命令失败。`sync-topics` 以问题文件的 `state` 和 `path.ts` 的课程序号更新数据库，不删除已不在内容目录中的主题，避免误删讨论记录。

## 输入与运行边界

- JSON 请求上限 16 KB；投稿正文规范化后为 20–2000 个 Unicode 字符。服务不启用 CORS。
- 同一客户端 10 分钟内最多 5 次、一天最多 20 次投稿；同一问题一小时最多 60 次。计数只在单进程内存中，重启清零；多进程部署前须改为共享限流存储。
- 客户端地址只经加盐哈希参与内存限流，不进入数据库或应用日志。仅当 `TRUSTED_PROXY` 指定代理 IP/CIDR 且请求确实来自该代理时才使用 `X-Forwarded-For`。启动参数 `--no-proxy-headers --no-access-log` 防止 Uvicorn 自行信任转发头或记录 IP；反向代理也须关闭含 IP/投稿正文的访问日志。
- 蜜罐 `website` 非空时返回与成功投稿相同的 201，但不保存内容，只记录不含地址或正文的计数日志。

## 验证

`uv run pytest` 会用本机 `initdb`、`pg_ctl` 启动临时 PostgreSQL 16 实例，执行真实迁移和 API/审核测试，结束时停止实例。无需现成测试库；需要本机 PostgreSQL 命令可在 `PATH` 中找到。随后运行：

```sh
uv run ruff check .
uv run ruff format --check .
uv run mypy src
```
