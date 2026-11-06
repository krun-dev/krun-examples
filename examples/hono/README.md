# Hono Worker 示例

使用 Hono 提供页面与 JSON API，不需要存储或密钥。`GET /api/hello?name=krun` 返回问候 JSON。

```sh
npm ci
npm run check
npm run dev
```

在 krun 创建 Worker，关联本仓库，将项目目录设为 `examples/hono`，构建并发布到目标环境。构建读取 `wrangler.jsonc`，无需额外绑定。
