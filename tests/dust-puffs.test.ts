// Tests for dust puffs on jump and land (functional spec 002-halloween 2.4):
// a puff appears at the dinosaur's feet when it leaves the ground and when it
// touches down again, and it fades within DUST_FRAMES render frames. Driven
// through a real game and the real layer stack.

import { describe, expect, it } from 'vitest';
import { installDustPuffs } from '../src/features/dust-puffs.js';
import { createLayerStack } from '../src/render.js';
import { DUST_FRAMES, GROUND_Y, PALETTE } from '../src/tuning.js';
import type { GameState } from '../src/types.js';
import {
  collect,
  fakeContext,
  makeGame,
  pressPrimary,
  runUntil,
  type Call,
} from './helpers.js';

type FillRect = Extract<Call, { op: 'fillRect' }>;

/** fillRects drawn by the dust-puff feature (styled with PALETTE.dust). */
function dustRects(ctx: ReturnType<typeof fakeContext>): FillRect[] {
  const rects: FillRect[] = [];
  let style: unknown = undefined;
  for (const call of ctx.calls) {
    if (call.op === 'fillStyle') style = call.value;
    if (call.op === 'fillRect' && style === PALETTE.dust) rects.push(call);
  }
  return rects;
}

function setup() {
  const { game } = makeGame(42);
  const stack = createLayerStack();
  const dispose = installDustPuffs({ game, renderer: stack });
  function render(state: GameState = game.view()): FillRect[] {
    const ctx = fakeContext();
    stack.run(ctx, state);
    return dustRects(ctx);
  }
  return { game, render, dispose };
}

describe('dust puffs on jump and land', () => {
  it('draws nothing on the start screen or while running without a jump', () => {
    const { game, render } = setup();
    expect(render()).toEqual([]);
    pressPrimary(game);
    for (let i = 0; i < 30; i += 1) {
      expect(render()).toEqual([]);
      game.tick();
    }
  });

  it('appears at the dinosaur feet after a jump event', () => {
    const { game, render } = setup();
    pressPrimary(game);
    const jumps = collect(game, 'jump');
    pressPrimary(game);
    expect(jumps.length).toBe(1);

    const rects = render();
    expect(rects.length).toBeGreaterThan(0);
    const dino = game.view().dino;
    const centre = dino.hitbox.x + dino.hitbox.width / 2;
    for (const r of rects) {
      expect(r.y).toBeLessThan(GROUND_Y);
      expect(r.y + r.h).toBeLessThanOrEqual(GROUND_Y);
      // Each speck starts near the dino centre (within ~20 px).
      expect(Math.abs(r.x - centre)).toBeLessThan(30);
    }
  });

  it('also appears on land, and fades within DUST_FRAMES render frames', () => {
    const { game, render } = setup();
    pressPrimary(game);
    pressPrimary(game); // jump
    render(); // consume the jump puff
    runUntil(game, (s) => s.dino.onGround, 60); // waits for the land
    // At least the land puff should now draw.
    expect(render().length).toBeGreaterThan(0);
    for (let i = 0; i < DUST_FRAMES + 2; i += 1) render();
    expect(render()).toEqual([]);
  });

  it('resets on restart: no leftover puffs from the previous run', () => {
    const { game, render } = setup();
    pressPrimary(game);
    pressPrimary(game); // jump — queues a puff
    runUntil(game, (s) => s.phase === 'dead', 1200);
    render();

    pressPrimary(game); // restart
    expect(render()).toEqual([]);
  });

  it('draws nothing after dispose, even after a jump', () => {
    const { game, render, dispose } = setup();
    pressPrimary(game);
    pressPrimary(game);
    dispose();
    expect(render()).toEqual([]);
  });
});
