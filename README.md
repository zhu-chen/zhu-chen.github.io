# zhu-chen.github.io

采用 **Astro + TypeScript + xterm.js** 的个人学术主页，目标部署平台为 GitHub Pages。

当前是可运行的项目骨架：静态首页和只读终端预览用于验证技术栈接入。正式内容、页面布局与命令交互将按后续规范实现。

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

测试涵盖无 JavaScript 的基础访问、xterm.js 渲染、视口适配和运行时错误。移动设备使用 Chromium 模拟，不代替真实手机测试。

## 项目目录

- `src/pages/`：Astro 页面入口。
- `src/layouts/`：页面布局。
- `src/components/`：Astro 组件。
- `src/scripts/`：浏览器端 TypeScript。
- `src/styles/`：全局样式。
- `public/`：原样复制的静态资源。
- `tests/`：浏览器冒烟测试。

当前开发文档从 [docs/AGENTS.md](docs/AGENTS.md) 逐级查阅。

## 构建与 CI

提交 `package-lock.json`，在新环境使用 `npm ci` 安装一致的依赖。`node_modules/`、`dist/`、`.astro/`、本地环境文件和测试产物均由 Git 忽略。

GitHub Actions 执行格式检查、类型检查、构建和 Chromium 测试。当前工作流负责验证，发布流程待部署阶段补充。

Astro 按个人站点 `https://zhu-chen.github.io` 配置静态输出，构建目录为 `dist/`。使用其他域名或项目子路径时，需要同步调整 `astro.config.mjs` 与资源链接。
