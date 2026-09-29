# WP6 质量体系与持续集成

日期：2026-09-29。

## 本地

- `npm run check:contrast`：24 组文字色与背景色均不低于 4.5:1。`--c-ink-4` 在最浅底色 `--c-mist-3` 上原为 4.27:1，且页面尚未使用这个令牌，已调为 `#61697b`（4.52:1）。
- `npm run test:contrast`：浅色字配白底会失败。
- `npm run check:links` 通过。`npm run test:links`：缺页、缺锚点和缺资源都会报出。
- `uv run mypy src` 通过。临时文件里 `def broken() -> int: return "no"` 使 mypy 以退出码 1 失败，该文件未进入仓库。
- Playwright 1.63 在 Chromium 与 WebKit 上 28 项通过：五个一级页面、文章来源角标、工具答案刷新保留、模拟 API 的投稿成功与失败、390px 菜单与 Esc。axe 覆盖首页、学习路径、知识库、一篇文章、工具箱、一份工具、研究讨论、一个问题页和关于页，没有 serious 或 critical。

## GitHub Actions

`main` 的 [CI 运行 36549606007](https://github.com/luvio-arlan/lingyuan-lab/actions/runs/36549606007) 通过。后端约 26 秒，前端约 1 分 48 秒。失效链接和对比度不足由 CI 里的 `test:links`、`test:contrast` 用夹具断言检查器会失败；类型错误用同一条 `uv run mypy` 在临时文件上得到退出码 1。这三处缺陷没有留在默认分支上。
