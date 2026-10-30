// Halloween night sky (functional spec 002-halloween 2.2 and 2.3).
//
// A cosmetic feature in the shape architecture 2.2 describes: installed from
// main.ts, keeps its own state in a closure, draws from the `background` layer
// and never mutates GameState. The moon is fixed, clouds drift on the render
// frame, and the sky colour deepens as the running tick grows so a long run
// visibly gets darker.

import { createRng } from '../rng.js';
import {
  CANVAS,
  CLOUD_COUNT,
  CLOUD_DRIFT_PX_PER_FRAME,
  GROUND_Y,
  MOON,
  NIGHT_DARKEN_AT_TICK,
  PALETTE,
} from '../tuning.js';
import type { Renderer } from '../render.js';
import type { Game, LayerDraw, Rng } from '../types.js';

export interface NightSkyDeps {
  readonly game: Pick<Game, 'on'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

/** Rng salt so clouds don't share bytes with the game's spawner. */
const CLOUD_SALT = 0x5a1a_1a1a;

/** How dark the sky is at `tick`, from 0 (start) to 1 (fully dark). */
export function darkeningProgress(tick: number): number {
  if (tick <= 0) return 0;
  if (tick >= NIGHT_DARKEN_AT_TICK) return 1;
  return tick / NIGHT_DARKEN_AT_TICK;
}

/** Parses `#rrggbb` into [r, g, b]. */
function parseHex(hex: string): readonly [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Linear-interpolated hex colour between two `#rrggbb` stops at `t` in [0, 1]. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  const hex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

interface Cloud {
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly speed: number;
  /** Initial x in [0, CANVAS.width). */
  readonly baseX: number;
}

/** Deterministically lays out `CLOUD_COUNT` clouds across the sky from `rng`. */
function layoutClouds(rng: Rng): readonly Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const y = 20 + Math.floor(rng.next() * 80);
    const width = 40 + Math.floor(rng.next() * 60);
    const height = 6 + Math.floor(rng.next() * 6);
    const speed = CLOUD_DRIFT_PX_PER_FRAME * (0.6 + rng.next() * 0.8);
    const baseX = Math.floor(rng.next() * CANVAS.width);
    clouds.push({ y, width, height, speed, baseX });
  }
  return clouds;
}

/** Positive-modulo helper so a drifting cloud never has a negative wrap. */
function wrap(x: number, modulus: number): number {
  const r = x % modulus;
  return r < 0 ? r + modulus : r;
}

/** Installs the night sky; the returned function removes it again. */
export function installNightSky({ game, renderer }: NightSkyDeps): () => void {
  // Deterministic cloud layout from the run's seed; reset on start and restart.
  let clouds: readonly Cloud[] = layoutClouds(createRng(CLOUD_SALT));

  const resetClouds = (seed: number): void => {
    clouds = layoutClouds(createRng((seed ^ CLOUD_SALT) >>> 0));
  };

  const offStart = game.on('start', ({ seed }) => {
    resetClouds(seed);
  });
  const offRestart = game.on('restart', ({ seed }) => {
    resetClouds(seed);
  });

  const drawSky: LayerDraw = (ctx, state, frame) => {
    // Only darken while running or dead; idle holds at the starting shade.
    const tick = state.phase === 'idle' ? 0 : state.tick;
    const sky = mixHex(
      PALETTE.nightSkyStart,
      PALETTE.nightSkyEnd,
      darkeningProgress(tick),
    );

    // Fill the whole canvas with the night sky colour.
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS.width, GROUND_Y);

    // The moon: a solid disc approximated as a stack of 1-pixel-tall rows.
    ctx.fillStyle = PALETTE.moon;
    for (let dy = -MOON.radius; dy <= MOON.radius; dy += 1) {
      const chord = Math.floor(Math.sqrt(MOON.radius * MOON.radius - dy * dy));
      if (chord <= 0) continue;
      ctx.fillRect(MOON.cx - chord, MOON.cy + dy, chord * 2, 1);
    }

    // Drifting clouds: each cloud wraps horizontally once it falls off screen.
    ctx.fillStyle = PALETTE.cloud;
    for (const cloud of clouds) {
      const drift = cloud.speed * frame.count;
      const x =
        wrap(cloud.baseX - drift, CANVAS.width + cloud.width) - cloud.width;
      ctx.fillRect(Math.round(x), cloud.y, cloud.width, cloud.height);
    }
  };

  const removeLayer = renderer.addLayer('background', drawSky);

  return () => {
    offStart();
    offRestart();
    removeLayer();
  };
}
