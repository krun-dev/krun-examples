# 拾物 · Object Studio

一个真实读写对象存储的全栈文件工作台：Vite 静态前端、Workers API、R2 binding。

- 拖拽 / 多文件上传、上传进度、错误提示，单文件最多 10 MiB，每批最多 20 份。
- 图片预览、文件详情、下载、确认后删除、分类、搜索、排序、网格 / 列表视图。
- 真实的文件数量和大小统计，列表支持游标分页；统计针对当前已加载的文件。
- Worker 通过 `env.FILES` 访问对象，前端只调用同源 `/api/*`，不接触任何存储密钥。
- 响应式布局，支持键盘操作和减少动效设置；不依赖第三方图片或字体服务。

## 本地运行

```bash
cd examples/object-storage
npm ci
npm test
npm run dev
```

Wrangler 在构建时执行 Vite，本地 R2 模拟器持久化开发文件；生产运行不需要 Node。

## 部署到 krun

1. 在平台组织里创建逻辑桶 `object-studio-files`。
2. 创建 Worker 服务，选择组织允许的 Network Profile；共享演示建议使用 Office 入口。
3. 关联 `https://github.com/krun-dev/krun-examples`，ref 选 `main`，项目目录填 `examples/object-storage`。
4. 在目标环境的 R2 绑定中将 `FILES` 指向 `object-studio-files`，保存配置。
5. 构建仓库，发布成功的 Build；打开该环境的 Worker 地址。

仓库构建会读取 `wrangler.jsonc`，执行 `npm ci` 和构建命令，打包 Worker 与 `dist/`。
逻辑桶与环境绑定由平台配置；源码的 `r2_buckets` 声明也可用于 Wrangler 协议部署。
项目不创建云厂商物理桶，也不向业务注入长期密钥。

## API

| 请求                                            | 用途                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/status`                               | 检查存储是否可用                                                           |
| `GET /api/objects?cursor=...`                   | 分页列举文件及元数据                                                       |
| `POST /api/objects`                             | 原始文件内容，`X-File-Name` 为 URL 编码的文件名，`Content-Type` 为媒体类型 |
| `GET /api/objects/{encodeURIComponent(key)}`    | 下载原始字节                                                               |
| `HEAD /api/objects/{encodeURIComponent(key)}`   | 查看对象大小与 ETag                                                        |
| `DELETE /api/objects/{encodeURIComponent(key)}` | 删除单个文件                                                               |

图片预览使用 `?preview=1`，仅 PNG/JPEG/WebP/GIF/AVIF 内联；HTML/SVG 等文件仍作为附件下载。
实际对象全部位于专用逻辑桶的 `files/` 前缀，文件名不作为目录，写入不会覆盖已有对象。

此示例的文件 API 不带应用层用户登录，能访问 Worker 地址的用户即可操作桶内文件。
面向不可信访问者发布前，应接入自己的认证与配额；仅配置内网域名不等于应用层鉴权。

## 构建检查

```bash
npm test
npm run build
npx --yes wrangler@4.155.0 deploy --dry-run --outdir .data/worker
```

前端是纯静态产物，后端和前端分别由 Worker 与资产服务处理。列表中的文件、大小和连接
状态均来自真实 API，没有内置的虚构文件数据。

## 验证真实对象存储

```bash
npm run verify -- https://your-worker.example.com
```

脚本创建自己的随机文件，验证上传、字节一致的读取、HEAD、分页列举和删除，
并在验证结束后清理验收文件，不会改动其他对象。省略地址时验证本地 `127.0.0.1:8788`。
