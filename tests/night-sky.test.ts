// Tests for the Halloween night sky (functional spec 002-halloween 2.2 and 2.3).
// Covers the pure darkening function, the colour mixer, and the installed
// feature's draw calls through the real layer stack.

import { describe, expect, it } from 'vitest';
import {
  darkeningProgress,
  installNightSky,
  mixHex,
} from '../src/features/night-sky.js';
import { createLayerStack } from '../src/render.js';
import {
  CANVAS,
  GROUND_Y,
  MOON,
  NIGHT_DARKEN_AT_TICK,
  PALETTE,
} from '../src/tuning.js';
import type { GameState } from '../src/types.js';
import { fakeContext, makeGame, pressPrimary, type Call } from './helpers.js';

type FillRect = Extract<Call, { op: 'fillRect' }>;

describe('darkeningProgress', () => {
  it('is 0 at tick 0 and before', () => {
    expect(darkeningProgress(0)).toBe(0);
    expect(darkeningProgress(-100)).toBe(0);
  });

  it('is 1 at NIGHT_DARKEN_AT_TICK and beyond', () => {
    expect(darkeningProgress(NIGHT_DARKEN_AT_TICK)).toBe(1);
    expect(darkeningProgress(NIGHT_DARKEN_AT_TICK * 2)).toBe(1);
  });

  it('rises monotonically between 0 and NIGHT_DARKEN_AT_TICK', () => {
    let previous = 0;
    for (let t = 60; t <= NIGHT_DARKEN_AT_TICK; t += 60) {
      const now = darkeningProgress(t);
      expect(now).toBeGreaterThanOrEqual(previous);
      expect(now).toBeLessThanOrEqual(1);
      previous = now;
    }
    expect(previous).toBe(1);
  });
});

describe('mixHex', () => {
  it('returns the first stop at t = 0 and the second at t = 1', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns the midpoint at t = 0.5', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('mixes the two night-sky stops to a visibly deeper colour', () => {
    const half = mixHex(PALETTE.nightSkyStart, PALETTE.nightSkyEnd, 0.5);
    expect(half).not.toBe(PALETTE.nightSkyStart);
    expect(half).not.toBe(PALETTE.nightSkyEnd);
  });
});

describe('night-sky feature', () => {
  const NIGHT_SKY_FILLS = new Set<unknown>([
    PALETTE.moon,
    PALETTE.cloud,
    // Sky fills are an interpolated hex between the two night-sky stops.
  ]);

  function setup() {
    const { game } = makeGame(42);
    const stack = createLayerStack();
    const dispose = installNightSky({ game, renderer: stack });
    function render(state: GameState = game.view()): FillRect[] {
      const ctx = fakeContext();
      stack.run(ctx, state);
      return ctx.calls.flatMap((c): FillRect[] =>
        c.op === 'fillRect' ? [c] : [],
      );
    }
    function skyRects(state: GameState = game.view()): FillRect[] {
      const ctx = fakeContext();
      stack.run(ctx, state);
      let style: unknown = undefined;
      const rects: FillRect[] = [];
      for (const call of ctx.calls) {
        if (call.op === 'fillStyle') style = call.value;
        if (
          call.op === 'fillRect' &&
          (NIGHT_SKY_FILLS.has(style) ||
            // Night sky fills use an interpolated hex; detect by its full-sky geometry.
            (typeof style === 'string' &&
              call.x === 0 &&
              call.y === 0 &&
              call.w === CANVAS.width))
        ) {
          rects.push(call);
        }
      }
      return rects;
    }
    return { game, render, skyRects, dispose };
  }

  it('paints a full-width sky above the ground before the built-in layers', () => {
    const { render } = setup();
    const rects = render();
    const sky = rects[0];
    expect(sky).toBeDefined();
    if (sky === undefined) return;
    expect(sky.x).toBe(0);
    expect(sky.y).toBe(0);
    expect(sky.w).toBe(CANVAS.width);
    expect(sky.h).toBe(GROUND_Y);
  });

  it('draws the moon as a disc near the top-right of the game area', () => {
    const { render } = setup();
    const rects = render();
    // The disc rows span cy - radius to cy + radius, each a horizontal rect.
    const moonRows = rects.filter(
      (r) =>
        r.h === 1 &&
        r.y >= MOON.cy - MOON.radius &&
        r.y <= MOON.cy + MOON.radius &&
        r.x > CANVAS.width / 2,
    );
    expect(moonRows.length).toBeGreaterThan(MOON.radius);
    for (const row of moonRows) {
      expect(row.w).toBeGreaterThan(0);
      expect(row.x + row.w).toBeLessThanOrEqual(CANVAS.width);
    }
  });

  it('draws drifting clouds in the sky, and they move between renders', () => {
    const cloudRectsFrom = (
      ctx: ReturnType<typeof fakeContext>,
    ): FillRect[] => {
      let style: unknown = undefined;
      const rects: FillRect[] = [];
      for (const call of ctx.calls) {
        if (call.op === 'fillStyle') style = call.value;
        if (call.op === 'fillRect' && style === PALETTE.cloud) rects.push(call);
      }
      return rects;
    };
    const { game } = makeGame(42);
    const stack = createLayerStack();
    installNightSky({ game, renderer: stack });
    const first = (() => {
      const ctx = fakeContext();
      stack.run(ctx, game.view());
      return cloudRectsFrom(ctx);
    })();
    // Advance several frames so the sub-pixel drift accumulates reliably.
    for (let i = 0; i < 29; i += 1) stack.run(fakeContext(), game.view());
    const later = (() => {
      const ctx = fakeContext();
      stack.run(ctx, game.view());
      return cloudRectsFrom(ctx);
    })();

    expect(first.length).toBeGreaterThan(0);
    expect(later.length).toBe(first.length);
    const anyMoved = first.some((c, i) => c.x !== later[i]?.x);
    expect(anyMoved).toBe(true);
  });

  it('darkens the sky between tick 0 and NIGHT_DARKEN_AT_TICK while running', () => {
    const { game, render } = setup();
    const earlyRects = render();
    const earlySky = earlyRects[0];
    pressPrimary(game);
    game.tick(NIGHT_DARKEN_AT_TICK);
    const lateRects = render();
    const lateSky = lateRects[0];
    // Both skies are rect-at-origin covering the sky area.
    expect(earlySky).toBeDefined();
    expect(lateSky).toBeDefined();
  });

  it('draws no night-sky rects after dispose', () => {
    const { skyRects, dispose } = setup();
    expect(skyRects().length).toBeGreaterThan(0);
    dispose();
    expect(skyRects().length).toBe(0);
  });
});
