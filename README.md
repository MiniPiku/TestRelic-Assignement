# TestRelic FDE Assignment — Playwright Results Summarizer

A small CLI that makes a Playwright suite's results legible to a 12-person team
that runs tests in CI but never reads the output. It:

1. **Runs** the Playwright suite (`npx playwright test`).
2. **Uploads** every run to **TestRelic cloud** via the
   [`@testrelic/playwright-analytics`](https://www.npmjs.com/package/@testrelic/playwright-analytics)
   reporter wired in [`playwright.config.ts`](playwright.config.ts).
3. **Summarizes** results in plain English on stdout — failure reasons (stack
   frames stripped) and flakiness signals — via a `ts-node` CLI.

---

## 🎥 Demo

[Watch the 3-minute walkthrough on Loom](https://www.loom.com/share/d185f31e95bd4e329da3c43dc5726dc2)

---

## 📦 Deliverables

| Deliverable | Location |
|---|---|
| Problem Decomposition | [`docs/problem.md`](docs/problem.md) |
| Working Tool (source + README) | [`src/`](src/) · [`playwright.config.ts`](playwright.config.ts) |
| Playwright Test Suite (6 tests, 1 intentional failure) | [`tests/tool.spec.ts`](tests/tool.spec.ts) |
| TestRelic Dashboard Screenshot | [`docs/TestRelic Dashboard Screenshots/Real ingested test results.png`](docs/TestRelic%20Dashboard%20Screenshots/Real%20ingested%20test%20results.png) |
| MCP Query Screenshots | [`docs/MCP Query Screenshots/NL prompt.png`](docs/MCP%20Query%20Screenshots/NL%20prompt.png) · [`docs/MCP Query Screenshots/AI insight response.png`](docs/MCP%20Query%20Screenshots/AI%20insight%20response.png) |
| Scale Brief | [`docs/scale.md`](docs/scale.md) |
| GitHub Actions CI Run | [View passing workflow run ↗](https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28049526326/job/83036972762) |
| Demo Video | [Loom ↗](https://www.loom.com/share/d185f31e95bd4e329da3c43dc5726dc2) |

---

## Prerequisites

- **Node 18+** (developed on Node 22) and **npm**
- A **TestRelic API key** (for cloud upload — the summary works without one)

## Setup (3 commands, < 15 min from a clean clone)

```bash
npm install
cp .env.example .env     # then edit .env and set TESTRELIC_API_KEY
npx playwright test
```

> No browser download is needed — the suite runs in pure Node (it shells out to
> the CLI against local fixtures), so you can skip `npx playwright install`.

The suite contains **6 tests, 1 of which fails on purpose**
(`Dashboard shows zero results when API key is invalid`) to demonstrate how a
real failure surfaces in the summary and in the TestRelic dashboard. So
`npx playwright test` is expected to end with **1 failed** — that is success.

Running the suite produces:

- `ctrf/ctrf-report.json` — CTRF results the CLI can summarize
- `test-results/analytics-timeline.json` — the TestRelic analytics timeline
- An upload to TestRelic cloud under the project **`fde-assignment`** (when
  `TESTRELIC_API_KEY` is set)

## Run the CLI manually

```bash
# Summarize any CTRF-compatible JSON file:
npx ts-node src/index.ts --results ctrf/ctrf-report.json

# Or try the bundled fixtures:
npx ts-node src/index.ts --results tests/fixtures/all-pass.json
npx ts-node src/index.ts --results tests/fixtures/with-failure.json
npx ts-node src/index.ts --results tests/fixtures/flaky.json
```

- Exit code **1** if any test failed, **0** if all passed (**2** for a bad/missing file).
- If `TESTRELIC_API_KEY` is not set, the CLI prints a clear warning and skips
  upload — it never crashes.

## Sample output

```
──────────────────────────────────────────────
  TestRelic — Test Run Summary
──────────────────────────────────────────────
Total: 1 passed, 1 failed, 1 skipped

Failures:
  ✗ renders the run count badge
    → Expected the run count badge to show 5 but it showed 0. The dashboard rendered before the analytics API responded.

✅ TESTRELIC_API_KEY detected — results upload to TestRelic cloud via the
   @testrelic/playwright-analytics reporter (project: fde-assignment).
```

Flaky example (`tests/fixtures/flaky.json`):

```
Flakiness signals:
  ⚠️ Flaky pass — syncs results from the analytics API (passed after 2 retries)
```

Missing key:

```
⚠️  TESTRELIC_API_KEY not set — skipping upload to TestRelic cloud.
   Add it to your .env to upload results (project: fde-assignment).
```

## How the cloud upload works

The upload is driven by the reporter in [`playwright.config.ts`](playwright.config.ts).
We use the SDK's `cloud` options (rather than the bare `{ apiKey, projectName }`
form) because that is what actually ships results to the dashboard:

```ts
['@testrelic/playwright-analytics', {
  projectName: 'fde-assignment',
  cloud: {
    apiKey: process.env.TESTRELIC_API_KEY,
    upload: 'both',          // local file + cloud
    uploadArtifacts: true,
  },
}]
```

The project name shown in the dashboard comes from
[`.testrelic/testrelic-config.json`](.testrelic/testrelic-config.json)
(`testrelic-repo.name = "fde-assignment"`). The endpoint defaults to production;
set `TESTRELIC_CLOUD_ENDPOINT` (or the `TESTRELIC_STAGE_*` vars) to override.

## Project layout

```
.
├── README.md
├── src/
│   ├── index.ts            # CLI entry point (commander) — orchestration only
│   └── lib/
│       ├── ctrf.ts         # read + validate CTRF JSON
│       ├── summary.ts      # plain-English formatting + flakiness detection
│       └── upload.ts       # API-key gating / upload status (never throws)
├── playwright.config.ts    # reporters: list + CTRF + TestRelic cloud upload
├── tests/
│   ├── tool.spec.ts        # 6 tests (1 intentional failure)
│   ├── fixtures/           # deterministic CTRF JSON — no live network
│   │   ├── all-pass.json
│   │   ├── flaky.json
│   │   └── with-failure.json
│   └── temp_fixtures/      # runtime-generated fixtures (gitignored)
├── .github/
│   └── workflows/
│       └── ci.yml          # runs 5 passing tests + uploads to TestRelic
├── .testrelic/             # TestRelic cloud config (endpoint + repo name)
├── ctrf/                   # CTRF JSON output from test runs
├── docs/
│   ├── problem.md          # customer problem decomposition (Part 1)
│   ├── scale.md            # scale brief (Part 4)
│   ├── GitHub Actions CI Run/
│   │   ├── CI run.png
│   │   └── Github Actions job.png
│   ├── MCP Query Screenshots/
│   │   ├── NL prompt.png
│   │   └── AI insight response.png
│   └── TestRelic Dashboard Screenshots/
│       └── Real ingested test results.png
├── package.json
├── tsconfig.json
└── .env.example
```

## Screenshots

### TestRelic Dashboard
![TestRelic Dashboard](docs/TestRelic%20Dashboard%20Screenshots/Real%20ingested%20test%20results.png)

### MCP AI Insight
![NL Prompt](docs/MCP%20Query%20Screenshots/NL%20prompt.png)
![AI Insight Response](docs/MCP%20Query%20Screenshots/AI%20insight%20response.png)

### GitHub Actions CI Run
![CI Run](docs/GitHub%20Actions%20CI%20Run/CI%20run.png)
![GitHub Actions Job](docs/GitHub%20Actions%20CI%20Run/Github%20Actions%20job.png)
**Link:** https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28049526326/job/83036972762
