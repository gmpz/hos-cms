import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL, browserName: "chromium", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: `${baseURL}/news`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
