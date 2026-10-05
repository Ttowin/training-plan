import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  reporter: [["list"]],
  use: {
    ...base.use,
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.e2e\.ts$/,
      use: { ...devices["Desktop Chrome"], video: "on" },
    },
  ],
});
