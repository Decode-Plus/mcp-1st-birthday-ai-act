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
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  outDir: "dist",
});

