# zhu-chen.github.io

采用 **Astro + TypeScript + xterm.js** 的个人学术主页，目标部署平台为 GitHub Pages。

当前已实现基本命令浏览，也可通过页面链接直接阅读相同内容。个人介绍、项目和论文资料仍在整理中。

页面内容分为关于我、项目与论文、联系与链接；项目与论文统一使用 `projects` 入口。页面采用可点击的 TUI 目录与文本面板，顶部展示「zhu chen」字符画；直接在终端提示符后输入命令，输入行随输出移动，清屏后回到首行。

## 主页命令

支持 `ls`、`cd`、`help`、`pwd`、`cat`、`clear`、`whoami`、`history`。

例如依次输入 `ls` → `cd about` → `cat README.txt`；`cd ..` 返回上级，`cd ~` 回到根目录。输入 `help` 查看全部命令，`help cd` 查看具体用法。

Enter 执行，↑ / ↓ 切换历史命令；历史仅保留最近 50 条，刷新后清空。`clear` 清屏但保留当前位置和历史。页面按钮与内容链接也可直接使用。完整约定见 [终端命令规范](docs/specs/terminal-commands.md)。

## 本地开发

使用 Node.js **22.23.2**（见 [.nvmrc](.nvmrc)）和 npm **12.1.0**。已安装 nvm 时：

```sh
nvm install
nvm use
npm install --global npm@12.1.0
npm ci
npm run dev
```

没有 nvm 时，直接安装对应版本的 Node.js 和 npm 后，从 `npm ci` 开始。开发地址默认是 <http://localhost:4321>；端口占用时以终端输出为准。

目前无需配置环境变量或密钥。

## 常用命令

| 命令                   | 用途                                         |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | 启动开发服务器                               |
| `npm run check`        | 检查 Astro 和 TypeScript 类型                |
| `npm run build`        | 类型检查后生成 `dist/`                       |
| `npm run preview`      | 本地预览构建产物                             |
| `npm run format`       | 格式化代码、配置和 README                    |
| `npm run format:check` | 检查上述文件格式                             |
| `npm run test:install` | 首次安装 Chromium 测试浏览器                 |
| `npm test`             | 对已有构建产物运行浏览器冒烟测试             |
| `npm run verify`       | 依次执行格式检查、类型检查、构建和浏览器测试 |

首次完整验证：

```sh
npm run test:install
npm run verify
```

测试涵盖命令及路径行为、输入和历史导航、无 JavaScript 的基础访问、xterm.js 渲染、视口适配和运行时错误。移动设备使用 Chromium 模拟，不代替真实手机测试。

## 项目目录

- `src/pages/`：Astro 页面入口。
- `src/layouts/`：页面布局。
- `src/components/`：Astro 组件。
- `src/scripts/`：浏览器端 TypeScript。
- `src/lib/`：命令解析与内容目录导航。
- `src/data/`：页面与终端共用的主页内容。
- `src/styles/`：全局样式。
- `public/`：原样复制的静态资源。
- `tests/`：浏览器冒烟测试。

当前开发文档从 [docs/AGENTS.md](docs/AGENTS.md) 逐级查阅。

## CI 与自动部署

提交 `package-lock.json`，在新环境使用 `npm ci` 安装一致的依赖。`node_modules/`、`dist/`、`.astro/`、本地环境文件和测试产物均由 Git 忽略。

[CI and Deploy](https://github.com/zhu-chen/zhu-chen.github.io/actions/workflows/ci.yml) 在推送、Pull Request 和手动触发时执行格式检查、类型检查、构建和 Chromium 测试。

推送到 `main` 后，检查全部通过才会将 `dist/` 自动部署到 [zhu-chen.github.io](https://zhu-chen.github.io)。其他分支和 Pull Request 仅验证；也可以在 Actions 中选择 `main` 手动运行工作流以重新部署。构建或测试失败时保留上一次成功发布的网站。

首次启用需在仓库 Settings → Pages → Build and deployment 中将 Source 设为 **GitHub Actions**，无需添加部署密钥。详细流程和排查入口见 [部署文档](docs/development/deployment.md)。

Astro 按个人站点 `https://zhu-chen.github.io` 配置静态输出，构建目录为 `dist/`。使用其他域名或项目子路径时，需要同步调整 `astro.config.mjs` 与资源链接。
