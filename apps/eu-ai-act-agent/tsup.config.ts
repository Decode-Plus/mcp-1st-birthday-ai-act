import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  dts: false, // Disable dts generation to avoid module resolution issues
  sourcemap: true,
  clean: true,
  minify: false,
  external: ["express", "dotenv"],
  noExternal: [], // Bundle everything except external
  bundle: true,
});

