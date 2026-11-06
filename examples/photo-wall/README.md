# 拾光 · Photo Wall

一个无需数据库的简洁照片墙：静态前端 + Worker + R2。上传 JPEG、PNG、WebP 或 GIF（最大 5 MiB），按上传时间浏览并打开原图。照片直接保存在 R2，列表用 R2 游标分页，没有额外索引。

核心前端和 Worker 不依赖第三方包；生产运行不需要 Node。示例使用独立桶的 `photos/` 前缀，请勿与其他应用共用此路径。

## 本地运行

```sh
cd examples/photo-wall
npm ci
npm test
npm run dev
```

Wrangler 使用本地 R2 模拟器；首次运行会下载 Wrangler。

## 部署到 krun

1. 创建逻辑桶 `photo-wall`，并创建 Worker 服务。
2. 关联本仓库，项目目录填 `examples/photo-wall`。
3. 在环境配置中把 R2 binding `PHOTOS` 指向该桶，保存后构建并发布。

浏览器通过同源 `/api/photos` 上传与列举，原图由 `/api/photos/{id}` 返回。

**访问权限：**示例没有登录、访问控制或配额，能够访问服务的人都能查看并上传图片；上传的内容长期保存在桶中。仅适合可信环境演示，公开使用前请增加认证、限额和清理机制。图片类型根据上传方提供的 Content-Type 判断，不做内容审核或图片解码。
