# dlqq-mcp-client (session-aware MCP client, DSH plugin)

A DeepSeek Harness (DSH) Host plugin that bridges an MCP server into DSH and adds
the calling session's id to every `tools/call` request
(`params._meta[<sessionMetaKey>]`), so **one MCP server process can isolate a
workspace per conversation**.

> Chinese version: [README.md](README.md)

## Why it exists

The official `@deepseek-ai/dsh-mcp-client` opens one connection per plugin row and
sends no session information, so every conversation shares one MCP instance and
one global workspace. This plugin behaves the same way but injects `_meta`; the
server routes each call by session.

## How it is implemented

A fork of the official `@deepseek-ai/dsh-mcp-client` (MIT) with only three edits:

| File | Change |
|---|---|
| `lib/official/tools.ts` | Added `sessionMetaOf()`; `callTool` params now carry `_meta` (session key + agent key) |
| `lib/official/connection.ts` | Passes `config.sessionMetaKey` / `config.agentMetaKey` into the tool bridge |
| `lib/official/index.ts` | Config gains `sessionMetaKey` (default `dsh/sessionId`) and `agentMetaKey` (default `dsh/agentId`) |

Everything else (connection, reconnect, diagnostics, credential scrubbing, tool
registration, result projection) is unchanged from upstream.

## Status

| Item | Status |
|---|---|
| Plugin implementation | ✅ Done (host side, not yet installed/tested) |
| Build output | ✅ `dist/plugin.js` (46.7 KB) |
| Java server session isolation | ❌ Not implemented (separate repo `dlqq-mcp-server-java-server`) |

> Until the server supports it, the plugin still injects `_meta` and the server
> ignores it (behavior equals the official client).

## Layout

```
index.js              # entry: re-exports dist/plugin.js
dist/plugin.js        # build output (npm run build; must be committed)
lib/official/*.ts     # forked upstream sources (13 files + LICENSE)
cordis.patch.yml      # plugin row inserted into the DSH composition
locale/               # plugin list metadata (zh / en)
docs/DETAIL.md        # plugin detail page
icon.png              # plugin icon
```

## Build

```cmd
npm install
npm run build
```

Commit `dist/plugin.js`; local-directory and Git installs use it directly.

## Install and enable

1. **Install**: in DSH open **Plugins > Add plugin** and pick this directory (or use
   `plugin_manager` `install_bundle` with `target` set to this directory);
2. **Configure**: open **Plugins > dlqq-mcp-client > Configure** and fill in your own
   `command` / `args` (pointing at your local `java` and `dlqq_mcp_server.jar`), and
   adjust `serverName` if needed;
3. **Enable**: the bundle ships with `disabled: true` (no deployment paths are
   hard-coded), so turn the row on after configuring it;
4. **Restart DSH** to activate the plugin.

`cordis.patch.yml` only carries placeholders; **do not edit it to local paths**. DSH
stores the values you enter in the row configuration inside your profile.

`command` may be plain `java` (requires Java 25+ on `PATH`) or an absolute path to a
bundled JDK:

```yaml
# Variant 1: java from PATH
command: 'java'
args: ['-Dfile.encoding=UTF-8', '-jar', 'dlqq_mcp_server.jar']
cwd: '<directory containing the jar>'

# Variant 2: absolute path to a bundled JDK
command: '<deploy-dir>/java/bin/java.exe'
args: ['-Dfile.encoding=UTF-8', '-jar', '<deploy-dir>/dlqq_mcp_server.jar']
```

## Configuration

| Field | Required | Default | Purpose |
|---|---|---|---|
| `serverName` | yes | — | Client identifier; also the tool-name prefix |
| `transport` | no | `stdio` | `stdio` or `streamable-http` |
| `command` `args` | stdio | — | Command that starts the MCP server |
| `env` `cwd` | no | `{}` / inherited | stdio environment and working directory |
| `url` `headers` | http | — | MCP endpoint and extra request headers |
| `toolCallTimeoutMs` | no | `60000` | Per tool-call timeout |
| `startupTimeoutMs` | no | `30000` | Startup and initialize timeout |
| `closeTimeoutMs` | no | `5000` | Transport close timeout |
| `sessionMetaKey` | no | `dsh/sessionId` | `_meta` key for the session id; empty disables it |
| `agentMetaKey` | no | `dsh/agentId` | `_meta` key for the agent id; empty disables it |
| `maxInstructionBytes` | no | `32768` | Maximum server instruction bytes |
| `reconnect` | no | enabled | Reconnect policy (`enabled`/`initialDelayMs`/`maxDelayMs`/`maxAttempts`) |

## Contract with the server

- Both sides must agree on the `_meta` keys (defaults `dsh/sessionId` and `dsh/agentId`);
- The server keeps one workspace per conversation × agent; when neither key is present it
  falls back to the process-level default session (clients without multi-session support);
- Session binding is driven entirely by `_meta`; no extra initialization call is
  required.

## License

MIT, see [LICENSE](LICENSE). `lib/official/` is derived from the official
`@deepseek-ai/dsh-mcp-client` (MIT, Copyright (c) 2026 DeepSeek); its copyright
and license notice are kept intact.
