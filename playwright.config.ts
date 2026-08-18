import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";
import os from "node:os";
import { getBaseURL, getContextOptions, getEnvVariable } from "@utilities/env.utils";

const isCI = Boolean(
  (process.env.CI && process.env.CI !== "false") || process.env.JENKINS_URL || process.env.BUILD_NUMBER,
);
const skipLogin = getEnvVariable("skipGlobalLogin", "") === "true";

const config: PlaywrightTestConfig = {
  testDir: "./src/specs/",
  testIgnore: ["**/setup/**"],
  globalSetup: skipLogin ? undefined : require.resolve("./src/specs/setup/session.setup.spec.ts"),
  timeout: 450 * 1000,
  expect: { timeout: 60 * 1000 },
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list", { printSteps: true }],
    ["html", { open: "never" }],
    ["allure-playwright", {
      resultsDir: "allure-results",
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        OS: os.platform(),
        Architecture: os.arch(),
        NodeVersion: process.version,
        url: getBaseURL(),
        ENV_TYPE: getEnvVariable("ENV_TYPE", "local"),
      },
    }],
  ],
  use: {
    video: "retain-on-failure",
    actionTimeout: 45 * 1000,
    baseURL: getBaseURL(),
    ...getContextOptions(),
    headless: !!isCI,
    trace: "on",
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      args: ["--window-size=1920,1080", "--disable-resizable"],
    },
  },
  projects: [
    {
      name: "Chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...getContextOptions(),
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ["--window-size=1920,1080", "--disable-resizable"],
        },
      },
    },
  ],
  outputDir: "test-results/",
};

export default config;
