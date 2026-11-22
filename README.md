# dlqq-mcp-client（会话感知 MCP 客户端 · DSH 插件）

DeepSeek Harness（DSH）Host 插件：把 MCP 服务器接入 DSH，并在每次 `tools/call`
时带上调用方的会话 ID（`params._meta[<sessionMetaKey>]`），使**单个 MCP 服务进程
可以按对话隔离工作区**。

> 英文版：[README.en.md](README.en.md)

## 解决的痛点

官方 `@deepseek-ai/dsh-mcp-client` 每个插件条目只建一条连接，请求里也不带会话信息，
于是所有对话共用一个 MCP 实例、一个全局工作区。本插件与官方行为一致，只增加
`_meta` 注入这一步，服务端据此区分会话。

## 实现方式

以官方 `@deepseek-ai/dsh-mcp-client`（MIT）源码为基础 fork，只改三处：

| 文件 | 改动 |
|---|---|
| `lib/official/tools.ts` | 新增 `sessionMetaOf()`；`callTool` 参数加入 `_meta`（会话键 + Agent 键） |
| `lib/official/connection.ts` | 把 `config.sessionMetaKey` / `config.agentMetaKey` 传入工具桥接 |
| `lib/official/index.ts` | 配置增加 `sessionMetaKey`（默认 `dsh/sessionId`）与 `agentMetaKey`（默认 `dsh/agentId`） |

其余（连接、重连、诊断、凭据清洗、工具注册、结果投影）与官方完全一致。

## 当前状态

| 项 | 状态 |
|---|---|
| 插件实现 | ✅ 已完成（Host 侧，尚未安装实测） |
| 构建产物 | ✅ `dist/plugin.js`（46.7 KB） |
| Java 服务端会话隔离 | ❌ 尚未实现（另一仓库 `dlqq-mcp-server-java-server`） |

> 服务端未实现前，插件能正常注入 `_meta`，但服务端会忽略它（行为等同官方客户端）。

## 目录结构

```
index.js              # 入口：re-export dist/plugin.js
dist/plugin.js        # 构建产物（由 npm run build 生成，需提交）
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

产物 `dist/plugin.js` 需要一并提交（本地目录/Git 安装都直接使用它）。

## 安装与启用

1. **安装**：DSH 中 **Plugins > Add plugin** 选择本目录绝对路径（或 `plugin_manager`
   的 `install_bundle`，`target` 为本目录）；
2. **配置**：打开 **Plugins > dlqq-mcp-client > 配置**，填入自己的 `command` / `args`
   （指向本机 `java` 与 `dlqq_mcp_server.jar`），必要时修改 `serverName`；
3. **启用**：插件包默认 `disabled: true`（不写死任何部署路径），配置完成后打开启用开关；
4. **重启 DSH** 使插件生效。

`cordis.patch.yml` 只提供占位符，**不需要也不应该在仓库里改成本机路径**；DSH 会把界面里
填写的配置保存到你的 profile。

`command` 可以直接写 `java`（要求 PATH 上有 Java 25+），也可以用绝对路径指向随包 JDK：

```yaml
# 写法一：PATH 上的 java
command: 'java'
args: ['-Dfile.encoding=UTF-8', '-jar', 'dlqq_mcp_server.jar']
cwd: '<jar 所在目录>'

# 写法二：随包 JDK 绝对路径
command: '<deploy-dir>/java/bin/java.exe'
args: ['-Dfile.encoding=UTF-8', '-jar', '<deploy-dir>/dlqq_mcp_server.jar']
```

## 配置

| 字段 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `serverName` | 是 | — | 客户端标识，同时作为工具名前缀 |
| `transport` | 否 | `stdio` | `stdio` / `streamable-http` |
| `command` `args` | stdio | — | 启动 MCP 服务的命令 |
| `env` `cwd` | 否 | `{}` / 继承 | stdio 环境与工作目录 |
| `url` `headers` | http | — | MCP 端点与附加请求头 |
| `toolCallTimeoutMs` | 否 | `60000` | 单次工具调用超时 |
| `startupTimeoutMs` | 否 | `30000` | 启动与 initialize 超时 |
| `closeTimeoutMs` | 否 | `5000` | 关闭传输超时 |
| `sessionMetaKey` | 否 | `dsh/sessionId` | 会话 ID 的 `_meta` 键名；置空则不发送 |
| `agentMetaKey` | 否 | `dsh/agentId` | Agent ID 的 `_meta` 键名；置空则不发送 |
| `workspaceMetaKey` | 否 | `dsh/workspace` | 会话工作目录（cwd）的 `_meta` 键名；置空则不发送 |
| `maxInstructionBytes` | 否 | `32768` | 服务器指令最大字节数 |
| `reconnect` | 否 | 启用 | 重连策略（`enabled`/`initialDelayMs`/`maxDelayMs`/`maxAttempts`） |

## 与服务端的约定

- `_meta` 键名两端必须一致（默认 `dsh/sessionId`、`dsh/agentId`、`dsh/workspace`）；
- 服务端按「会话 × Agent」维护工作区；三个键都不提供时回退到进程级默认会话
  （兼容不支持多会话的客户端）；
- `dsh/workspace` 取当前会话的 cwd（`session.header.cwd`，绝对路径，可能为空）：
  服务端在该会话**首次收到请求**时用它初始化会话工作区（不存在/非法/位于 `.dlqq` 下则
  静默回退到默认工作区）；会话创建时没有 cwd 时也可由宿主后续补齐；
- 会话绑定完全由 `_meta` 驱动，无需额外初始化调用。

## 许可证

MIT，见 [LICENSE](LICENSE)。`lib/official/` 来自官方 `@deepseek-ai/dsh-mcp-client`
（MIT，Copyright (c) 2026 DeepSeek），原样保留其版权与许可声明。
