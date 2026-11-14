import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 1,
  workers: 4,
  reporter: [
    ['dot'],
    ['json', { outputFile: 'out/report.json' }],
    ['playwright-smart-reporter', {
      outputFile: 'out/smart-report.html',
      historyFile: 'out/test-history.json',
      maxHistoryRuns: 10,
      exportJson: true,
      quarantine: { enabled: true, outputFile: 'quarantine.json', threshold: 0.3 },
    }],
  ],
});
