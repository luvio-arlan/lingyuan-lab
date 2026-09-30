# WP7 第 03–08 课本地与上线验收记录

日期：2026-09-30。结论：六课内容与来源核对完成，用户确认本地验收 OK 并授权发布；GitHub 已推送、服务器已更新。八课均可学、文章与工具已发布、讨论已开放。GitHub 前后端 CI 全绿，线上验收通过。下文保留草稿阶段的验收证据。

## 直接打开本地检查

预览正在 `http://127.0.0.1:4321` 运行。可以先打开[知识库](http://127.0.0.1:4321/library/)，六篇新增课程现显示“已核对发布”。无需阅读论文；核对过程已记入 [来源清单](内容核对清单-03-08.md)。

| 课 | 文章与图解 | 练习工具 | 讨论题 |
| --- | --- | --- | --- |
| 03 | [任务、岗位、流程和结果](http://127.0.0.1:4321/library/task-job-process-outcome/) · [图解](http://127.0.0.1:4321/library/task-job-process-outcome/#diagram) | [岗位任务拆解](http://127.0.0.1:4321/tools/job-task-breakdown/) | [变化发生在哪一层](http://127.0.0.1:4321/questions/which-layer-changed/) |
| 04 | [AI 改变哪一层](http://127.0.0.1:4321/library/which-layer-ai-changes/) · [图解](http://127.0.0.1:4321/library/which-layer-ai-changes/#diagram) | [三类变化观察](http://127.0.0.1:4321/tools/three-change-sheet/) | [任务、流程还是关系](http://127.0.0.1:4321/questions/task-process-or-relationship/) |
| 05 | [人与 Agent 共事](http://127.0.0.1:4321/library/delegation-review-escalation/) · [图解](http://127.0.0.1:4321/library/delegation-review-escalation/#diagram) | [委派与接手](http://127.0.0.1:4321/tools/agent-handoff-sheet/) | [如何分配责任](http://127.0.0.1:4321/questions/who-owns-agent-output/) |
| 06 | [决策权如何分配](http://127.0.0.1:4321/library/who-really-decides/) · [图解](http://127.0.0.1:4321/library/who-really-decides/#diagram) | [决策场景分析](http://127.0.0.1:4321/tools/decision-scenario-sheet/) | [谁能挑战默认选项](http://127.0.0.1:4321/questions/who-can-challenge-the-default/) |
| 07 | [团队与岗位调整](http://127.0.0.1:4321/library/redesign-team-boundaries/) · [图解](http://127.0.0.1:4321/library/redesign-team-boundaries/#diagram) | [团队设计比较](http://127.0.0.1:4321/tools/team-design-comparison/) | [哪条边界值得移动](http://127.0.0.1:4321/questions/which-boundary-should-move/) |
| 08 | [人才系统如何响应](http://127.0.0.1:4321/library/talent-learning-evaluation/) · [图解](http://127.0.0.1:4321/library/talent-learning-evaluation/#diagram) | [人才培养与评价议程](http://127.0.0.1:4321/tools/talent-research-agenda/) | [怎样判断已经学会](http://127.0.0.1:4321/questions/what-counts-as-learning/) |

按顺序读每篇的场景与要点，点图解节点，再在工具里填一条示意答案，刷新看答案是否还在，试一次复制和打印。你只需反馈哪里看不懂、哪道题难以使用、哪张图不能帮助理解。讨论页暂不收投稿。

[学习路径](http://127.0.0.1:4321/learn/) 和首页继续显示两课可学、六课筹备中，符合验收前保留状态的约定；课程正文已经齐全。用户验收并明确同意后才调整 `available` / `published` / `open`，该操作不在本轮授权内。

## 逐课交付检查

| 课 | 术语数 | 工具部分 / 题目数 | 编号证据段 | 反例、待答问题、图解与闭环 |
| --- | --- | --- | --- | --- |
| 03 | 4 | 4 / 10 | 2 | 齐全 |
| 04 | 4 | 5 / 10 | 3 | 齐全 |
| 05 | 4 | 4 / 8 | 2 | 齐全 |
| 06 | 3 | 4 / 8 | 2 | 齐全 |
| 07 | 3 | 4 / 8 | 2 | 齐全 |
| 08 | 3 | 5 / 11 | 2 | 齐全 |

新增 12 个术语，术语总数 28；05 复用 AI Agent，04 也复用它。13 个编号研究段对应 13 条保留来源记录、11 个不同来源。检查了每篇所有判断性段落的 Claim 包裹、来源序号与术语/工具/讨论引用；未留下缺失 ID、越界来源序号或未标注的示意案例。六篇首次出现 Agent 都说明具体授权。

## 可复现的技术检查

在 `frontend/` 执行：

```sh
npm run check
npm run build
npm run check:links
npm run check:contrast
npm run test:links
npm run test:contrast
npm run test:e2e -- --workers=3
```

- 类型检查：59 个文件，0 错误、0 警告、0 提示。
- 构建：33 个静态页面；无缺失术语/内容引用。Vite 对 MDX head-inject 的非阻塞构建提示仍存在，不影响构建结果。
- 站内链接与锚点：全部有效；24 对文字/底色对比度均至少 4.5:1；链接与对比度脚本各 2 项单测通过。
- 最终端到端：Chromium + WebKit **64 项通过**。其中 WP7 为 36 项：每课文章/工具/讨论各一项，在两个浏览器执行；既有首页、导航、投稿、菜单与无障碍回归 28 项也通过。
- 每课图解逐节点测试 Tab 聚焦后 Enter/Space 切换、`aria-pressed` 与说明区域同步、再次激活可取消；减少动态下过渡结束后无持续动画，说明面板动画为 none。
- 六课文章、工具、讨论页在 390 / 768 / 1024 / 1440px 无横向溢出；axe 没有 serious / critical 违规。来源和关联链接可打开，工具可返回对应文章。
- 六工具所有文本题填入不同示意答案、复选题选中后刷新保持；自动化捕获 Markdown 检查各部分与各答案，检查打印事件及打印媒体样式。
- 补充实测：Chromium 原生 Clipboard API 六工具均写入并读回匹配文本；每份生成 A4 打印 PDF，03–07 各 2 页、08 为 3 页；全部文本示意答案保留，逐份目视检查没有题目截断。系统打印对话框、具体打印机与 Safari 系统剪贴板权限由用户按上述步骤观察，未声称自动控制操作系统对话框。
- 后端不可用：六个 planned 讨论页可读，没有提交按钮；文章与工具静态可用。01/02 的既有投稿流程通过回归测试。

## 数据库同步

在单独 PostgreSQL 临时实例（仅 Unix socket、端口 55441）执行实际 CLI：

```sh
uv run lingyuan-admin migrate
uv run lingyuan-admin sync-topics ../frontend/src/content/questions
uv run lingyuan-admin sync-topics ../frontend/src/content/questions
```

结果：首次迁移 `0001_init`；两次均 `Synced 8 topics`，未重复记录。按课序 1–8 查询，01/02 `open`、03–08 `planned`，投稿行数 0。验证后停止临时实例。未使用部署环境连接参数，未触碰生产库。

## 视觉与品牌

沿用既有 token、按钮节点、说明区和静态内容页风格；没有更换字体、颜色或引入新的动画依赖。六张图解的桌面截图、08 手机长文截图和打印页用于目视检查。

正式标志与 HEAD 文件 SHA-256 相同：`b56a32a045cf372336832032fa530fcb76b3282b75f214dc979caa3c63b514cc`。没有修改或重绘原标志，没有恢复用户删除的文件。

## 独立复核与待验收事项

一次独立只读复核未发现阻塞项。指出第 03 课旧图注“过程方法”归属与来源移除后的口径不一致；已改为“任务与岗位依据任务方法、国际劳工统计概括；流程与结果为本站教学口径”，并统一为四个观察角度。最终构建与 64 项浏览器检查均在修订后通过。

来源访问局限与替代记录见 [核对清单](内容核对清单-03-08.md)。WP7 本地交付完成，用户的内容验收未代为勾选；WP5 尚未完成的公网事项不因本轮验收而自动完成。

## 用户验收与发布授权（2026-09-30）

用户确认“我觉得OK”，要求推送 GitHub 并更新服务器。此前保留草稿的验收门槛现已通过，本批六课可改为已发布、可学并开放讨论。前文为本地草稿验收时的历史记录；发布与线上核验结果另行追加。

## 发布版复验

六课改为已发布、可学和开放讨论后重新验证：39 页构建成功；类型检查 0 错误/警告；站内链接与 24 组对比度检查通过；Chromium/WebKit 64 项端到端测试通过，包含六课服务不可用时投稿内容保留。后端 ruff、格式、mypy 与真实 PostgreSQL 10 项测试通过；同步测试更新为八个开放主题，并在隔离库设置 planned 状态保留 409 拒绝测试。

## 生产发布记录（2026-09-30）

- 功能提交：`19ce7d9bed60586878de4b4809354f128adef1b4`，已推送 `origin/main`。生产主机源码通过该提交的 `git archive` 同步；服务器原本没有 `.git`，未采用 `git pull`。
- 发布前成功备份：`/var/backups/lingyuan/lingyuan-20260930T030410Z-1.dump`，服务结果 success、退出码 0、权限 0600。保留旧镜像及共享主机 Compose 快照以供回退。
- Web 镜像：`lingyuan-web:wp7-20260930`，amd64；以原已验收的 WP5 Web 镜像为基础，复制本机原生构建的 39 页与同次生成的 Caddyfile（17 个内联脚本哈希）。API 镜像 `lingyuan-api:wp7-20260930` 基于原 WP5 API，仅复制新的 questions 与 path 数据，运行代码及依赖未变化。未更换数据库镜像或卷。
- 迁移结果 Applied: none；同步结果 Synced 8 topics。八个主题均 open，生产投稿仍为 2 条、审核事件 4 条，公开投稿 0 条；与发布前记录一致。
- 按共享主机配置先更新 API 再更新 Web，服务健康。`sh smoke.sh https://ly.echoxai.net` 通过：HTML、API、CSP、资源、字体和安全头。
- 公网 Chromium 实测 39 个静态页面 HTTP 200；真正不存在的路由 HTTP 404。六课均有文章/工具/讨论链接，文章已核对发布，图解键盘 Enter 可切换，工具答案刷新后保留，六个讨论表单可见、接口 200 且公开列表为空。页面无 CSP 拦截或脚本异常；390/768/1024/1440 px 的讨论页在 Chromium 无横向溢出。
- 同机 `https://wind.echoxai.net/`、`https://hrd.echoxai.net/` 均 HTTP 200，Nginx 配置未改。
- GitHub 首次 CI 后端通过、前端 62/64；Linux/WebKit 在视口切换后即时读取尺寸得到 8 px 额外宽度。诊断未发现右侧越界的可见元素；将宽度断言改为等待布局稳定，仍要求精确等于视口且超时失败。未更改产品样式。最终功能/测试提交 `1bc1932` 的 [CI 运行](https://github.com/luvio-arlan/lingyuan-lab/actions/runs/36663371649) 前后端均 success；本地再次 64/64、后端 10/10。

完成结论：WP7 第 03–08 课已获用户验收、发布并上线；计划文档已更新。下一优先级为 WP5 的正式域名移动性能与 15 分钟从零启动复验，作者/联系方式/许可和备案仍待相应信息或外部结果。WP8 须依据真实读者反馈单项立项。
