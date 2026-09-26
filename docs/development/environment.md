开发环境与验证

项目使用 Node.js 22.23.2 和 npm 12.1.0，Node 版本由根目录 .nvmrc 记录。具体安装与启动命令见 [README](../../README.md)。package.json 的 engines 和 .npmrc 的 engine-strict 会拒绝不兼容的运行环境。

依赖通过 package-lock.json 锁定；新环境使用 npm ci，新增或升级依赖时同步提交锁文件。当前 Astro 类型检查器声明支持 TypeScript 5/6，因此选用兼容的 TypeScript 6，而非直接追随 TypeScript 最新主版本。[Astro 类型检查说明](https://docs.astro.build/en/guides/typescript/)

Astro 使用静态输出，xterm.js 只在浏览器脚本中初始化。当前首页包含静态占位内容和只读终端预览，验证终端显示与容器尺寸适配；具体命令、输入历史和正式页面行为尚待 Spec 确定。终端加载前或禁用 JavaScript 时，静态内容仍可阅读。

验证入口：

- npm run check：Astro 与 TypeScript 类型检查。
- npm run build：先检查类型，再生成 dist。
- npm run format:check：代码、配置和 README 的格式检查。
- npm test：基于已有 dist 运行 Playwright 测试；先用 npm run test:install 安装 Chromium。
- npm run verify：组合执行格式检查、类型检查、构建与浏览器测试。

格式化暂不覆盖已有 docs、.agents 和根 AGENTS.md，避免环境初始化改变这些文档的排版。浏览器测试检查无脚本内容、终端显示、窄屏布局和控制台错误；设备模拟不代表已通过真实手机的输入法或软键盘验证。

CI 在 push、pull_request 和手动触发时执行相同检查，仅授予仓库读取权限。GitHub Pages 发布流程在部署阶段补充；当前准备好的是 dist 静态输出和个人站域名配置。

当前不需要 .env 或外部服务。未来需要环境变量时，提交不含敏感信息的 .env.example，并在此文档说明；实际环境文件继续由 .gitignore 忽略。

Playwright 使用固定测试端口 4322，并通过 astro preview --ignore-lock 启动由测试进程管理的预览服务，避免 Astro 自动后台化导致测试进程提前退出；不复用其他服务。

当前 npm 安装脚本许可仅包含锁定版本的 esbuild，用于准备和校验构建二进制。升级依赖后，可用 npm install-scripts ls 查看待核查的脚本，并按实际依赖更新版本许可。
