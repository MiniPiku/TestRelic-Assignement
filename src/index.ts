#!/usr/bin/env node
import * as path from 'node:path';

import * as dotenv from 'dotenv';
import { Command } from 'commander';

import { loadCtrf } from './lib/ctrf';
import { buildSummary, hasFailures } from './lib/summary';
import { reportUploadStatus } from './lib/upload';

// Load .env so TESTRELIC_API_KEY is available when run standalone (the
// Playwright reporter loads it separately via playwright.config.ts).
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PROJECT_NAME = 'fde-assignment';

const program = new Command();

program
  .name('testrelic-summary')
  .description(
    'Summarize Playwright (CTRF) results in plain English and report TestRelic cloud upload status.',
  )
  .requiredOption('--results <path>', 'path to a CTRF-compatible results JSON file')
  .action((opts: { results: string }) => {
    let report;
    try {
      report = loadCtrf(opts.results);
    } catch (err) {
      // Bad input is a usage error (exit 2), distinct from "tests failed" (exit 1).
      process.stderr.write(`Error: ${(err as Error).message}\n`);
      process.exit(2);
      return;
    }

    // 1) Always print the local summary first — it must never be blocked.
    process.stdout.write(buildSummary(report) + '\n');

    // 2) Report whether results will upload to TestRelic cloud (never throws).
    reportUploadStatus(PROJECT_NAME);

    // 3) Exit 1 if any test failed, 0 if all passed.
    process.exit(hasFailures(report) ? 1 : 0);
  });

program.parse(process.argv);
