# AGENTS.md

## 项目类型

Umi Max (React) 前端应用，在 `EdgePanel/` 使用 npm 独立管理依赖。

## 安装与常用命令

- 以下命令均在 `EdgePanel/` 执行。
- 安装锁定依赖：`npm ci`；安装或更新依赖：`npm install`
- 启动开发服务器：`npm run dev`
- 构建：`npm run build`
- 格式化：`npm run format`（使用 Biome）
- 格式检查：`npm run format:check`
- Lint：`npm run lint`
- 全局依赖版本由 `package.json` 的 `overrides` 指定，锁文件为 `package-lock.json`。

## 代码风格

- **始终使用 Biome** 格式化和检查代码，严格遵循项目 `biome.json`。
- 编辑任何文件后，必须运行 Biome 格式化（不要手动调整空格、引号、换行）。
- 使用双引号、2 空格缩进、分号和 trailing comma。
- 优先函数式组件、TypeScript 严格模式。

## Biome 工作流

- 任何代码变更后执行：`npm run format`
- 提交前执行：`npm run format:check` 和 `npm run lint`
- 提交前确保所有修改文件已格式化。

## Lint 规则

- 新写或新修改的代码必须经过 Biome 扫描。
- 为了避免全量扫描耗时，可优先扫描本次修改过的代码文件：`npm exec -- biome lint <file...>`。
- 历史未修改文件不要求在本次变更中清理；需要做全量质量门验证时运行 `npm run lint`。

## 其他规范

- 遵循 Umi Max 目录结构（pages、components、models 等）。
- 遵循 Biome 的推荐规则；不要添加已被 Biome 忽略或不支持的 ESLint 专用注释。
- 新增组件/页面后更新路由配置。
