# WP4 后端验收记录

日期：2026-09-29。环境：macOS、本机 PostgreSQL 16.14、Python 3.14.7（项目要求 3.12+）、`uv` 0.12.15。验收使用 `/tmp/lywp4-manual-UPmR1o` 中的临时数据库，不使用正式数据。

## 可重复的自动验收

在 `backend/` 执行：

```sh
uv run pytest -q --tb=short
uv run ruff check .
uv run ruff format --check .
uv run mypy src
```

结果：10 个测试通过；ruff lint、格式检查和 mypy 均为 0 错误。测试用例通过 `initdb` 和 `pg_ctl` 启动真实 PostgreSQL，结束后自动停止。测试运行时有一条上游 `fastapi.testclient` / `starlette` 的弃用警告，不影响通过状态。

覆盖的可观察行为：

- 空库迁移、重复迁移、问题文件同步及课程序号排序；未迁移时 API 拒绝启动并提示 `lingyuan-admin migrate`。
- 投稿成功为 201/pending；过短、过长、未知类型、损坏的 JSON 为 422；非 JSON 媒体类型为 415；缺失/未开放问题为 404/409；超过 16 KB 为 413；超过频率为 429，带 `Retry-After`；蜜罐返回 201 且不落库。
- 正文 NFC、首尾空白与控制字符处理；客户端 10 分钟/一天和问题一小时的限额；只有已配置且实际匹配的代理才可信任转发地址，并从右侧选取最近的非可信地址，不能用伪造的最左侧地址绕过限流。
- 公开列表只含 published，倒序、最多 50 条，字段与附录 A 一致；planned 问题返回空列表；pending/rejected 不公开。
- `publish`、`reject`、`respond`、`unpublish` 写入审核事件；`--actor` 与 `LINGYUAN_ACTOR` 均可使用；缺少审核人/理由失败；强制让事件插入报错后，状态更新回滚，无半完成数据。
- 数据库可用时健康检查 200；运行中实际停止 PostgreSQL 后健康检查 503，再启动后测试继续。

计划正文中 WP4 的“非 JSON 为 422”与附录 A 的 415 冲突。本次按附录 A 的正式 API 契约实现：`Content-Type` 不是 `application/json` 返回 415；声明为 JSON 但内容损坏返回 422。未改变 API v1 契约。

## 浏览器与代理联调

在临时库执行 `lingyuan-admin migrate` 和 `sync-topics`，启动单进程 Uvicorn（`--no-proxy-headers --no-access-log`）与 Astro 开发服务器。Astro 实际地址为 `http://127.0.0.1:4322`；经 `/api/v1/health` 代理请求得到 `200 {"status":"ok"}`。

1. 在 `/questions/what-changes-first` 页面输入 `WP4 本地验收：<script>window.__lingyuan_test_xss = true</script> 这段投稿只应作为纯文本出现。` 并勾选同意项。提交后页面显示“已收到，谢谢你”；此时读者投稿列表仍为空。
2. `lingyuan-admin pending --topic what-changes-first` 列出 UUID `7d8de056-5263-4a81-abb1-6c352dcfb3f2`。执行 `lingyuan-admin publish 7d8de056-5263-4a81-abb1-6c352dcfb3f2 --actor wp4-acceptance` 后刷新，读者投稿出现该文本。
3. 浏览器 DOM 检查 `window.__lingyuan_test_xss === true` 为 `false`，`.c-body script` 节点数为 `0`；文本在 `<p>` 中原样展示，未执行。
4. 停止 API、刷新问题页：展示“讨论服务暂未连接”；尝试提交后提示稍后重试，输入框中的 31 字测试文本保持原样。API 停止期间，`/learn`、`/library/what-does-od-change`、`/tools/od-diagnostic-questions` 均返回 200 `text/html`。
5. 使用推荐的 Uvicorn 启动命令再次请求 API，进程输出没有客户端 IP 或投稿正文访问日志；应用启动时还主动禁用了 `uvicorn.access` 记录器。生产反向代理的日志配置属于 WP5。

本地测试投稿只存在于临时库，验收后停止实例并删除临时目录。未提交、推送或部署。

## 2026-09-29 回归复验

再次在 `backend/` 运行 `uv run pytest -q --tb=short`、`uv run ruff check .`、`uv run ruff format --check .` 和 `uv run mypy src`：10 个测试通过，lint、格式与类型检查均为 0 错误。测试仍只有上文所述的一条 Starlette TestClient/httpx 弃用警告。WP4 既定验收项没有新增缺口。

随后使用 WP5 的本地 Compose 环境，通过 Caddy 的同域 `/api` 在浏览器提交一条测试投稿，`lingyuan-admin pending` 列出 UUID，`publish --actor wp5-local-acceptance` 后刷新可在页面看到纯文本投稿。这是额外的部署回归验证；生产站点与备份告警仍属于 WP5 验收。
