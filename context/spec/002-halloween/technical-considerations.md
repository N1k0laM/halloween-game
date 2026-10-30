# Technical Considerations: Halloween Edition

## 1. Overview

A pure-logic growth of `ObstacleKind` ('bat'), `DinoPose` ('duck'), `Intent` ('duck'), plus three cosmetic features. Spec 001's core loop stays unchanged.

## 2. Changes by module

- `tuning.ts`
  - Add `PUMPKIN_COLOR`, `MOON_COLOR`, `CLOUD_COLOR`, `NIGHT_SKY_COLOR_START`, `NIGHT_SKY_COLOR_END`, `NIGHT_DARKEN_AT_TICK` (3600 ticks = 60 s), `DUCK_DURATION_TICKS` (30), `DUCK_HITBOX_TOP` (fraction of dino height), `BAT_PROBABILITY` (0.2), `BAT_UNLOCK_TICK` (600 = 10 s), `BAT_Y` (above ground), `DUST_FRAMES` (30).
- `sprites.ts`
  - Add `pumpkinSmall`, `pumpkinLarge`, `bat` (two frames), `dinoDuck0`, `dinoDuck1`. `obstacleSprite` returns pumpkin for 'small'/'large', bat for 'bat'. Dino hitbox when ducking is lower-only.
- `types.ts`
  - `ObstacleKind = 'small' | 'large' | 'bat'`. `DinoPose` adds `'duck'`. `Intent = 'primary' | 'duck'`. `GameState.dino.pose` reflects duck.
- `obstacles.ts`
  - When tick > `BAT_UNLOCK_TICK`, with probability `BAT_PROBABILITY` the next group is a single bat at `BAT_Y`, otherwise the current pumpkin pipeline. Bat uses `makeObstacle('bat', x, id, group)` which pins y to `BAT_Y`. Both-kinds forcing is unchanged (bats skipped).
- `game.ts`
  - `RunState.duckUntil: number | null`. 'duck' intent on ground sets `duckUntil = tick + DUCK_DURATION_TICKS`. 'primary' intent cancels duck and jumps. In air, 'duck' is ignored. `projectDino` returns duck pose and a shorter top-insetted hitbox while ducking. Reset on `start`/`restart`.
- `input.ts` / `input-dom.ts`
  - `keyDown('ArrowDown', false)` returns `'duck'`. DOM adapter also preventDefaults ArrowDown.
- `render.ts`
  - Night-sky background colour applied in `background` layer by a feature (default canvas clear stays white; feature paints over it). Pumpkin and bat drawers reuse `drawSprite` with their colours (we add `drawSpriteColored`). Duck pose maps to the duck sprites.
- `features/night-sky.ts`
  - Installs background: dark fill, interpolated darker over 60 s, moon rectangle, two drifting clouds using feature-owned rng seeded by `state.seed ^ SALT`. Clouds drift at a fixed rate per render frame when running.
- `features/dust-puffs.ts`
  - Subscribes to `jump` and `land`. Spawns a short-lived puff (fading rect clusters) at the dino's feet. Draws in `foreground`. Resets on `start`/`restart`.

## 3. Tests to add

- `tests/tuning.test.ts`: new constants exist and have sane ranges.
- `tests/obstacles.test.ts`: when tick > BAT_UNLOCK_TICK and rng rolls below BAT_PROBABILITY, a bat spawns; its y is BAT_Y and group size is 1.
- `tests/game.acceptance.test.ts`: duck intent on ground sets duck pose for 30 ticks then returns to run; primary during duck starts jump and clears duck; duck intent in air is ignored.
- `tests/night-sky.test.ts` (new): darkening function monotonic from 0 to 1 across [0, NIGHT_DARKEN_AT_TICK]; stable at 1 beyond.
- `tests/features/dust-puffs.test.ts` (new, under tests/features/): subscribing feature draws a non-empty puff between the jump event and `DUST_FRAMES` later.

## 4. Risks and tradeoffs

- The ArrowDown preventDefault risks surprising users who use ArrowDown to scroll; the brief trades that for a game-area action, consistent with ArrowUp.
- Growing `ObstacleKind` and `DinoPose` affects every `assertNever` switch; we update all callers.
- `tests/regression.acceptance.test.ts` may hold an exact `ObstacleKind` or `DinoPose` union assertion. The brief allows editing that test to match the new spec.
