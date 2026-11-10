# krun examples

可独立构建、部署到 krun Workers 的示例。每个项目都有自己的锁文件和 Wrangler 配置；纯静态示例由 Workers runtime 服务资产，无需用户编写 Worker 入口，其余示例包含业务 Worker 代码。

| 示例 | 功能 | 项目目录 |
| --- | --- | --- |
| [一隅 · 静态小站](examples/static-site) | 纯 HTML / CSS / SVG，assets-only 部署，无 Worker 入口或资源绑定 | `examples/static-site` |
| [拾光 · Photo Wall](examples/photo-wall) | 无需数据库的轻量照片墙，Worker + R2 | `examples/photo-wall` |
| [Hono Worker](examples/hono) | Hono 页面与 JSON API | `examples/hono` |
| [Astro Worker](examples/astro) | Astro 服务端渲染与 JSON API | `examples/astro` |
| [留白 · PostgreSQL 待办清单](examples/postgres-todo) | 静态前端、Worker JSON API 和 PostgreSQL 持久化 | `examples/postgres-todo` |
| [拾物 · Object Studio](examples/object-storage) | 文件工作台：上传、预览、下载、搜索与 R2 对象存储 | `examples/object-storage` |

在 krun 中关联此仓库，选择项目目录后执行构建、绑定资源并发布。具体步骤见各项目 README。
仓库不包含访问密钥、平台令牌或部署环境的私有配置。
