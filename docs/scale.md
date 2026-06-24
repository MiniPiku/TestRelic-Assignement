**TestRelic FDE Intern Assignment · Part 4**

---

## Deployment Playbook — Onboarding 50 Teams

**Sequence from signup to first insight:**

1. **Signup** → create project on `platform.testrelic.ai` → API key generated
2. **Install** → `npm install @testrelic/playwright-analytics`
3. **Configure** → add reporter to `playwright.config.ts` + create
   `.testrelic/testrelic-config.json` with endpoint and repo name
4. **Set secret** → add `TESTRELIC_API_KEY` to GitHub Actions secrets
5. **Push** → first CI run triggers automatic upload
6. **Query** → open TestRelic AI, ask first natural language question about results

**Total time to first insight: ~15 minutes for a developer who reads the README.**

**Where teams drop off:**

| Drop-off Point | Mitigation |
|---|---|
| Step 3 — config structure is non-obvious | Ship a one-command init: `npx testrelic init` that writes both files automatically |
| Step 4 — GitHub secret not set, silent failure | CI step should fail loudly with exact error: "TESTRELIC_API_KEY not set — results not uploaded" |
| Step 6 — dashboard shows data but developer doesn't know what to ask | Pre-populate 3 suggested prompts on first project load: "What failed?", "What's flaky?", "What's my pass rate trend?" |

---

## Top 3 Integration Failure Patterns

**1. `TESTRELIC_API_KEY` not exported in CI**

*Symptom:* Tests run and pass locally, CI passes, but dashboard shows no data.
No error is thrown — the reporter silently skips upload.

*Resolution:*
1. Check GitHub repo → Settings → Secrets → confirm `TESTRELIC_API_KEY` exists
2. In `ci.yml`, confirm `env: TESTRELIC_API_KEY: ${{ secrets.TESTRELIC_API_KEY }}`
   is under the test step, not the job level
3. Re-run workflow — dashboard should populate within 30 seconds of run completing

---

**2. `apiKey` at wrong level in reporter config**

*Symptom:* Reporter loads without error but upload never triggers.
Dashboard stays empty even with correct API key in environment.

*Resolution:*
1. Check `playwright.config.ts` — `apiKey` must be nested inside `cloud: {}`,
   not at the top level of the reporter options
2. Correct structure:
```ts
   cloud: { apiKey: process.env.TESTRELIC_API_KEY, upload: 'both' }
```
3. Re-run tests — upload confirmation should appear in terminal output

---

**3. `.testrelic/testrelic-config.json` missing or malformed**

*Symptom:* Results upload but appear under wrong project name, or endpoint
returns 404. Dashboard shows a different repo name than expected.

*Resolution:*
1. Create `.testrelic/testrelic-config.json` at project root
2. Ensure it contains correct endpoint and repo name:
```json
   {
     "cloud": {
       "endpoint": "https://platform.testrelic.ai/api/v1",
       "upload": "both"
     },
     "testrelic-repo": { "name": "your-project-name" }
   }
```
3. Commit and push — dashboard will reflect correct project name on next run

---

## Feedback Loop Design

**Events to track:**

| Event | Trigger | Why |
|---|---|---|
| `first_upload` | First test result reaches dashboard | Measures successful integration |
| `first_mcp_query` | First NL query run against a project | Measures activation — developer got value |
| `flaky_flag_viewed` | Developer clicks a flaky test label | Measures signal quality |
| `failure_analysis_opened` | AI failure analysis triggered | Measures core use case adoption |
| `repeat_upload_d7` | Upload occurs again within 7 days | Measures retention |

**Activation threshold:** `first_upload` + `first_mcp_query` within the same
session, within 10 minutes. A team that hits this has closed the full loop from
CI failure to actionable insight. This is the moment the product delivers its
core promise.

**Stuck signal:** `first_upload` occurred but no `first_mcp_query` within
48 hours → trigger an onboarding nudge: "Your tests are in — ask AI what
failed."

---

## One Product Insight

**Problem:** The dashboard is fully locked behind a boolean gate — a team
cannot access any part of it until their first test run passes and the flag
flips to `true`. This creates a forced dead zone at exactly the moment a new
user is most likely to drop off. They've installed the SDK, configured it,
and pushed — and the product gives them nothing to interact with while they
wait. Developers are more likely to keep using tools they feel in control of.
A blank, locked screen signals the opposite: that the product is in control,
and they're waiting on it.

**Proposed solution:** Unlock a read-only sandbox dashboard immediately on
project creation — before any tests run — populated with realistic synthetic
data from a fictional project. Let the user explore the AI query interface,
browse a sample failure analysis, and click through flaky test flags. Every
interactive element works; only the "your data" toggle is greyed out with a
clear label: "Waiting for your first test run."

This reframes the wait. Instead of staring at a lock, the user is learning
the product. When their first upload arrives, the switch to real data feels
like a reward, not a door finally being opened.

**Evidence:** The drop-off pattern this solves is well-established: users who
cannot interact with a product in the first session rarely return. The gate
creates a cliff between Step 5 (push) and Step 6 (query) in the onboarding
sequence — two steps that should feel continuous. A sandbox collapses that
cliff. It also means `first_mcp_query` can fire during onboarding itself,
not after — moving the activation threshold earlier and making the feedback
loop tighter.