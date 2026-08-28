import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "1440x900", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "1366x768", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "1280x720", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "1024x700", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 700 } } },
  ],
  // Assumes `python3 -m uvicorn api.main:app --port 8000` is already running
  // (make app) - not started by this config, since it depends on the real
  // Python backend + built frontend, not something Playwright should own.
});
