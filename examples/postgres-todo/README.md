# 留白 · PostgreSQL 待办清单

一个可独立运行的全栈示例。静态前端和 Worker JSON API 共用一个 origin。Worker 使用
`pg` 和 `env.DB.connectionString` 访问 PostgreSQL。支持添加、查看、完成、恢复和删除待办，
首页显示最近 100 条记录。

## 本地运行

准备 Node.js 22.23.4 或 24、npm、可访问的 PostgreSQL 和 `psql`。进入本目录后安装依赖，
在终端为 `TODO_DATABASE_URL` 设置一个本地开发库的 PostgreSQL 连接串，再执行以下命令。
建议使用专用数据库，因为示例会创建和修改 `todos` 表。

```sh
npm ci
psql "$TODO_DATABASE_URL" -v ON_ERROR_STOP=1 -f schema.sql
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB="$TODO_DATABASE_URL" \
  npm run dev -- --ip 0.0.0.0 --port 8787
```

打开 [待办清单](http://127.0.0.1:8787/)。本地 Wrangler 把 `DB` 绑定接到本机指定的
数据库，因此前端与 Worker 可以一起调试。示例没有登录和用户隔离，监听所有网卡时请使用
可信测试网络和测试数据。

开发服务保持运行时，在另一个终端执行 `npm test`。冒烟测试从同一个入口访问静态页面和
API，验证建单、列表、状态切换、删除和错误输入。测试会清理自己创建的待办。通过
`TODO_ORIGIN` 可以指定另一个测试地址。`npm run check` 检查 Wrangler 打包。

## 发布到 krun

源 PostgreSQL 须支持 TLS，且 krun 的代理能够解析和访问源库域名。先在目标库执行
`schema.sql`，再按 krun 的 Wrangler 部署说明配置 API 地址、组织 ID 和 API Token。
把目标源库连接串放入终端的 `ORIGIN_DSN`，执行：

```sh
npx wrangler hyperdrive create postgres-todo-db --connection-string "$ORIGIN_DSN"
```

把输出的配置 ID 填到 `wrangler.jsonc` 中 `hyperdrive[0].id` 的占位位置，保留绑定名
`DB`，然后执行 `npx wrangler deploy`。使用控制台仓库构建时，选择项目目录
`examples/postgres-todo`，在目标 Worker 环境草稿里选择 PostgreSQL 配置并绑定成
`DB`，保存后发布。源库连接串放在终端或平台的凭据配置中，项目只保存绑定名和配置 ID。

## API

| 方法与路径 | 用途 |
| --- | --- |
| `GET /api/todos` | 查看最近 100 条待办 |
| `POST /api/todos` | 新增，JSON 字段为 `title` |
| `PATCH /api/todos/{id}` | 切换状态，JSON 字段为布尔值 `completed` |
| `DELETE /api/todos/{id}` | 删除待办 |
