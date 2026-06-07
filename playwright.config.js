import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        viewport: {
          width: 1280,
          height: 720
        }
      }
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5']
      }
    }
  ]
});
