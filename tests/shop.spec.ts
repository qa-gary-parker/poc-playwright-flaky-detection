import { test, expect } from '@playwright/test';

// RUN is the number of the run, 1 to 11. It makes every outcome repeatable.
const RUN = Number(process.env.RUN ?? 1);

for (let i = 1; i <= 16; i++) {
  test(`stable ${String(i).padStart(2, '0')}: cart total is correct`, async () => {
    expect(i * 2).toBe(i + i);
  });
}

test('intermittent: search returns results', async () => {
  // Fails both attempts in runs 2, 5, 7 and 10.
  expect([2, 5, 7, 10]).not.toContain(RUN);
});

test('retry-flaky: checkout confirms the order', async ({}, testInfo) => {
  // Fails the first attempt in runs 3 and 8, then passes on the retry.
  expect([3, 8].includes(RUN) && testInfo.retry === 0).toBe(false);
});

test('broken: export downloads a file', async () => {
  expect(RUN).toBe(0);
});

test('fixed in run 5: login redirects', async () => {
  expect(RUN).toBeGreaterThanOrEqual(5);
});
