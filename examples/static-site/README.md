# 一隅 · Workers 纯静态站点

一个部署在 **krun Workers** 上的暖色纸张与植物插画风格小站，包含响应式首页、原生可展开手记和自定义 404 页面。内容为虚构的日常手记，适合作为个人主页或项目介绍页的起点。

“纯静态”指站点内容为静态文件。部署走 krun 的 Worker → 构建 → 版本 → 环境发布链路，请求由 Workers 的 workerd runtime 服务，无需另行配置 OSS 静态站点托管。

页面只有 HTML、CSS 和本地 SVG，没有浏览器 JavaScript、API、远程字体或外部图片请求。关闭 JavaScript 后，导航和手记展开仍可用。

## 项目结构

```text
public/
  index.html    # 首页
  styles.css    # 桌面 / 移动端样式
  garden.svg    # 本地植物插画
  404.html      # 未匹配路径返回的页面
wrangler.jsonc  # 仅配置 assets，无 main 或 binding
```

`public/` 就是完整静态产物。`npm run build` 只提示文件已就绪，不编译或生成 Worker 代码。Node.js 和 Wrangler 仅用于本地开发与构建检查，运行时不需要 Node.js。

## 本地预览与构建检查

```sh
npm ci
npm run check
npm run dev
```

打开 Wrangler 输出的本地地址，检查首页与 `/not-found`；后者应返回自定义 404 页面和 HTTP 404。也可以直接用浏览器打开 `public/index.html` 查看首页。

## 从 krun 控制台部署

1. 在 krun 创建 Worker，关联仓库 `https://github.com/krun-dev/krun-examples`。
2. 分支选择包含本例的分支；项目目录填写 `examples/static-site`。
3. 构建新版本，成功后发布到目标环境；无需添加变量、Secret、R2 或资产 binding。
4. 打开环境地址，确认首页、插画和样式正常；展开手记，检查窄屏布局。
5. 访问 `/not-found`，应显示「这里留了一点空白」并返回 HTTP 404，而不是首页。

此项目使用 assets-only 配置，没有 `main`，也没有业务 Worker 入口。平台会将资产打包进不可变制品，并用内部入口接入现有发布链路；这不需要用户编写 Worker 代码。

## 使用 Wrangler 部署到 krun

先配置终端连接，凭据不要写入文件或提交：

```sh
export CLOUDFLARE_API_BASE_URL=https://console.example.com/api/v1/cloudflare/client/v4
export CLOUDFLARE_ACCOUNT_ID=replace-with-organization-id
export CLOUDFLARE_API_TOKEN=replace-with-krun-api-key
npx wrangler@4.155.0 deploy
```

将示例控制台 origin、组织 ID 和 Key 替换为自己的值。部署后使用 krun 返回的地址验证。

## 修改页面

直接编辑 `public/index.html` 的文字、`public/styles.css` 的颜色，或替换 `public/garden.svg`。新增静态文件也放在 `public/`。不要在页面中写入凭据。

`assets.not_found_handling` 使用 `404-page`，适合这种普通静态页面；本例不启用 SPA fallback。`_headers` 和 `_redirects` 如有需要，可按 krun 支持的规则放在 `public/`，不需要增加 Worker 入口。
