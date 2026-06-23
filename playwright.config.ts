import * as path from 'node:path';

import * as dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

// Load this project's local .env BEFORE the TestRelic reporter reads process.env.
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Mirror staging credentials onto the names @testrelic/core reads last, so a
// staging key can coexist with a prod key in the same .env. (Same logic the
// monorepo's scripts/apply-testrelic-staging-env.mjs uses.)
const stageKey = (process.env.TESTRELIC_STAGE_API_KEY || '').trim();
if (stageKey) {
  process.env.TESTRELIC_API_KEY = stageKey;
  process.env.TESTRELIC_CLOUD_ENDPOINT =
    (process.env.TESTRELIC_STAGE_CLOUD_ENDPOINT || '').trim() ||
    'https://stage.testrelic.ai/api/v1';
}

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    // Emit a CTRF-compatible JSON file the CLI can summarize.
    ['playwright-ctrf-json-reporter', { outputDir: 'ctrf', outputFile: 'ctrf-report.json' }],
    // Upload the run to TestRelic cloud. The `cloud` block is what actually
    // ships results to the dashboard (project name comes from
    // .testrelic/testrelic-config.json -> testrelic-repo.name = "fde-assignment").
    ['@testrelic/playwright-analytics', {
      projectName: 'fde-assignment',
      outputPath: './test-results/analytics-timeline.json',
      includeStackTrace: true,
      includeCodeSnippets: true,
      metadata: { project: 'fde-assignment' },
      cloud: {
        apiKey: process.env.TESTRELIC_API_KEY,
        upload: 'both',
        uploadArtifacts: true,
        artifactMaxSizeMb: 10,
        timeout: 30_000,
      },
    }],
  ],
});
