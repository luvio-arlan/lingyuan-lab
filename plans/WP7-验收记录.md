# WP7 第 03–08 课本地验收记录

日期：2026-09-30。结论：六课草稿交付及技术验收通过，来源按用户明确委托完成核对；等待用户检查内容与使用体验。本轮没有提交、推送、部署、开放新讨论或修改生产数据库。

## 直接打开本地检查

预览正在 `http://127.0.0.1:4321` 运行。可以先打开[知识库](http://127.0.0.1:4321/library/)，六篇新增课程显示“草稿 · 来源已核对”。无需阅读论文；核对过程已记入 [来源清单](内容核对清单-03-08.md)。

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
