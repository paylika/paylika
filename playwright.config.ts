import { defineConfig, devices } from "@playwright/test";

/**
 * Test e2e (bout-en-bout) sur l'app web réelle DÉPLOYÉE (build de prod, rapide
 * et stable). On peut viser le dev local avec :
 *   E2E_BASE_URL=http://localhost:8081 npm run test:e2e
 * (le serveur de dev est lent : bundle non minifié + HMR).
 */
const baseURL = process.env.E2E_BASE_URL || "https://paylika.paylika-app.workers.dev";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    headless: true,
    ignoreHTTPSErrors: true,
    navigationTimeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
