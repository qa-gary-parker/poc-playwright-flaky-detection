import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'record.demo.ts',
  outputDir: '../test-results/demo',
  timeout: 180_000,
  workers: 1,
  reporter: 'list',
  use: { viewport: { width: 1920, height: 1080 } },
});
