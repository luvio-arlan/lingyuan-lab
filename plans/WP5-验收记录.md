# WP5 联调与部署验收记录（进行中）

日期：2026-09-29。已完成本地验收，并在用户提供的阿里云杭州目标主机 `120.26.147.100` 部署仅本机可访问的生产候选环境；未提交或推送，尚未公开上线。开发机环境：macOS + Colima，Docker Engine 29.5.2，Docker Compose 5.5.1，Chrome 154，Lighthouse 13.5.0。正式域名为 `ly.echoxai.net`；阿里云备份失败短信已完成真实送达验收，正式许可和联系邮箱仍未确定。

## 本地部署

执行 `sh deploy/local-up.sh`：首次拉取并构建 API、Web 镜像，PostgreSQL 健康后运行 `lingyuan-admin migrate` 与 `sync-topics`，再启动单进程 Uvicorn 和 Caddy。三个服务均通过 Compose 健康检查。`sh deploy/smoke.sh http://localhost:8080` 验证首页、文章页、同域 `/api/v1/health`、HTML `no-cache`、`/_astro` 不可变缓存、CSP 哈希和安全头，结果通过。

浏览器实测顺序：打开第 02 课文章；在组织观察表输入测试答案，刷新后显示 `1 / 11 已完成`；在第 01 课开放问题提交本地示意投稿，页面出现“已收到，谢谢你”；用管理命令列出待审核 UUID `ebd596bd-8052-43df-8c61-2d61a878fef3` 并发布；刷新后在读者投稿中看到纯文本内容。首页与文章页浏览器控制台未出现 CSP 或脚本错误。测试投稿仅在本地 Compose 数据卷。

本地备份使用 `docker-compose --profile maintenance run --rm backup`，得到 `lingyuan-20260929T042713Z-1.dump`。在同一 PostgreSQL 实例中新建空库 `lingyuan_restore_wp5` 并用 `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges` 恢复，源库与恢复库的“迁移 / 主题 / 投稿 / 审核事件”行数均为 `1 / 4 / 1 / 1`。详细记录也写入 `database/README.md`。告警包装脚本的成功、备份失败、监控端不可用路径通过 `sh deploy/tests/backup-alert.sh`；后续又加入并完成阿里云短信真实送达验收，见下文。

Compose 的生产叠加配置解析通过；其 Web 监听 80/443 并使用 `ly.echoxai.net`，API 和数据库没有宿主机映射端口。以正式域名环境变量运行 `caddy adapt` 通过配置解析。根据 Caddy 官方 `reverse_proxy` 文档，默认处理会忽略客户端伪造的 `X-Forwarded-*` 值，因此不再额外覆盖该头。

## 阿里云共享主机预部署

目标主机为 Ubuntu 22.04、2 核、1.6 GiB 内存，已有 Nginx 承载 `hrd.echoxai.net` 与 `wind.echoxai.net`。检查发现 Docker 未安装，公网 80/443 被 Nginx 使用；安装 Docker Compose 与 2 GiB 交换空间后，本站改用 `compose.shared-host.yaml`，Web 仅绑定 `127.0.0.1:8081`，API 与 PostgreSQL 无宿主机端口。Nginx 新增独立 `ly` 站点文件；其 HTTP 配置仅开放 ACME 验证路径，其余返回 503。另两站配置文件未改动，服务器本机请求其 HTTP 域名仍分别返回预期的 301；`nginx -t` 通过。

服务器访问 Docker Hub 超时；在开发机以 amd64 架构构建 API，原生构建 Astro 静态站点后封装为 amd64 Caddy 镜像，与 amd64 PostgreSQL 16.15 镜像一同传入服务器。首次用旧版跨架构构建方式得到的 API 镜像在服务器出现层校验错误，已用 Buildx 重建并以服务器容器 `import lingyuan_api` 验证。服务器执行迁移 `0001_init`、同步 4 个问题后，三个容器均健康；`sh smoke.sh http://127.0.0.1:8081` 通过。监听检查显示仅 Nginx 占用公网 80/443，本站 Web 占用本机 8081，数据库和 API 不对外监听。

经 SSH 本地转发，以浏览器打开目标主机的文章、组织观察表和问题页；观察表填写后刷新仍显示 `1 / 11 已完成`。在目标主机 API 提交测试投稿 `cdce8b77-4aaf-41a5-b553-58c72d336eaf`，待审核时公开列表为空；管理命令发布后，浏览器问题页看到了纯文本投稿；随后用 `unpublish` 撤回，公开列表再次为空。验收投稿及 2 条审核事件保留在库中，不会公开显示。

目标主机上的 `backup` 容器生成 `/var/backups/lingyuan/lingyuan-20260929T075403Z-1.dump`，在新空库 `lingyuan_restore_wp5_server` 中用 `pg_restore --exit-on-error --single-transaction --no-owner --no-privileges` 恢复；源库与恢复库四表行数均为 `1 / 4 / 1 / 2`。演练库已删除，归档保留，详细步骤记入 `database/README.md`。已启用 `lingyuan-backup.timer`，手动触发服务结果为 `success`，下一次定时运行时间为北京时间 2026-09-30 03:00。此时尚无远程通知接收端，后续已接入并验收阿里云短信，见下段。

用户指定失败通知走阿里云短信。服务器现有云监控 Agent 运行正常，但 ECS 元数据中的实例 RAM 角色接口返回 404，且服务器没有阿里云 CLI；SSH 权限不能代替阿里云账号控制台权限。已按云监控“接入外部报警”接口为备份脚本增加失败时的 JSON 上报分支，URL 和安全词只从服务环境文件读取，URL 经 curl 标准输入配置传入，不出现在命令行参数中。模拟成功备份、失败上报和云监控拒绝路径的本地测试通过。用户提供的真实云监控告警地址已写入目标主机 `/etc/lingyuan/backup-monitor.env`，目录权限 0700、文件权限 0600，均归属 `lingyuan`；地址未写入仓库或文档。使用临时假备份命令在服务器触发受控失败，真实云监控接口返回 `code=200`，脚本按原始失败状态退出 7；没有触碰生产数据库。用户确认绑定手机已收到 `Lingyuan backup failed` 短信。随后手动运行正式备份服务，结果 `success`、退出码 0，生成第三份归档，定时器仍为 `active`。备份失败通知已完成真实端到端验收；该方式不检测定时器漏跑。

`ly.echoxai.net` 的权威 A 记录已指向此服务器；从公网通过 HTTP 访问其 ACME 测试文件返回阿里云 `Non-compliance ICP Filing` 403，`hrd` 和 `wind` 子域的公网 HTTP 请求也出现同样拦截，服务器本机请求该文件正常。起初根据用户口述暂按“已有备案、待排查接入”处理；后续控制台订单确认实际处于首次备案初审。尚未签发 `ly` 的 HTTPS 证书，也未将站点从维护配置切到公网代理。

进一步排查：DNS A 记录为 `120.26.147.100`，无 AAAA；在服务器 ACME Webroot 放置固定测试文件后，以域名解析到本机 Nginx 访问返回文件内容，而公网同一路径的 HTTP 请求返回 `Server: Beaver` 的备案 403 页面。macOS 系统 `curl` 对三个域名的 HTTPS 请求均在 TLS 阶段失败，**这不能证明现有两站的 HTTPS 不可访问**：在用户电脑的 Chrome 中刷新 `https://wind.echoxai.net/`、打开 `https://hrd.echoxai.net/` 均正常；从外部用 OpenSSL 连接 `wind` 的 443 端口也取得有效证书与 HTTP 200。Chrome 访问 `https://ly.echoxai.net/` 则到达证书域名不匹配错误，符合 `ly` 尚无专属证书的状态。`hrd`、`wind` 公网 HTTP 均由 `Beaver` 返回备案 403，说明 HTTP 拦截发生在 Nginx 之前；现有两站的 HTTPS 实测可用。Certbot 1.21.0 及 `certbot.timer` 已安装运行，但 `ly` 证书尚不存在。HTTP-01 证书验证要求公网 80 端口可达，因此在备案拦截解除前不发起签发。

用户随后提供的“我的备案”截图显示一笔**首次备案**订单已于 2026-09-29 16:22:55 提交，当前停在第 2 步“阿里云初审”，尚待提交管局、短信核验和管局审核；不可把“已提交”记成“备案完成”。订单详情截图随后确认网站域名为 `echoxai.net`、实例 IP 为 `120.26.147.100`，与前端 canonical、DNS 和服务器 `ly.echoxai.net` 配置一致。用户此前消息提到的 `ly.echoxai.com` 是笔误；`.com` 当前未指向目标主机，部署目标不变。现有 `hrd`、`wind` Nginx 配置未改，备案审核不会直接修改服务器配置；两站的 HTTPS 当前可访问，备案审核完成后仍需复测三个子域。

通过 SSH 本地转发访问目标主机的 `127.0.0.1:8081`，用 Lighthouse 13.5.0、移动视口 412 × 823、模拟 150 ms RTT / 1.6 Mbps / CPU 4 倍减速再次测试：首页 97 分、LCP 2.309 秒、CLS 0.00145；第 02 课文章 98 分、LCP 2.325 秒、CLS 0。两份报告 `runWarnings` 均为空。这是目标主机提供页面的单次预检，路径经 SSH 转发且没有正式 HTTPS、阿里云公网入口，因此不能替代正式域名的生产性能验收。

## 移动性能预检

命令使用 Lighthouse `--form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance`；报告配置为 412 × 823、约 1.6 Mbps、150 ms RTT、CPU 4 倍减速。初始构建首页 58 分 / LCP 8.11 秒 / CLS 0，文章页 60 分 / LCP 6.91 秒 / CLS 0。首屏请求被包含 118 条字体声明的基础 CSS 和中文字体子集占用。

调整后通过 `frontend/scripts/prepare-fonts.mjs` 自托管相同字体，页面加载完成后再加载字体样式，正式字体仍会替换后备字体。Web 镜像内同时保留五份对应字体包的 LICENSE 文本。浏览器确认 `fonts.css` 已加载、Noto Serif SC Variable 和 Instrument Serif 可用；首页截图显示现有布局和标志正常。相同 Lighthouse 配置下：

| 页面 | 分数 | LCP | CLS | WP5 本地目标 |
| --- | ---: | ---: | ---: | --- |
| 首页 | 98 | 2.26 秒 | 0.0014 | ≥85、≤2.5 秒、≤0.1 |
| 第 02 课文章 | 100 | 1.65 秒 | 0 | ≥95、≤2.5 秒、≤0.1 |

这是本机容器与模拟网络的单次成功测量。追加测量时 Lighthouse 曾出现 `NO_NAVSTART`、连接 Chrome 失败，未形成第二份有效报告；不据此推断生产性能。前端 `npm run check` 为 0 错误/警告，`npm run build` 和 `npm run check:links` 通过。异步字体加载可能产生短暂的后备字体显示，生产设备上仍需复查视觉与 CLS。

## 公网 HTTPS

2026-09-29 17:05（北京时间）。主机上的 Certbot 1.21 不支持 TLS-ALPN，而公网 80 仍被阿里云拦截，不能做 HTTP-01。安装 acme.sh 3.1.6 后，短暂停 Nginx，用 `--alpn` 向 Let’s Encrypt 签发 `ly.echoxai.net`。证书有效期至 2026-12-28，安装到 `/etc/letsencrypt/live/ly.echoxai.net/`，站点文件换成 `ly.echoxai.net.https.conf` 后 `nginx -t` 与 reload 通过。续期钩子会在验证前停止 Nginx、结束后启动；acme.sh 记录的下次续期窗口约为 2026-11-28。续期时 `wind` 与 `hrd` 会随 Nginx 短暂停一下。

服务器上 `sh smoke.sh https://ly.echoxai.net` 通过。公网证书使用者为 `CN=ly.echoxai.net`。securityheaders.com 对 `https://ly.echoxai.net/` 的评级为 A+（2026-09-29 09:11:40 UTC）。浏览器打开首页、第 02 课并点击星型模型的「战略」、在组织观察表填写后刷新仍为 `1 / 11`。在第 01 课问题页提交验收投稿 `d73afc30-8bec-4eae-aca5-06a411afd417`，发布后页面显示纯文本，随即 `unpublish`；公开接口 `items` 再次为空。文章页与问题页的内容安全策略违规监听为空。切换后 `https://wind.echoxai.net/` 与 `https://hrd.echoxai.net/` 仍返回 HTTP 200。从公网访问 `http://ly.echoxai.net/` 仍是阿里云 `Beaver` 的备案 403；服务器本机访问同一地址才会看到 Nginx 的 HTTPS 跳转。

同一 Lighthouse 13.5.0、移动端模拟 4G 配置下，正式域名单次结果：首页 74 分、LCP 4.4 秒、CLS 0.001；第 02 课文章 96 分、LCP 2.7 秒、CLS 0。两份 `runWarnings` 为空。首页未达 ≥85 与 LCP ≤2.5 秒，文章 LCP 也略高于 2.5 秒。追踪显示首屏仍会拉下多份中文字体子集。

## 尚未完成的 WP5 验收项

- 全新机器从零启动、计时 ≤15 分钟及完整浏览器闭环：目标主机已跑通闭环，但安装 Docker、绕开 Docker Hub 不通与跨架构构建失败使首次启动超过 15 分钟；该时间门槛未通过。
- 生产移动 4G Lighthouse 首页 ≥85、文章 ≥95、LCP ≤2.5 秒、CLS ≤0.1：正式 HTTPS 上首页 74 / 4.4 秒、文章 96 / 2.7 秒，未通过。
- 每日定时器已启用，首次按时运行尚待北京时间 2026-09-30 03:00 观察。
- 备案订单仍在审核。公网 HTTP 仍被阿里云备案 403 拦截，读者需要直接打开 `https://ly.echoxai.net`。
- 正式许可文本、作者介绍与联系方式仍待确定；关于页和页脚目前只写“计划采用”。取得备案号后需在本站页脚展示并链接工信部备案页面。

以上项目完成前，WP5 在主计划中保持未整包验收，进度记录不写“已完成”。
