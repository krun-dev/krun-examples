# Astro Worker 示例

使用 Astro Cloudflare 适配器生成 Worker。首页按请求服务端渲染，支持 `?name=...`；`GET /api/hello?name=krun` 返回 JSON。

```sh
npm ci
npm run check
npx wrangler dev --local
```

在 krun 创建 Worker，关联本仓库，将项目目录设为 `examples/astro`，构建并发布。Wrangler 配置会运行 Astro 构建并声明静态资产绑定。此示例不使用 session、KV 或图片优化。
