/**
 * Upload gating.
 *
 * The actual upload to TestRelic cloud is performed by the
 * @testrelic/playwright-analytics reporter wired in playwright.config.ts during
 * `npx playwright test` (the `cloud.upload` option). This helper surfaces
 * whether that upload is enabled, keyed off the same TESTRELIC_API_KEY env var
 * the reporter reads — so a missing key produces one clear, consistent warning.
 *
 * It is wrapped in try/catch and NEVER throws: an upload-status problem must not
 * block the local summary that was already printed.
 */
export function reportUploadStatus(projectName: string): void {
  try {
    const key = (process.env.TESTRELIC_API_KEY || '').trim();

    if (!key) {
      process.stderr.write(
        '\n⚠️  TESTRELIC_API_KEY not set — skipping upload to TestRelic cloud.\n' +
          `   Add it to your .env to upload results (project: ${projectName}).\n` +
          '   The summary above is unaffected.\n\n',
      );
      return;
    }

    process.stdout.write(
      `\n✅ TESTRELIC_API_KEY detected — results upload to TestRelic cloud via the\n` +
        `   @testrelic/playwright-analytics reporter (project: ${projectName}).\n` +
        `   Run "npx playwright test" to execute the suite and push the run.\n\n`,
    );
  } catch (err) {
    // Never let upload bookkeeping break the run.
    process.stderr.write(
      `\n⚠️  Upload status check failed (continuing anyway): ${(err as Error).message}\n\n`,
    );
  }
}
