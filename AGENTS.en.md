# AGENTS.md — dlqq-mcp-client conventions

> Read by AI assistants. Chinese version: [AGENTS.md](AGENTS.md).
> Plugin description: [README.en.md](README.en.md); the source is the authority on status.

## 1. What this project is

- A **DSH Host plugin** (Cordis bundle) written in JavaScript with a few TypeScript sources.
- It bridges an MCP server into DSH and injects the calling session id into
  `params._meta` of every `tools/call`.
- It is a fork of the official `@deepseek-ai/dsh-mcp-client` (MIT) with only the
  `_meta` injection added; the sources live in `lib/official/`.
- The companion server is a **separate repository**
  (`dlqq-mcp-server-java-server`); this repository contains no server code.
- The agreed `_meta` key defaults to `dsh/sessionId`; changing it requires updating
  both repositories' docs.

## 2. Hard rules

1. **Entry and build**: `index.js` only re-exports `dist/plugin.js`; the bundle is
   produced by `npm run build` (esbuild) and **must be committed**.
2. **Module format**: keep `"type": "module"`; the bundle is ESM.
3. **Keep host packages external**: esbuild uses
   `--external:@deepseek-ai/* --external:@modelcontextprotocol/*`; those packages
   come from DSH or the npm dependencies.
4. **Never write the DSH profile**: do not hand-edit `~/.dsh` files and do not run
   pnpm inside the profile directory. Install through `plugin_manager`
   `install_bundle` or **Plugins > Add plugin**.
5. **Self-check after edits**: `npm run build` succeeds, `node --check
   dist/plugin.js` passes, `package.json` is valid JSON.
6. **Keep docs bilingual**: `README.md` changes require `README.en.md`, and vice
   versa; same for `AGENTS.md` and `AGENTS.en.md`.
7. **File and command operations go through MCP tools**: use `dlqq_*` file tools and
   `dlqq_run_command`; call `dlqq_workspace_set` on this repository first.
8. **No scripted bulk edits**: never rewrite source with PowerShell / Python / sed.
9. **No git commands**: version control belongs to the user.
10. **No machine-specific paths**: use placeholders such as `<deploy-dir>`.
11. **Dependency license review**: prefer MIT; verify any other license permits
    redistribution and tell the user before adding it.
12. **Never overstate status**: document only verified behavior and mark unverified
    capabilities explicitly.

## 3. Layout

```
index.js              # re-exports dist/plugin.js
dist/plugin.js        # build output (committed)
lib/official/         # forked upstream sources (13 .ts files + LICENSE)
  ├── index.ts        #   plugin entry: apply / Config
  ├── connection.ts   #   connection, reconnect, sync scheduling
  ├── tools.ts        #   tool bridge (the _meta injection lives here)
  └── ...             #   credentials / diagnostic / generation / probe / status / transport / types
cordis.patch.yml      # plugin row; deployment paths stay as placeholders
locale/zh.json        # meta.title / meta.description / meta.detail
locale/en.json
docs/DETAIL.md        # plugin detail page
icon.png              # plugin icon (<= 256 KiB)
```

## 4. Build and verify

```cmd
npm install
npm run build
node --check dist/plugin.js
```

1. Install from the local directory, restart DSH, confirm the plugin row and icon in
   **Plugins**;
2. Verify isolation with two sessions bound to different workspaces;
3. Replacing an installed package requires a DSH restart to load the new module.

## 5. Relationship to upstream

- Upstream: `@deepseek-ai/dsh-mcp-client` `0.2.2-rc.5` (matches the local DSH);
- After a DSH upgrade, diff `lib/official/` against upstream and merge;
- Upstream is MIT (Copyright (c) 2026 DeepSeek); keep `lib/official/LICENSE`.

## 6. License

MIT (see LICENSE). `lib/official/` is derived upstream code; keep its copyright and
license notice.

## 7. References

- DSH repository: <https://github.com/deepseek-ai/deepseek-harness>
- Official MCP client: `packages/mcp/mcp-client`
- Local DSH documentation skill: `dsh-doc`
