# dlqq-mcp-client

一个 DeepSeek Harness（DSH）Host 插件：把 MCP 服务器接入 DSH 工具，并在每次
`tools/call` 时携带调用方的会话 ID（`params._meta[<sessionMetaKey>]`），
让同一个 MCP 服务进程可以按对话隔离工作区。

## 为什么需要它

DSH 官方 `@deepseek-ai/dsh-mcp-client` 每个插件条目只建立一条连接，且不会把
会话信息放进 MCP 请求。因此所有对话共用一个 MCP 实例（以及实例内的全局工作区）。

本插件与官方客户端行为一致，只多一步：把调用方会话 ID 合并进请求的
`params._meta`。配套的 MCP 服务端读取该字段后即可按会话维护独立工作区。

## 工作原理

```
DSH 工具调用
  └── 插件 call 处理器（接收 execution）
        ├── 读取 execution.agent.session.id（会话）、execution.agent.id（Agent）、
        │         execution.agent.session.header.cwd（会话工作目录，可能为空）
        ├── 组装 params._meta：sessionMetaKey=会话ID、agentMetaKey=AgentID、
        │         workspaceMetaKey=会话 cwd（绝对路径）
        └── client.callTool({ name, arguments, _meta })
              └── MCP 服务端：按「会话 × Agent」路由；会话首次请求时用 cwd 初始化该会话工作区
```

服务端未收到任何 `_meta` 标识时回退到进程级默认会话（兼容不支持多会话的客户端）。
`dsh/workspace` 只用于初始化会话工作区：路径不存在/非法/位于 `.dlqq` 下时服务端静默回退。

## 实现方式

基于官方 `@deepseek-ai/dsh-mcp-client`（MIT）源码 fork，只改三处：

| 文件 | 改动 |
|---|---|
| `lib/official/tools.ts` | 新增 `sessionMetaOf()`；`callTool` 参数加入 `_meta`（会话键 + Agent 键 + 会话工作区键） |
| `lib/official/connection.ts` | 把 `config.sessionMetaKey` / `config.agentMetaKey` / `config.workspaceMetaKey` 传入工具桥接 |
| `lib/official/index.ts` | 配置增加 `sessionMetaKey`（默认 `dsh/sessionId`）、`agentMetaKey`（默认 `dsh/agentId`）、`workspaceMetaKey`（默认 `dsh/workspace`） |

## 当前状态

| 项 | 状态 |
|---|---|
| 插件实现 | ✅ 已完成（Host 侧） |
| 构建产物 | ✅ `dist/plugin.js` |
| 安装实测 | ❌ 尚未在 DSH 中安装验证 |
| Java 服务端会话隔离 | ❌ 尚未实现（另一仓库） |

> 服务端未实现前，插件会正常注入 `_meta`，但服务端忽略它，行为等同官方客户端。

## 目录结构

```
index.js              # 入口：re-export dist/plugin.js
dist/plugin.js        # 构建产物（npm run build 生成，需提交）
lib/official/*.ts     # 官方源码 fork（13 个文件 + LICENSE）
cordis.patch.yml      # 插入 DSH 组合的插件行
locale/               # 插件列表显示文案（zh / en）
docs/DETAIL.md        # 插件详情页
icon.png              # 插件图标
```

## 构建

```cmd
npm install
npm run build
```

## 安装与启用

1. **安装**：在 DSH 中打开 **Plugins > Add plugin**，选择本目录的绝对路径；
   或由 Host 工具执行 `plugin_manager` 的 `install_bundle`，`target` 为本目录；
2. **配置**：打开 **Plugins > dlqq-mcp-client > 配置**，填入自己的 `command` / `args`；
3. **启用**：插件默认 `disabled: true`，配置好后再打开启用开关；
4. **重启 DSH** 使插件生效。

`cordis.patch.yml` 只提供占位符，不要写死本机路径；界面配置会保存到用户的 profile。

## 配置字段

| 字段 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `serverName` | 是 | — | 客户端标识，同时作为工具名前缀 |
| `transport` | 否 | `stdio` | `stdio` 或 `streamable-http` |
| `command` / `args` | stdio 时必填 | — | 启动 MCP 服务的命令 |
| `env` / `cwd` | 否 | `{}` / 继承 | stdio 环境变量与工作目录 |
| `url` / `headers` | http 时必填 | — | MCP 端点与附加请求头 |
| `toolCallTimeoutMs` | 否 | `60000` | 单次工具调用超时 |
| `startupTimeoutMs` | 否 | `30000` | 启动与 initialize 超时 |
| `closeTimeoutMs` | 否 | `5000` | 关闭传输超时 |
| `sessionMetaKey` | 否 | `dsh/sessionId` | 携带会话 ID 的 `_meta` 键名；置空则不发送 |
| `agentMetaKey` | 否 | `dsh/agentId` | 携带 Agent ID 的 `_meta` 键名；置空则不发送 |
| `workspaceMetaKey` | 否 | `dsh/workspace` | 携带会话工作目录（`session.header.cwd`）的 `_meta` 键名；置空则不发送 |
| `maxInstructionBytes` | 否 | `32768` | 服务器指令最大字节数 |
| `reconnect` | 否 | 启用 | 重连策略 |

## 与 MCP 服务端的约定

- `_meta` 键名必须与服务端一致（默认 `dsh/sessionId`、`dsh/agentId`、`dsh/workspace`）；
- 服务端按「会话 × Agent」维护工作区，三个键都不存在时回退到进程级默认会话；
- `dsh/workspace` 用于会话工作区初始化：会话第一次请求时由服务端校验并应用，
  路径不存在/非法/位于 `.dlqq` 下时静默回退到默认工作区；
- 服务端初始化后不要求客户端再做额外调用，会话绑定完全由 `_meta` 驱动。

## 许可证

MIT。`lib/official/` 来自官方 `@deepseek-ai/dsh-mcp-client`
（MIT，Copyright (c) 2026 DeepSeek），原样保留其版权与许可声明。
