// Runs the suite 11 times and records what Playwright's JSON report and playwright-smart-reporter say after each run.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RUNS = 11;
const TARGETS = ['intermittent', 'retry-flaky', 'broken', 'fixed in run 5'];
const root = resolve(import.meta.dirname, '..');
const out = join(root, 'out');
const read = (f) => JSON.parse(readFileSync(join(out, f), 'utf8'));

rmSync(out, { recursive: true, force: true });
const runs = [];
for (let run = 1; run <= RUNS; run++) {
  const r = spawnSync('npx', ['playwright', 'test'], { cwd: root, env: { ...process.env, RUN: String(run), CI: '1', FORCE_COLOR: '0' }, encoding: 'utf8' });
  const { expected, unexpected, flaky } = read('report.json').stats;
  const smart = read('smart-report-data.json');
  const tests = {};
  for (const name of TARGETS) {
    const t = smart.tests.find((x) => x.title.startsWith(name));
    tests[name] = { result: t.outcome, status: t.flakinessStatus ?? null, score: t.flakinessScore ?? null, runs: t.flakinessRuns ?? null, indicator: t.flakinessIndicator ?? null };
  }
  const quarantine = existsSync(join(out, 'quarantine.json')) ? (read('quarantine.json').entries ?? read('quarantine.json').tests ?? []).map((e) => e.title) : [];
  runs.push({ run, exit: r.status, playwright: { expected, unexpected, flaky }, smart: { flaky: smart.summary.flaky, grade: smart.summary.stabilityGrade }, tests, quarantine });
  console.log(JSON.stringify(runs.at(-1)));
}

mkdirSync(join(root, 'results'), { recursive: true });
writeFileSync(join(root, 'results', 'runs.json'), JSON.stringify(runs, null, 1));
const cell = (t) => `${t.result}${t.status ? ` / ${t.status}` : ''}${t.score == null ? '' : ` ${t.score.toFixed(2)}`}`;
const md = [
  `| run | Playwright flaky | ${TARGETS.join(' | ')} | quarantined |`,
  `|---|---|${TARGETS.map(() => '---').join('|')}|---|`,
  ...runs.map((r) => `| ${r.run} | ${r.playwright.flaky} | ${TARGETS.map((n) => cell(r.tests[n])).join(' | ')} | ${r.quarantine.join(', ') || '-'} |`),
].join('\n');
writeFileSync(join(root, 'results', 'summary.md'), `${md}\n`);
console.log(md);
