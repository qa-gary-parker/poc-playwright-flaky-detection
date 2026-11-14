// Records a tour of the report from the last experiment run (out/smart-report.html) with captions and narration cues.
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const report = path.resolve(__dirname, '../out/smart-report.html');
const outDir = path.resolve(__dirname, 'out');
const ZOOM = 1.5;
const CAPTION = 44;
const id = (title: string) => encodeURIComponent(`tests/shop.spec.ts::${title}`);

async function open(page: Page, queue: string, title: string) {
  await page.evaluate(h => { location.hash = h; }, `#/q/${queue}?test=${id(title)}`);
  await expect(page.locator('article.detail').getByRole('heading', { name: title })).toBeVisible();
  // Show repo-relative paths in error output
  await page.evaluate(root => {
    const walk = document.createTreeWalker(document.querySelector('article.detail')!, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue!.includes(root)) n.nodeValue = n.nodeValue!.split(root).join('');
  }, path.resolve(__dirname, '..') + '/');
}

// The right half stays empty for YouTube's end-screen elements
async function endCard(page: Page, rows: [string, string][], summary: string) {
  await page.evaluate(([z, rows, summary]) => {
    const add = (parent: HTMLElement, css: string, text = '') => {
      const el = parent.appendChild(document.createElement('div'));
      el.style.cssText = css;
      el.textContent = text;
      return el;
    };
    const card = add(document.body, `position:fixed;inset:0;z-index:100000;zoom:${1 / (z as number)};box-sizing:border-box;padding:112px 128px;background:#0B0D0C;color:#E6E8E3;font:36px/1.3 ui-monospace,Menlo,monospace`);
    const brand = add(card, 'display:flex;align-items:center;gap:16px;color:#3FB950;font-size:30px', 'gary-parker');
    brand.prepend(Object.assign(document.createElement('span'), { style: 'width:20px;height:20px;border-radius:10px;background:#3FB950' }));
    (rows as [string, string][]).forEach(([key, value], i) => {
      add(card, `margin-top:${i ? 52 : 124}px;color:#8A9088;font-size:24px;letter-spacing:.12em;text-transform:uppercase`, key);
      const row = add(card, 'margin-top:16px;white-space:pre-line', value.replace(/^\$ /, ''));
      if (value.startsWith('$ ')) row.prepend(Object.assign(document.createElement('span'), { textContent: '$ ', style: 'color:#3FB950' }));
    });
    add(card, 'position:absolute;left:128px;bottom:96px;color:#8A9088;font-size:26px', summary as string);
  }, [ZOOM, rows, summary] as const);
}

test('record the flaky tour', async ({ browser }, testInfo) => {
  const viewport = testInfo.project.use.viewport!;
  const context = await browser.newContext({ viewport, colorScheme: 'dark', recordVideo: { dir: testInfo.outputDir, size: viewport } });
  const page = await context.newPage();
  const start = Date.now();
  const cues: string[] = [];
  const say = async (text: string, holdMs: number, spoken = text) => {
    cues.push(`${((Date.now() - start) / 1000).toFixed(2)}\t${spoken}`);
    await page.evaluate(t => { document.getElementById('demo-caption')!.textContent = t; }, text);
    await page.waitForTimeout(holdMs);
  };

  await page.goto('file://' + report);
  await page.evaluate(([z, px, h]) => {
    const bar = (px as number) * 2.25;
    document.head.appendChild(document.createElement('style')).textContent =
      `html{zoom:${z};overflow:hidden}.app{height:${(h as number) / (z as number) - bar}px !important}`
      + `#demo-caption{position:fixed;left:0;right:0;bottom:0;height:${bar}px;z-index:99999;box-sizing:border-box;`
      + `display:flex;align-items:center;justify-content:center;padding:0 ${px}px;background:#0B0D0C;`
      + `border-top:1px solid #3FB950;color:#E6E8E3;font:600 ${px}px/1.25 ui-monospace,Menlo,monospace;text-align:center}`;
    const el = document.createElement('div');
    el.id = 'demo-caption';
    document.body.appendChild(el);
  }, [ZOOM, CAPTION, viewport.height] as const);

  await open(page, 'all', 'intermittent: search returns results');
  await say('This test failed 4 of 11 runs', 4500, 'This Playwright test failed four of eleven runs.');
  await say('Playwright never called it flaky', 5500, 'Playwright never called it flaky, because it failed both attempts in each bad run.');
  await say('Flaky in Playwright = passed on a retry', 5000, 'In a Playwright report, flaky means the test passed on a retry.');

  await open(page, 'flaky', 'intermittent: search returns results');
  await say('Smart Reporter keeps past results', 4500, 'Playwright Smart Reporter keeps the results of past runs.');
  await say('Flaky from run 5: the result keeps changing', 5500, 'It marked this test flaky from run five, because the result keeps changing.');

  await open(page, 'all', 'broken: export downloads a file');
  await say('Fails every run: failing, not flaky', 5000, 'A test that fails every run is failing, not flaky.');

  await open(page, 'all', 'fixed in run 5: login redirects');
  await say('Broken, then fixed: stable, with the same 36%', 5500, 'A test that was broken and then fixed is stable, with the same score.');

  await open(page, 'quarantined', 'intermittent: search returns results');
  await say('Only the flaky test is quarantined', 5000, 'Only the flaky test goes into the quarantine file.');

  await endCard(page, [
    ['install', '$ npm i -D playwright-smart-reporter'],
    ['write-up', 'garyparker.dev/blog/\nfind-flaky-playwright-tests-across-runs'],
    ['source', 'github.com/qa-gary-parker/\npoc-playwright-flaky-detection'],
  ], '4 failed runs of 11 · 0 flaky in Playwright · flaky from run 5');
  await say('', 10000, 'The experiment and the reporter are open source. The links are in the description.');

  const video = page.video()!;
  await context.close();
  fs.mkdirSync(outDir, { recursive: true });
  await video.saveAs(path.join(outDir, 'flaky-demo.webm'));
  fs.writeFileSync(path.join(outDir, 'narration.tsv'), cues.join('\n') + '\n');
});
