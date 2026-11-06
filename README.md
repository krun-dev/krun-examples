# krun examples

可独立构建、部署到 krun 的 Workers 示例。每个项目都有自己的前端、Worker、锁文件和 Wrangler 配置。

| 示例 | 功能 | 项目目录 |
| --- | --- | --- |
| [拾光 · Photo Wall](examples/photo-wall) | 无需数据库的轻量照片墙，Worker + R2 | `examples/photo-wall` |
| [拾物 · Object Studio](examples/object-storage) | 文件工作台：上传、预览、下载、搜索与 R2 对象存储 | `examples/object-storage` |

在 krun 中关联此仓库，选择项目目录后执行构建、绑定资源并发布。具体步骤见各项目 README。
仓库不包含访问密钥、平台令牌或部署环境的私有配置。
