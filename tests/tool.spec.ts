import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '..');
// Relative path (no spaces) — ROOT itself may contain spaces, and we spawn the
// CLI with shell:true, which would re-split an absolute path on those spaces.
const fixture = (name: string) => path.posix.join('tests', 'fixtures', name);

interface CliResult {
  stdout: string;
  stderr: string;
  combined: string;
  status: number | null;
}

/**
 * Run the CLI exactly as a developer would: `npx ts-node src/index.ts ...`.
 * `env` overrides are merged over process.env; pass an empty string to unset.
 */
function runCli(resultsPath: string, env: Record<string, string> = {}): CliResult {
  const res = spawnSync(
    'npx',
    ['ts-node', 'src/index.ts', '--results', resultsPath],
    { cwd: ROOT, encoding: 'utf8', shell: true, env: { ...process.env, ...env } },
  );
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  return { stdout, stderr, combined: stdout + stderr, status: res.status };
}

test('summary output — all pass reports the passed count', () => {
  const { stdout, status } = runCli(fixture('all-pass.json'));
  expect(stdout).toContain('3 passed');
  expect(status).toBe(0);
});

test('summary output — failure shows the test name and a plain-English reason', () => {
  const { stdout } = runCli(fixture('with-failure.json'), { TESTRELIC_API_KEY: 'tr_test_dummy' });
  // The failing test's name is surfaced...
  expect(stdout).toContain('renders the run count badge');
  // ...with a readable reason parsed from the message...
  expect(stdout).toContain('Expected the run count badge to show 5 but it showed 0.');
  // ...and NOT the raw stack frames.
  expect(stdout).not.toContain('at Object.<anonymous>');
  expect(stdout).not.toContain('processTicksAndRejections');
});

test('flakiness detection — a retried passing test is flagged as a Flaky pass', () => {
  const { stdout } = runCli(fixture('flaky.json'));
  expect(stdout).toContain('Flaky pass');
  expect(stdout).toContain('syncs results from the analytics API');
});

test('missing API key warning — clearly states the key is not set', () => {
  // Unset the key for this invocation only.
  const { combined } = runCli(fixture('all-pass.json'), { TESTRELIC_API_KEY: '' });
  expect(combined).toContain('TESTRELIC_API_KEY not set');
});

test('exit code — process exits with 1 when a test failed', () => {
  const { status } = runCli(fixture('with-failure.json'), { TESTRELIC_API_KEY: 'tr_test_dummy' });
  expect(status).toBe(1);
});

test('Dashboard shows zero results when API key is invalid', () => {
  // INTENTIONAL FAILURE — demonstrates how a real failure surfaces in the
  // summary and in the TestRelic dashboard. This is expected to fail.
  expect(1).toBe(2);
});
