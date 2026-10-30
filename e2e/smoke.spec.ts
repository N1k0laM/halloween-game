// The single end-to-end smoke test (architecture section 5, technical
// considerations 4.3). It proves only the wiring unit tests cannot; later
// slices extend this one test rather than adding new ones.

import { expect, test } from '@playwright/test';
// Brings in the `window.__dino` declaration so page.evaluate callbacks are typed.
import type {} from '../src/global.js';

test('the game boots, renders and plays in a real browser', async ({
  page,
}) => {
  // 1. No console or page errors. Collected for the whole test, reloads
  // included, and asserted empty at the end.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  await page.goto('/?seed=42');

  // 2. The canvas is 800 by 300, centred in the 1280-wide viewport, no horizontal scroll.
  const box = await page.locator('canvas#game').boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBe(800);
  expect(box?.height).toBe(300);
  expect(box?.x).toBeCloseTo((1280 - 800) / 2, 0);
  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);

  // 3. The test hook is installed, carries the URL seed, and the game waits
  // on the start screen. `'__dino' in window` rather than `!== undefined`:
  // the global type says it always exists.
  await page.waitForFunction(() => '__dino' in window);
  const seed = await page.evaluate(() => window.__dino.seed);
  expect(seed).toBe(42);
  const phase = await page.evaluate(() => window.__dino.state().phase);
  expect(phase).toBe('idle');

  // 4. Space starts the run and is not left to scroll the page. A listener
  // added now, after bootstrap, runs after the game's own window listener in
  // the bubbling phase. The promise is wrapped in an object so evaluateHandle
  // returns at once with the listener installed, and is awaited after the press.
  const spaceProbe = await page.evaluateHandle(() => ({
    defaultPrevented: new Promise<boolean>((resolve) => {
      window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') resolve(event.defaultPrevented);
      });
    }),
  }));
  await page.keyboard.press('Space');
  // Start of the four-second death budget in step 6, taken at the press.
  const spacePressedAt = Date.now();
  await page.waitForFunction(() => window.__dino.state().phase === 'running');
  const spaceDefaultPrevented = await spaceProbe.evaluate(
    (probe) => probe.defaultPrevented,
  );
  expect(spaceDefaultPrevented).toBe(true);

  // 5. The real clock drives the game: the score grows within one second.
  await page.waitForFunction(() => window.__dino.state().score > 0, null, {
    timeout: 1000,
  });

  // 6. Collision ends the run: with no further input the dino never jumps,
  // so the first cactus kills it. The four seconds count from the Space press
  // (first arrival is at most 150 ticks, 2.5 s), so only what is left of them
  // is allowed here. Nothing presses a key between the press and this check.
  await page.waitForFunction(
    () => window.__dino.state().phase === 'dead',
    null,
    {
      timeout: Math.max(1, 4000 - (Date.now() - spacePressedAt)),
    },
  );

  // 6b. Multiple restarts don't leak keyboard listeners (functional spec 2.7:
  // every key press maps to one jump, no matter how many times the player has
  // restarted). If the bootstrap re-attached a keyboard on every restart
  // without disposing the previous one, the second restart press would be
  // dispatched twice: once consumed in `dead` (the restart itself), and once
  // left in the queue — then auto-consumed as a jump on tick 1 of the new run.
  // Same seed means a no-input run always dies at the same score, so this
  // leaves `dead` below unchanged for the reload check.
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dino.state().phase === 'running');
  await page.waitForFunction(
    () => window.__dino.state().phase === 'dead',
    null,
    { timeout: 4000 },
  );
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dino.state().phase === 'running');
  // Wait until ~10 ticks of running have elapsed (scrollX > 60 at START_SPEED).
  // With the leak, the dino is mid auto-jump by now; without it, still grounded.
  await page.waitForFunction(() => window.__dino.state().scrollX > 60);
  const afterTwoRestarts = await page.evaluate(() => window.__dino.state());
  expect(afterTwoRestarts.phase).toBe('running');
  expect(afterTwoRestarts.dino.onGround).toBe(true);
  // Let this run die too, so `dead` below is a fresh dying state for step 7.
  await page.waitForFunction(
    () => window.__dino.state().phase === 'dead',
    null,
    { timeout: 4000 },
  );

  // 7. The high score survives a reload. A fresh Playwright context starts
  // with empty storage, so this run's final score is the first best score and
  // the death saved it. `page.on` listeners belong to the page, not the
  // document, so error collection carries on across the reload.
  const dead = await page.evaluate(() => window.__dino.state());
  expect(dead.score).toBeGreaterThan(0);
  expect(dead.hi).toBe(dead.score);
  await page.reload();
  await page.waitForFunction(() => '__dino' in window);
  const reloaded = await page.evaluate(() => window.__dino.state());
  expect(reloaded.phase).toBe('idle');
  expect(reloaded.hi).toBe(dead.score);

  // 8. The game area shrinks to fit a small window and grows back, never
  // beyond 800 by 300, without restarting the run (functional spec 2.9).
  await page.setViewportSize({ width: 400, height: 800 });
  await page.waitForFunction(
    () =>
      document.querySelector('canvas#game')?.getBoundingClientRect().width ===
      368,
  );
  const small = await page.locator('canvas#game').boundingBox();
  expect(small?.width).toBe(368); // 400 minus a 16 px margin on each side
  expect(small?.height).toBeCloseTo((368 * 300) / 800, 0);
  expect(small?.x).toBeCloseTo(16, 0);
  const smallLayout = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#game');
    const root = document.documentElement;
    return {
      backing: canvas instanceof HTMLCanvasElement ? canvas.width : -1,
      expected: Math.round(368 * window.devicePixelRatio),
      scrolls: root.scrollWidth > root.clientWidth,
    };
  });
  expect(smallLayout.backing).toBe(smallLayout.expected);
  expect(smallLayout.scrolls).toBe(false);
  const afterResize = await page.evaluate(() => window.__dino.state());
  expect(afterResize.phase).toBe(reloaded.phase);
  expect(afterResize.hi).toBe(reloaded.hi);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(
    () =>
      document.querySelector('canvas#game')?.getBoundingClientRect().width ===
      800,
  );
  const full = await page.locator('canvas#game').boundingBox();
  expect(full?.width).toBe(800);
  expect(full?.height).toBe(300);

  // 1, asserted: nothing logged an error at any point above.
  expect(errors).toEqual([]);
});
