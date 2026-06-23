import { readFileSync } from 'node:fs';

export type CtrfStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'other';

export interface CtrfTest {
  name: string;
  status: CtrfStatus;
  duration?: number;
  message?: string;
  trace?: string;
  retries?: number;
}

export interface CtrfReport {
  results: {
    tool?: { name?: string };
    summary?: Record<string, number>;
    tests: CtrfTest[];
  };
}

/** Read and validate a CTRF-compatible results file. Throws a readable error. */
export function loadCtrf(filePath: string): CtrfReport {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Could not read results file "${filePath}": ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Results file "${filePath}" is not valid JSON: ${(err as Error).message}`);
  }

  const tests = (parsed as CtrfReport)?.results?.tests;
  if (!Array.isArray(tests)) {
    throw new Error(
      `Results file "${filePath}" is not CTRF-compatible (expected a "results.tests" array).`,
    );
  }
  return parsed as CtrfReport;
}
