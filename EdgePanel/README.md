# EdgePanel

GoEdge2 管理面板，基于 React 19、TypeScript、Umi Max、Ant Design 6 和 Pro Components 构建，使用 Utoopack 作为构建工具，页面采用 `#/...` hash 路由。

## 环境准备

- 建议使用 Node.js 24 LTS 和随附的 npm。当前 Pro Components 依赖要求 Node.js `>=22.12.0`。
- 前端依赖在 `EdgePanel/` 内独立管理，使用 `package.json` 和 `package-lock.json`。
- 联调前先启动 EdgeAPI，确认其 HTTP/HTTPS API 地址可访问。

## 本地开发

在仓库根目录执行：

```bash
cd EdgePanel
npm ci
npm run dev
```

安装依赖会自动执行 `max setup`，生成 Umi 类型声明与运行时文件。启动后使用终端显示的前端地址访问面板。

### 指定开发服务器端口

开发服务器默认监听 `8000` 端口。Umi 内置支持 `PORT` 环境变量，可用于指定其他端口，例如：

```bash
PORT=8080 npm run dev
```

在仓库根目录执行时：

```bash
PORT=8080 npm --prefix EdgePanel run dev
```

`PORT` 只影响前端开发服务器，不会改变 EdgeAPI 的监听地址；修改后需重新启动 `npm run dev`。也可以同时指定 API 代理目标：

```bash
PORT=8080 EDGE_PANEL_PROXY_TARGET=http://127.0.0.1:8003 npm run dev
```

### 指定 API 地址

开发服务器通过 `config/config.ts` 将 `/api` 和 `/file` 请求代理到 EdgeAPI。环境变量 `EDGE_PANEL_PROXY_TARGET` 用于指定代理目标，未设置或为空时默认为 `http://127.0.0.1:7001`。

例如，EdgeAPI 运行在本机 `8003` 端口时，在 `EdgePanel/` 执行：

```bash
EDGE_PANEL_PROXY_TARGET=http://127.0.0.1:8003 npm run dev
```

也可以在仓库根目录执行：

```bash
EDGE_PANEL_PROXY_TARGET=http://127.0.0.1:8003 npm --prefix EdgePanel run dev
```

目标地址应包含协议、主机和端口（如 `http://127.0.0.1:8003`），无需追加 `/api` 或 `/file`；代理会保留请求路径。该地址由开发服务器访问，修改环境变量后需重新启动 `npm run dev`。

`EDGE_PANEL_PROXY_TARGET` 用于开发代理，不会为构建后的静态文件配置生产 API 地址。部署时应由 Web 服务器或反向代理将同源的 `/api`、`/file` 请求转发到实际 EdgeAPI 服务。

## 常用命令

以下命令均在 `EdgePanel/` 执行：

| 命令                   | 说明                                                  |
| ---------------------- | ----------------------------------------------------- |
| `npm ci`               | 按锁文件安装依赖，用于首次检出、CI 和可复现构建       |
| `npm install`          | 安装或更新依赖，并同步锁文件                          |
| `npm run dev`          | 启动开发服务器，默认端口为 `8000`，可通过 `PORT` 修改 |
| `npm run typecheck`    | 执行 TypeScript 项目类型检查                          |
| `npm run build`        | 先进行类型检查，再构建到 `dist/`                      |
| `npm run preview`      | 本地预览构建产物，需先执行构建                        |
| `npm run format`       | 使用 Biome 格式化文件                                 |
| `npm run format:check` | 检查格式，不修改文件                                  |
| `npm run lint`         | 使用 Biome 检查代码                                   |

在仓库根目录执行上述 npm 命令时，可使用 `npm --prefix EdgePanel ...`，例如 `npm --prefix EdgePanel run build`。

格式化与代码检查统一使用 Biome，配置位于 `biome.json`。依赖版本与覆盖规则以 `package.json` 为准，`overrides` 将 React、React DOM、Ant Design 和 Pro Components 的依赖树版本统一到直接依赖的版本声明。

## 目录约定

- `config/config.ts`：Umi Max 主配置，包括 hash 路由、开发代理、Utoopack 和插件开关。
- `config/routes.ts`：页面路由、重定向及认证守卫配置。
- `src/app.tsx`：应用初始化、ProLayout、全局请求拦截与 TanStack Query 配置。
- `src/pages/`：按网站、集群、节点、DNS、日志和系统设置等业务组织的页面。
- `src/components/`：共享组件，包含表单、看板和 AI Agent 界面。
- `src/services/`：API 服务封装，统一使用 `/api/...` 路径。
- `src/queries/`：TanStack Query hooks 与查询键。
- `src/runtime/`：认证、菜单、事件与应用运行时工具。
- `src/stores/`：Zustand 状态管理。
- `src/pb/`：由共享 protobuf 定义生成的类型。
- `tests/`：使用 Node.js 内置测试运行器执行的测试。
- `dist/`：构建产物。

## 数据层约定

- Umi `request` 是默认网络层；认证头与错误处理在 `src/app.tsx` 里统一配置。普通请求错误通过未处理的 `unhandledrejection` 作为全局兜底，调用方捕获后不会重复显示通用提示；401 始终清空 Token 并跳转登录页，`skipErrorHandler` 不能抑制这项认证处理。403 按普通业务错误处理，不再自动跳转登录。
- 列表页和壳层摘要数据优先使用 TanStack Query v5。
- 本地 UI 状态使用 Zustand；服务端状态通过 Query hooks 驱动。

## 验证

提交前在 `EdgePanel/` 执行：

```bash
npm run format
npm run format:check
npm run lint
node --test --experimental-strip-types tests/*.test.ts
npm run build
```

`npm run build` 已包含类型检查；只检查类型时可单独运行 `npm run typecheck`。
