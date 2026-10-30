// Dust puffs on jump and land (functional spec 002-halloween 2.4).
//
// A cosmetic feature in the shape architecture 2.2 describes: it listens to
// gameplay events, keeps a small ring of recent puffs in a closure, and draws
// them from the `foreground` layer. It never mutates GameState and resets on
// `start`/`restart`. Puffs are born on the next render after their event, so
// they have a well-defined render-frame start even on the frozen game-over
// screen.

import { DUST_FRAMES, GROUND_Y, PALETTE } from '../tuning.js';
import type { Renderer } from '../render.js';
import type { Game, LayerDraw } from '../types.js';

export interface DustPuffsDeps {
  readonly game: Pick<Game, 'on'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

interface Puff {
  /** Dino hitbox centre x captured on the puff's first drawn frame. */
  centreX: number | null;
  /** Render frame the puff first drew; `null` while queued between event and first draw. */
  startedAt: number | null;
}

const MAX_PUFFS = 8;

/** Installs the dust-puff feature; the returned function removes it again. */
export function installDustPuffs({
  game,
  renderer,
}: DustPuffsDeps): () => void {
  let puffs: Puff[] = [];

  const reset = (): void => {
    puffs = [];
  };

  const addPuff = (): void => {
    puffs.push({ centreX: null, startedAt: null });
    if (puffs.length > MAX_PUFFS) puffs.shift();
  };

  const draw: LayerDraw = (ctx, state, frame) => {
    if (puffs.length === 0) return;

    const dinoCentre = state.dino.hitbox.x + state.dino.hitbox.width / 2;
    // Lazily attach the puff to the dino centre and start time at its first draw.
    for (const puff of puffs) {
      if (puff.startedAt === null) {
        puff.startedAt = frame.count;
        puff.centreX = dinoCentre;
      }
    }
    puffs = puffs.filter((p) => {
      if (p.startedAt === null) return true;
      return frame.count - p.startedAt < DUST_FRAMES;
    });

    ctx.fillStyle = PALETTE.dust;
    for (const puff of puffs) {
      if (puff.startedAt === null || puff.centreX === null) continue;
      const age = frame.count - puff.startedAt;
      const t = age / DUST_FRAMES; // 0..1
      const spread = Math.round(2 + t * 10);
      const size = Math.max(1, Math.round(3 - t * 2));
      const y = GROUND_Y - size - Math.round(t * 2);
      const cx = Math.round(puff.centreX);
      ctx.fillRect(cx - spread - size, y, size, size);
      ctx.fillRect(cx - Math.round(size / 2), y - 1, size, size);
      ctx.fillRect(cx + spread, y, size, size);
    }
  };

  const removeDraw = renderer.addLayer('foreground', draw);
  const offStart = game.on('start', reset);
  const offRestart = game.on('restart', reset);
  const offJump = game.on('jump', addPuff);
  const offLand = game.on('land', addPuff);

  return () => {
    offStart();
    offRestart();
    offJump();
    offLand();
    removeDraw();
  };
}
