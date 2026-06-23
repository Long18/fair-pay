// Setup file for agent-api tests.
// Resolves Deno ESM URL imports to local node_modules equivalents.
// The domain modules (money, split, duplicate, preview-hash) are pure TS
// with no external deps — they load without any special handling.
// Only contracts.ts imports zod via https://esm.sh/zod which needs aliasing.
