import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/tools/discover-organization.ts",
    "src/tools/discover-ai-services.ts",
    "src/tools/assess-compliance.ts",
    "src/types/index.ts",
    "src/schemas/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Don't bundle dependencies - they'll be resolved at runtime
  noExternal: [],
  // Mark all node_modules as external to avoid bundling issues
  external: [
    "dotenv",
    "fs",
    "path",
    "url",
    "node:fs",
    "node:path",
    "node:url",
    "node:child_process",
    "node:stream",
    "@modelcontextprotocol/sdk",
    "@tavily/core",
    "zod",
    "ai",
    "@ai-sdk/openai",
    "openai",
  ],
  outDir: "dist",
});

