# AI Research Agent

一个可自行托管的联网研究助手。它会把研究问题拆成计划，检索公开网页、读取来源、提取并复核证据，最后生成带引用来源的 Markdown 报告。

项目默认使用本地 SQLite 保存数据，不需要独立数据库服务。

## 功能

- 完整研究流水线：Planner → Search → Read → Extract → Verify → Write
- 支持 DeepSeek、OpenAI 以及其他 OpenAI 兼容接口
- 支持 SearXNG 和 Bing RSS 搜索
- 实时显示检索、读取、提取、复核和撰写进度
- 报告自动保存到研究历史
- 当前报告和历史报告均可下载为 Markdown
- 支持中英文界面和移动端布局
- API Key 使用 AES-256-GCM 加密保存
- 密码使用 Argon2id 哈希
- 单文件 SQLite 数据库，方便备份和迁移
- Docker Compose 一键部署

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite + Drizzle ORM
- i18next / react-i18next
- `better-sqlite3`
- Docker Compose

## 快速开始

### Docker Compose

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 生成加密主密钥：

```bash
openssl rand -base64 32
```

将结果写入 `.env`：

```env
APP_ENCRYPTION_KEY=生成的 Base64 密钥
```

3. 按需修改 `.env`：

```env
AUTH_MODE=owner
DATABASE_PATH=/app/data/research-agent.sqlite
SESSION_COOKIE_SECURE=false
SEARCH_PROVIDER=searxng
SEARXNG_URL=http://searxng:8080
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Administrator
ADMIN_PASSWORD=至少十二位的强密码
```

4. 启动应用：

```bash
docker compose up -d --build
```

5. 创建或重置管理员：

```bash
docker compose run --rm admin
```

创建成功后，建议从 `.env` 删除 `ADMIN_PASSWORD`。

访问 `http://localhost:3000`。

### 本地开发

环境要求：

- Node.js 22+
- npm 或其他兼容包管理器
- Bun 1.3+，用于运行测试
- 可访问所选模型接口和搜索服务

安装依赖：

```bash
npm install
```

复制 `.env.example` 并完成配置，然后运行：

```bash
npm run dev
```

`npm run dev` 会自动运行 SQLite 数据库迁移。

如果使用 `owner` 模式，还需创建管理员：

```bash
npm run admin:create
```

## 认证模式

### `owner`

公网和共享环境推荐使用此模式：

```env
AUTH_MODE=owner
```

- 未登录用户会被重定向到 `/login`
- 只有管理员可以修改模型配置和查看研究历史
- 登录会话保存在本地 SQLite 中
- Cookie 使用 HttpOnly、SameSite=Lax 和可配置的 Secure 属性

公网部署应设置：

```env
SESSION_COOKIE_SECURE=true
```

### `none`

仅适合本机、局域网、VPN 或受信任代理后使用：

```env
AUTH_MODE=none
```

此模式会自动使用固定的本地所有者身份，不显示登录和退出流程。任何能够访问该端口的人都可能使用模型、消耗费用并读取历史报告。不要把该模式直接暴露到公网。

## 模型设置

登录后在右上角打开“模型设置”，填写：

- OpenAI 兼容接口的 Base URL
- 模型名称
- API Key

应用会调用：

```text
{BASE_URL}/chat/completions
```

API Key 保存后不会返回浏览器，只会显示脱敏后缀。编辑配置时留空 API Key，表示继续使用已保存的密钥。

## 研究参数

研究设置保存在 SQLite，并应用于之后发起的研究。

| 参数 | 默认值 | 可调整范围 |
|---|---:|---:|
| 搜索查询数 | 3 | 1–10 |
| 最大来源数 | 8 | 1–20 |
| 单页字符数 | 9,000 | 1,000–50,000 |
| HTML 大小上限 | 1,500,000 字节 | 100,000–10,000,000 |
| 最大主张数 | 12 | 1–30 |
| 最大章节数 | 8 | 1–15 |
| 每章段落数 | 8 | 1–15 |
| 单次输出 token 上限 | 16,000 | 1,000–64,000 |

推理型模型通常需要更高的输出 token 配额，否则可能完成推理但没有输出最终 JSON。

## 搜索配置

推荐使用自建 SearXNG：

```env
SEARCH_PROVIDER=searxng
SEARXNG_URL=http://searxng:8080
```

也可以使用内置 Bing RSS 回退：

```env
SEARCH_PROVIDER=bing
```

网页读取包含 DNS/IP 校验、私有地址拦截、重定向限制、响应大小限制和超时。

## 数据与隐私

默认数据库文件：

```text
data/research-agent.sqlite
```

其中包含：

- 管理员账号和会话记录
- 加密后的模型 API Key
- 研究历史、报告内容和引用来源
- 研究参数设置

不要提交以下本地文件：

```text
.env
.env.*
data/*.sqlite
data/*.sqlite-shm
data/*.sqlite-wal
```

这些路径已经加入 `.gitignore`。提交或推送前运行：

```bash
npm run privacy:check
```

脚本会检查常见 API Key、私钥、带凭据的数据库地址、个人绝对路径，以及本地 SQLite 和 `.env` 是否被 Git 忽略。检查结果不会输出密钥内容。

`APP_ENCRYPTION_KEY` 必须单独备份。丢失后，数据库中已保存的模型 API Key 将无法解密。

## 备份

停止应用后备份：

```text
data/research-agent.sqlite
```

如果存在 WAL 文件，也一并备份：

```text
data/research-agent.sqlite-shm
data/research-agent.sqlite-wal
```

更稳妥的方式是使用 SQLite 的在线备份功能，或先停止容器再复制整个 `app_data` 数据卷。

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_PATH` | SQLite 文件路径 |
| `AUTH_MODE` | `owner` 或 `none`，默认 `owner` |
| `SESSION_COOKIE_SECURE` | HTTPS 部署时设为 `true` |
| `APP_ENCRYPTION_KEY` | Base64 编码的 32 字节 AES 主密钥 |
| `SEARCH_PROVIDER` | `searxng` 或 `bing` |
| `SEARXNG_URL` | SearXNG 地址 |
| `NEXT_PUBLIC_APP_TITLE` | 应用标题 |
| `NEXT_PUBLIC_APP_DESCRIPTION` | 应用描述 |
| `ADMIN_EMAIL` | 初始化管理员的邮箱 |
| `ADMIN_NAME` | 初始化管理员名称 |
| `ADMIN_PASSWORD` | 初始化管理员密码，创建后应删除 |
| `APP_PORT` | Docker 映射端口，默认 `3000` |

## 验证

```bash
npm run privacy:check
npm run typecheck
npm run lint
bun test
npm run build
```

## 项目结构

```text
src/app/                 页面和 API 路由
src/components/          通用界面组件
src/i18n/                中英文文案
src/lib/auth/            登录、密码和会话
src/lib/db/              SQLite、Drizzle schema、迁移和查询
src/lib/llm/             OpenAI 兼容接口和密钥加密
src/lib/research/        研究流水线、搜索和报告导出
scripts/create-admin.ts  管理员初始化
scripts/check-privacy.mjs 开源前隐私检查
```

## 安全说明

- 公网部署必须使用 HTTPS
- `owner` 模式是公网部署的默认安全选择
- 不要把 `.env`、SQLite 文件或备份目录提交到 Git
- 不要在不信任的环境中开启 `AUTH_MODE=none`
- 运行中任务保存在当前进程内，多实例部署需要共享限流和持久任务队列
- 网页内容属于不可信输入，AI 证据审阅不等同于人工事实核查

## 贡献

欢迎提交 Issue 和 Pull Request。提交前请确保：

- `npm run privacy:check` 通过
- `npm run typecheck` 通过
- `npm run lint` 通过
- `bun test` 通过
- `npm run build` 通过

## License

本项目使用 [MIT License](LICENSE)。
