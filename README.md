# poc-playwright-flaky-detection

**The question:** which unreliable tests does a single-run Playwright report call flaky, and which does a report that tracks results across runs find?

**The answer:** in 11 runs, one test failed 4 times and passed 7 times. Playwright's report never called it flaky, because it failed both attempts in each bad run. [playwright-smart-reporter](https://github.com/qa-gary-parker/playwright-smart-reporter) marked it `flaky` from run 5 and quarantined it from run 5 to run 11. It did not quarantine a test that fails every run, or a test that was broken and then fixed.

> Exploratory PoC, throwaway by default. Written up in
> [How to Find Flaky Playwright Tests That Retries Never Catch](https://garyparker.dev/blog/find-flaky-playwright-tests-across-runs).

## Method

- Playwright 1.65.1, playwright-smart-reporter 4.0.1, Node 24, macOS.
- 20 tests, `retries: 1`, no browser. `tests/shop.spec.ts` reads the run number from `RUN`, so every outcome is repeatable.
- 16 tests always pass. The other 4:

| test | behaviour |
|---|---|
| intermittent | fails both attempts in runs 2, 5, 7 and 10 |
| retry-flaky | fails the first attempt in runs 3 and 8, passes on the retry |
| broken | fails every run |
| fixed in run 5 | fails runs 1 to 4, passes from run 5 |

- `scripts/run.mjs` runs the suite 11 times with one history file. After each run it records `stats.flaky` from Playwright's JSON report, and each test's `flakinessStatus` and `flakinessScore` from the smart reporter's JSON export, plus the quarantine file.

## Results

`results/summary.md` has every run. Each cell is Playwright's outcome for the test, then the smart reporter's status and score.

| | Playwright flaky count | intermittent | retry-flaky | broken | fixed in run 5 |
|---|---|---|---|---|---|
| run 3 | 1 | insufficient-history 0.33 | flaky 0.33 | insufficient-history 1.00 | insufficient-history 1.00 |
| run 5 | 0 | flaky 0.40 | unstable 0.20 | failing 1.00 | stable 0.80 |
| run 8 | 1 | flaky 0.38 | flaky 0.25 | failing 1.00 | stable 0.50 |
| run 11 | 0 | flaky 0.36 | unstable 0.18 | failing 1.00 | stable 0.36 |

- Playwright's flaky count is 1 in runs 3 and 8 and 0 in the other 9 runs. It never counts the intermittent test.
- Quarantine file: the retry-flaky test in run 3 only; the intermittent test from run 5 to run 11; the broken test and the fixed test never.
- At run 11 the intermittent test and the fixed test have the same score (0.36) and different statuses.

## Limits

- The outcomes are scripted. Real flaky tests do not fail on a schedule.
- No browser, no network, one worker machine.
- One version of each tool. The statuses follow the reporter's defaults (`flakinessUnstable` 0.3, `flakinessStable` 0.1, `maxHistoryRuns` 10).
- The quarantine file is a record. The quarantined test still ran in every run.

## Reproduce

```bash
npm install
npm run experiment
```

MIT. Independent experiment; no affiliation with the Playwright team.
