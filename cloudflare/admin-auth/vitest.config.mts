import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./cloudflare/admin-auth/wrangler.jsonc",
      },
    }),
  ],
  test: {
    include: ["cloudflare/admin-auth/test/**/*.test.ts"],
  },
});
