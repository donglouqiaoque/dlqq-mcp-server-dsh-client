/**
 * dlqq-mcp-client
 *
 * DeepSeek Harness plugin: a fork of the official @deepseek-ai/dsh-mcp-client
 * that also sends the calling session id as `params._meta[sessionMetaKey]`.
 *
 * The implementation lives in lib/official (ported from the upstream package,
 * MIT) and is bundled into dist/plugin.js by `pnpm build`. This entry only
 * re-exports the bundle so the package root stays the plugin root.
 */

export * from './dist/plugin.js'
