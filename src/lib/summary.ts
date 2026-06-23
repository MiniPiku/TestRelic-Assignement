import { CtrfReport, CtrfTest } from './ctrf';

// Matches ANSI color escape sequences (ESC + "[2m" etc.) Playwright embeds in
// messages. Built from char code 27 to keep the source free of control chars.
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

/**
 * Turn a raw failure message into plain English: drop ANSI codes and stack
 * frames ("at ..."), collapse whitespace, and keep the first two sentences.
 */
export function plainEnglish(message?: string): string {
  if (!message || !message.trim()) {
    return 'No failure message was reported.';
  }

  const cleaned = message
    .replace(ANSI, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // strip stack frames and noise like "at Object.<anonymous> (file:12:5)"
    .filter((line) => !/^at\s/.test(line))
    .filter((line) => !/^Error:\s*$/i.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, 2).map((s) => s.trim()).join(' ').trim();
  }
  return cleaned.slice(0, 200);
}

/** Build the human-readable summary block printed to stdout. */
export function buildSummary(report: CtrfReport): string {
  const tests = report.results.tests;
  const passed = tests.filter((t) => t.status === 'passed');
  const failed = tests.filter((t) => t.status === 'failed');
  const skipped = tests.filter((t) => t.status === 'skipped');
  const flaky = passed.filter((t) => (t.retries ?? 0) > 0);

  const out: string[] = [];
  out.push('──────────────────────────────────────────────');
  out.push('  TestRelic — Test Run Summary');
  out.push('──────────────────────────────────────────────');
  out.push(`Total: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`);

  if (failed.length > 0) {
    out.push('');
    out.push('Failures:');
    for (const t of failed) {
      out.push(`  ✗ ${t.name}`);
      out.push(`    → ${plainEnglish(t.message)}`);
    }
  }

  if (flaky.length > 0) {
    out.push('');
    out.push('Flakiness signals:');
    for (const t of flaky) {
      const n = t.retries ?? 0;
      out.push(`  ⚠️ Flaky pass — ${t.name} (passed after ${n} retr${n === 1 ? 'y' : 'ies'})`);
    }
  }

  if (failed.length === 0 && flaky.length === 0) {
    out.push('');
    out.push('All tests passed cleanly — no failures or flakiness detected. ✅');
  }

  return out.join('\n');
}

export function hasFailures(report: CtrfReport): boolean {
  return report.results.tests.some((t: CtrfTest) => t.status === 'failed');
}
