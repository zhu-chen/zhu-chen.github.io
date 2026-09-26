# GitHub Pages 自动部署

站点地址：[https://zhu-chen.github.io](https://zhu-chen.github.io)。Astro 输出静态文件到 dist，域名配置见 astro.config.mjs。

## 发布流程

工作流位于 [.github/workflows/ci.yml](../../.github/workflows/ci.yml)，名称为 CI and Deploy。

1. push、pull_request 或手动触发时，在 Ubuntu 24.04 上使用 .nvmrc 指定的 Node.js 和 npm 12.1.0 安装锁定依赖。
2. 执行格式检查、Astro / TypeScript 检查、静态构建，以及桌面和移动视口的 Chromium 测试。
3. 仅 main 的 push 或 main 上的手动运行会上传通过验证的 dist，生成 github-pages 制品。
4. 独立 deploy 任务依赖 verify 成功，通过 GitHub Pages 官方 Action 发布该制品。

其他分支和 Pull Request 只验证，不上传站点、不发布。失败的验证不会进入部署任务，线上保留之前的成功版本。每个分支独立控制并发；main 正在运行的验证和部署不会被新推送中断，其他分支会取消已过时的运行。

验证任务只读仓库。部署任务使用自动提供的 GITHUB_TOKEN 和 OIDC，权限限定为 pages: write 与 id-token: write，无需创建 PAT、SSH 部署密钥或仓库 Secret。发布内容只有 dist；项目文档和开发配置不作为站点产物上传。

## 首次启用

在[仓库 Pages 设置](https://github.com/zhu-chen/zhu-chen.github.io/settings/pages)的 Build and deployment 中，将 Source 设为 **GitHub Actions**。此设置只需完成一次；分支发布模式的默认 Jekyll 构建不能直接构建 Astro 源码。

部署使用 github-pages 环境。若以后添加环境保护规则，应允许 main 部署；启用人工审批会使发布等待审批。

## 日常发布与重试

将修改提交并推送到 main，即可自动验证并部署。完成状态见 [Actions](https://github.com/zhu-chen/zhu-chen.github.io/actions/workflows/ci.yml)，成功部署的 URL 也会显示在运行摘要及 github-pages 环境中。

需要重新发布时，在 Actions → CI and Deploy → Run workflow 中选择 main。其他分支的手动运行仍只执行验证。

如需回退网站，将对应代码恢复为已确认的版本并作为新提交推送到 main，仍走完整验证与发布流程。

## 故障排查

- verify 失败：查看失败步骤日志。如果依赖安装报 EALLOWREMOTE，检查 .npmrc 与锁文件中的 registry 是否一致，不要通过放开远程包限制绕过；本项目统一使用 npm 官方仓库。本地复现使用 npm ci 和 npm run verify，首次测试先安装 Chromium。
- deploy 失败：确认 Pages Source 为 GitHub Actions、工作流保留 Pages / OIDC 权限，并检查 github-pages 环境保护规则。
- 部署成功但页面未更新：先确认成功运行对应 main 的最新提交，再等待 Pages 分发并刷新缓存；资源路径或域名变更还需检查 astro.config.mjs。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
