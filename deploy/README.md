# WP5 部署与验收

目标：一台 Linux 主机上使用 PostgreSQL 16、单进程 Uvicorn 和 Caddy。`web` 是唯一对外暴露的服务；API 与数据库只在 Compose 私有网络。Caddy 不启用访问日志，API 的 Uvicorn 也不记录访问日志，避免保存投稿者 IP。代码仓库与数据库卷、备份目录分离。

## 本地从零启动

先安装 Docker Engine 与 Docker Compose 插件（本机如果安装的是独立 `docker-compose`，脚本也支持）。仓库根目录执行：

```sh
sh deploy/local-up.sh
sh deploy/smoke.sh http://localhost:8080
```

首次运行自动生成权限为 0600 的 `deploy/.env`，其中的数据库密码和限流盐均为随机十六进制值；备份放在仓库外的 `~/.local/share/lingyuan-lab/backups`。脚本按“构建 → 启动数据库 → 迁移 → 同步问题 → 启动 API 和 Caddy”的顺序执行。它可重复运行，不会清空数据库。若 8080 端口被占用，修改 `.env` 中 `WEB_PORT` 并相应修改冒烟测试 URL。

本地人工闭环：打开 `/library/how-organizations-work/` 阅读文章，打开 `/tools/organization-observation-sheet/` 填写并刷新以确认草稿仍在，再到 `/questions/what-changes-first/` 提交一条至少 20 字的观察。审核仅使用本机管理命令：

```sh
cd deploy
docker compose --env-file .env -f compose.yaml -f compose.local.yaml run --rm api lingyuan-admin pending
docker compose --env-file .env -f compose.yaml -f compose.local.yaml run --rm api lingyuan-admin publish UUID --actor editor
```

把 `UUID` 换成 `pending` 显示的投稿 ID。刷新问题页，确认公开投稿可见。使用独立 `docker-compose` 的机器，把上面两条命令的 `docker compose` 换为 `docker-compose`。

停止容器：`cd deploy && docker compose --env-file .env -f compose.yaml -f compose.local.yaml down`。不要加 `-v`，否则会删除本地数据卷。

## 生产主机准备

1. 使用已确认的域名 `ly.echoxai.net`；将 A/AAAA 记录指向云主机，让 80、443 端口对公网开放。只开放管理所需 SSH 端口；不要开放 PostgreSQL 5432 或 API 8000。为 Caddy 的证书签发保留主机出站网络。
2. 将仓库放到 `/opt/lingyuan-lab`，创建能运行 Docker Compose 的部署用户 `lingyuan`。建立仅该用户可读的 `/opt/lingyuan-lab/deploy/.env` 与 `/var/backups/lingyuan`（0700）。从 `.env.example` 复制，生成随机十六进制 `POSTGRES_PASSWORD` 与 `RATE_LIMIT_SALT`，把 `BACKUP_DIR` 写为 `/var/backups/lingyuan`。正式域名固定在 `compose.prod.yaml`；密码只能使用 URL 安全字符，不要将 `.env` 提交到 Git。
3. 准备完整许可文本、作者介绍与联系方式并确认后，更新关于页与页脚。这是正式上线前的内容决策，当前页面仍标明“计划采用”许可。

Compose 默认让 API 只信任 Docker 私有网络的 `172.16.0.0/12` 来源。Caddy 直接面对公网，其 `reverse_proxy` 默认忽略客户端伪造的 `X-Forwarded-*` 值并设置可信的转发头。若主机的 Docker 地址池不在此范围，在 `.env` 设置实际私有网络 CIDR 为 `TRUSTED_PROXY_CIDR`；否则投稿限流可能把所有读者当成同一个客户端。

生产发布命令（从 `/opt/lingyuan-lab/deploy` 执行，确保 `.env` 已就绪）：

```sh
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml build api web
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml up -d --wait db
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml run --rm api lingyuan-admin migrate
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml run --rm api lingyuan-admin sync-topics /app/frontend/src/content/questions
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml up -d --wait --no-deps api
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml up -d --wait --no-deps web
sh smoke.sh https://ly.echoxai.net
```

这保证静态文件和其 CSP 哈希来自同一次构建。变更文章或脚本后必须重新构建 `web`；不要把旧 Caddyfile 搭配新 `dist`。迁移是独立命令，API 启动不会自动改表。新迁移可能不支持旧版 API，发布前应有可用备份并先在副本上演练；失败时保留数据库、查看 Compose 服务状态并按兼容的镜像版本恢复应用。

## 已有 Nginx 的共享主机（本次 `120.26.147.100`）

该主机的 80/443 已服务 `hrd.echoxai.net` 与 `wind.echoxai.net`。使用 `compose.shared-host.yaml`，不要使用占用 80/443 的 `compose.prod.yaml`：Web 仅绑定 `127.0.0.1:8081`，数据库与 API 不映射宿主端口。`deploy/nginx/ly.echoxai.net.http.conf` 是签证书前的维护配置，只有 ACME 验证路径可访问；证书和备案接入完成后，才切换为 `ly.echoxai.net.https.conf`。新增站点文件后必须运行 `nginx -t` 再 reload，不修改另两站的配置。Nginx 覆盖客户端提供的转发 IP 头，并关闭本站访问日志；Caddy 只信任来自私有网络的代理，再向 API 转发真实地址。

这台 2 核、1.6 GiB 内存的主机不适合在 x86 模拟环境内构建 Astro；其 Docker Hub 访问也曾超时。本次在开发机原生构建静态站点，生成匹配该次构建的 CSP Caddyfile，再装入 amd64 Caddy 镜像；API 在开发机用 `docker buildx build --platform linux/amd64 --load` 构建。将这些镜像与 amd64 的 `postgres:16-alpine` 用 `docker save --platform linux/amd64` 导出并传入主机，`docker load` 后用以下顺序启动（镜像标签在叠加配置中固定）：

```sh
cd /opt/lingyuan-lab/deploy
docker compose --env-file .env -f compose.yaml -f compose.shared-host.yaml up -d --no-build --wait db
docker compose --env-file .env -f compose.yaml -f compose.shared-host.yaml run --rm api lingyuan-admin migrate
docker compose --env-file .env -f compose.yaml -f compose.shared-host.yaml run --rm api lingyuan-admin sync-topics /app/frontend/src/content/questions
docker compose --env-file .env -f compose.yaml -f compose.shared-host.yaml up -d --no-build --wait --no-deps api
docker compose --env-file .env -f compose.yaml -f compose.shared-host.yaml up -d --no-build --wait --no-deps web
sh smoke.sh http://127.0.0.1:8081
```

让 `.env` 中的 `BACKUP_UID`、`BACKUP_GID` 等于部署用户 `id -u`、`id -g`，使归档由该用户拥有且权限为 0600。本次主机的值分别为 997、997。若没有远程监控接收端，可先启用每日备份；这时只有 systemd 失败状态和本机日志，不能视为已完成失败通知验收。

公网 HTTP（含 ACME 路径）会被阿里云返回 `Non-compliance ICP Filing` 403，服务器本机测试文件仍可访问；同机 `wind`、`hrd` 的公网 HTTP 同样被拦，但它们的 HTTPS 可访问。因此不要等 80 端口放开再签 `ly` 的证书。域名 DNS 在阿里云（`hichina.com`），用 DNS-01 单独签发：

```sh
certbot certonly --manual --preferred-challenges dns -d ly.echoxai.net
```

按提示在阿里云 DNS 为 `echoxai.net` 添加 `_acme-challenge.ly` 的 TXT 记录，确认公网能查到后再继续。证书落到 `/etc/letsencrypt/live/ly.echoxai.net/` 后，用 `ly.echoxai.net.https.conf` 替换当前的 HTTP 维护配置，`nginx -t` 通过再 reload。不要改 `hrd`、`wind` 的站点文件。签发或公网验收失败时保留维护配置。`http://` 在备案通过前仍会看到阿里云拦截页，读者需直接打开 `https://ly.echoxai.net`。

这台主机的 Certbot 1.21 不能做 TLS-ALPN。2026-09-29 实际用 acme.sh 3.1.6 的 `--alpn` 在短暂停 Nginx 后签发，并把证书装进上述 Let’s Encrypt 目录。续期钩子会先停 Nginx 再启动，因此续期时同机其他站点也会短暂中断。

## 缓存与安全

`/_astro/*` 与字体缓存一年并带 `immutable`；其余静态响应，包括无扩展名的 HTML 路径，使用 `no-cache`。内联脚本哈希由 `generate-caddy.mjs` 扫描构建后的 HTML 自动计算；CSP 的 `script-src` 只接受本站资源与这些哈希。页面现有内联样式属性需要 `style-src 'unsafe-inline'`，脚本没有该例外。Caddy 为正式域名自动申请 HTTPS 证书并发送 HSTS；本地 `:80` 仅用于 HTTP 验收。手工验收还需在浏览器控制台确认无 CSP 拦截，并对生产站点运行 securityheaders.com。

字体由 `frontend/scripts/prepare-fonts.mjs` 在构建时复制到本站，同时保留各字体包的许可证文本。页面加载完成后才载入字体样式，先让内容用系统后备字体显示。自托管字体加载完成后恢复正式字体；无脚本时用 `<noscript>` 加载。修改字体依赖后需重新构建并检查视觉与 CLS。这让大量中文字体子集不占用首屏关键网络路径。字体文件使用长缓存，`fonts.css` 使用 `no-cache`。

## 每日备份与告警

`backup` 是一次性维护容器，调用现有的 `database/scripts/backup.sh`：`pg_dump -Fc`、归档可读性检查、原子落盘和至少 14 天保留。备份目录在宿主机上，不随数据库卷消失。本次选用阿里云云监控短信告警：在云监控控制台建立已验证手机号的报警联系人组，打开“报警服务 → 报警联系人 → 报警联系组 → 接入外部报警”，安全设置选择“安全词”并添加 `LingyuanBackup`，报警级别选“短信+邮件+WebHook”，复制杭州地域的报警服务调用地址。将地址仅写入主机 `/etc/lingyuan/backup-monitor.env`，权限设为 0600、属主设为 `lingyuan`：

```ini
BACKUP_ALIYUN_ALERT_URL=https://metrichub-cms-cn-hangzhou.aliyuncs.com/event/notify?token=...&level=CRITICAL
BACKUP_ALIYUN_ALERT_KEYWORD=LingyuanBackup
```

阿里云模式仅在备份失败时上报 JSON 报警；失败的备份服务仍以原始错误码退出。URL 含可调用告警的 token，不要写入仓库或命令行。当前控制台生成的 `CRITICAL` 级别可能同时触发电话与短信；如只需短信，应在控制台选相应级别并替换完整 URL。配置后，应进行受控失败演练，核对云监控返回成功、短信实际送达以及成功备份不会误报。这个接口无法发现定时器完全没有运行的情形；如需覆盖漏跑，须另设云端缺失数据监控。

也可使用 Healthchecks 兼容监控地址并在该监控服务中配置失败/逾期通知接收人：

```ini
BACKUP_HEALTHCHECK_URL=https://your-monitor.example/ping/your-secret-id
```

Healthchecks 模式下，服务脚本先发送 `/start`，成功后发送完成 ping，失败时发送 `/fail` 并以非零状态退出；定时任务漏跑时，监控服务也应告警。若两种地址同时设置，优先使用阿里云。未配置监控端时，定时备份仍会执行，但**没有远程失败通知**，不能据此验收告警项。将 `systemd/lingyuan-backup.service` 和 `.timer` 安装到 `/etc/systemd/system/`，确认仓库路径、用户、Docker 权限及环境文件，再运行：

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now lingyuan-backup.timer
sudo systemctl start lingyuan-backup.service
sudo systemctl status lingyuan-backup.service
```

定时器在 UTC 19:00 运行，即北京时间次日 03:00。首次正式运行后，检查备份目录和监控端的成功记录，并故意使一次测试运行失败以核对告警。生产恢复演练必须在新建的空库进行，按 `database/README.md` 的 `pg_restore --exit-on-error --single-transaction` 步骤比较迁移、主题、投稿和审核事件的行数；完成后在该文档的恢复记录表追加生产环境证据。

本地验证告警脚本的分支：`sh deploy/tests/backup-alert.sh`。监控 `/start` 请求失败时仍会尝试备份，并让定时服务返回失败，以便监控逾期通知。

## 验收边界

本地冒烟脚本验证同域页面、API、CSP、安全头和缓存头。正式验收还要求计时的全新机器完整闭环、生产 HTTPS 与 securityheaders.com ≥ A、浏览器无 CSP 报错、移动 4G Lighthouse 首页 ≥85 / 文章 ≥95（LCP ≤2.5 秒，CLS ≤0.1）、以及生产库备份恢复。没有生产主机和告警接收地址时，不能把这些项目标为已完成。
