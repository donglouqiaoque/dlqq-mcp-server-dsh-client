# AGENTS.md — dlqq-mcp-client 工程约定

> 本文给 AI 助手阅读。英文版：[AGENTS.en.md](AGENTS.en.md)。
> 插件说明见 [README.md](README.md)，实现现状以源码为准。

## 一、工程定位

- **DSH Host 插件**（Cordis bundle），JavaScript + 少量 TypeScript 源码。
- 职责：把 MCP 服务器接入 DSH，并在每次 `tools/call` 的 `params._meta` 注入调用方会话 ID。
- 实现方式：fork 官方 `@deepseek-ai/dsh-mcp-client`（MIT），只改 `_meta` 注入；源码在 `lib/official/`。
- 配套服务端是**另一个仓库**（`dlqq-mcp-server-java-server`），本仓库不含服务端代码。
- 两端协定的 `_meta` 键名默认 `dsh/sessionId`；改动必须同步两仓库文档。

## 二、硬性规则

1. **入口与构建**：`index.js` 只 re-export `dist/plugin.js`；`dist/plugin.js` 由 `npm run build`（esbuild）生成，**必须提交**。
2. **模块格式**：`package.json` 保持 `"type": "module"`，产物为 ESM。
3. **外部依赖不打包**：esbuild 用 `--external:@deepseek-ai/* --external:@modelcontextprotocol/*`；这些包由 DSH 或 npm 依赖提供。
4. **不写 DSH profile**：不得手改 `~/.dsh` 下的配置，不得在 profile 目录执行 pnpm；安装走 `plugin_manager` 的 `install_bundle` 或界面 **Plugins > Add plugin**。
5. **改完自检**：`npm run build` 成功；`node --check dist/plugin.js` 通过；`package.json` 是合法 JSON。
6. **文档中英同步**：改 `README.md` 需同步 `README.en.md`；`AGENTS.md` 与 `AGENTS.en.md` 同理。
7. **文件与命令操作走 MCP 工具**：读写用 `dlqq_*` 文件工具，执行用 `dlqq_run_command`；先 `dlqq_workspace_set` 到本仓库。
8. **禁止脚本批量改代码**：不得用 PowerShell / Python / sed 对源码批量替换。
9. **禁止执行 git 命令**：版本管理由用户操作。
10. **禁止硬编码本机路径**：示例用 `<deploy-dir>` 等占位符。
11. **依赖许可证审查**：优先 MIT；非 MIT 需联网确认可分发并向用户说明。
12. **不夸大实现状态**：文档只描述已验证行为；未验证的能力明确标注。

## 三、目录结构

```
index.js              # re-export dist/plugin.js
dist/plugin.js        # 构建产物（提交）
lib/official/         # 官方源码 fork（13 个 .ts + LICENSE）
  ├── index.ts        #   插件入口 apply / Config
  ├── connection.ts   #   连接、重连、工具同步调度
  ├── tools.ts        #   工具桥接（_meta 注入在此）
  └── ...             #   credentials / diagnostic / generation / probe / status / transport / types
cordis.patch.yml      # 插件行声明（部署路径用占位符）
locale/zh.json        # meta.title / meta.description / meta.detail
locale/en.json
docs/DETAIL.md        # 插件详情页
icon.png              # 插件图标（≤256 KiB）
```

## 四、构建与验证

```cmd
npm install
npm run build
node --check dist/plugin.js
```

1. 本地目录安装 → 重启 DSH → 在 **Plugins** 中确认插件条目与图标；
2. 两个会话分别设置不同工作区，交叉读写验证隔离；
3. 替换已安装包后必须重启 DSH 才加载新模块。

## 五、与上游的关系

- 上游版本：`@deepseek-ai/dsh-mcp-client` `0.2.2-rc.5`（与本机 DSH 一致）；
- 升级 DSH 后需重新对照上游，合并 `lib/official/` 的差异；
- 上游许可是 MIT（Copyright (c) 2026 DeepSeek），保留 `lib/official/LICENSE`。

## 六、许可证

MIT（见 LICENSE）。`lib/official/` 为上游派生代码，保留其版权与许可声明。

## 七、参考资料

- DSH 官方仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 官方 MCP 客户端：`packages/mcp/mcp-client`
- 本机 DSH 文档技能：`dsh-doc`
