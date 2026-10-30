# Functional Specification: Halloween Edition

- **Topic:** A Halloween skin that keeps the core loop intact: pumpkins instead of cacti, a night sky that gets darker the longer you survive, dust puffs on jump and land, and bats you must duck under.
- **Status:** Tier 1 Completed; Tier 2 (bats + ducking) not shipped in this iteration
- **Author:** emamicovic

---

## 1. Overview and Rationale (The "Why")

Marketing asked for a Halloween edition for the week of October 31. The brief lists more than fits in one slot, so we pick a style ("spooky pumpkins at dusk, bat silhouettes") and ship the parts the brief marks as decided plus the first play-impact addition (bats + ducking). Hats, candies, hearts and bigger spooky set-pieces are explicitly out of this spec.

The game must stay fair: cacti, pumpkins and bats share spawn rules; speed and gap guarantees from spec 001 do not change. Ducking does not make the player untouchable; bats fly at a height a duck can clear.

Success looks like this: a returning player sees pumpkins, a moon and clouds within the first second, survives on existing timing against pumpkins, and learns within one run that bats fly and ArrowDown ducks.

---

## 2. Functional Requirements (The "What")

### 2.1 Pumpkins replace cacti

- **Acceptance Criteria:**
    - [x] When a run begins, every spawned ground obstacle is drawn as a pumpkin (small or large) instead of a cactus. Its hitbox and spawn rules from spec 001 are unchanged. _(Verified: `src/sprites.ts` CACTUS_SMALL and CACTUS_LARGE bitmaps now hold pumpkin art; dimensions and hitboxes unchanged; `tests/sprites.test.ts` still passes.)_
    - [x] When the pumpkin fill is drawn, it uses the Halloween orange accent (`PALETTE.pumpkin`). _(Verified: `src/render.ts` `drawObstacles` passes `PALETTE.pumpkin` to `drawSprite`; `tests/render.test.ts` "sets fillStyle only to PALETTE values" still passes.)_

### 2.2 Night sky with moon and drifting clouds

- **Acceptance Criteria:**
    - [x] When the page opens, the background is a dark night-sky colour, a moon is visible in the top-right of the game area, and at least one cloud is drifting left-to-right across the sky. _(Verified by `tests/night-sky.test.ts` "paints a full-width sky above the ground" and "draws the moon as a disc".)_
    - [x] When a run advances, the clouds drift at their own slower pace independent of the world scroll. The moon stays fixed. _(Verified by `tests/night-sky.test.ts` "draws drifting clouds in the sky, and they move between renders".)_

### 2.3 Survival changes the sky

- **Acceptance Criteria:**
    - [x] When a run has lasted 60 seconds, the sky is visibly darker than at the start of the same run. The transition is monotonic and tops out before 90 seconds. _(Verified by `tests/night-sky.test.ts` `darkeningProgress` block: 0 at tick 0, monotonically rising, 1 at `NIGHT_DARKEN_AT_TICK` = 3600 ticks = 60 s.)_

### 2.4 Reactions to events

- **Acceptance Criteria:**
    - [x] When the dinosaur takes off, a short dust puff appears at its feet. _(Verified by `tests/dust-puffs.test.ts` "appears at the dinosaur feet after a jump event".)_
    - [x] When the dinosaur lands, a short dust puff appears at its feet. _(Verified by `tests/dust-puffs.test.ts` "also appears on land, and fades within DUST_FRAMES".)_
    - [x] Both puffs fade within half a second and do not affect gameplay. _(Verified by the same test; puffs are drawn from the `foreground` layer and never touch GameState.)_

### 2.5 Bats

- **Acceptance Criteria:**
    - [ ] After the first 10 seconds of a run some obstacle groups are bats instead of pumpkins. A bat is a single-obstacle group flying above the ground at a height a ducking dinosaur can clear but a running dinosaur cannot.
    - [ ] A bat's hitbox is high enough that a crouching dinosaur passes under it with the current ducking rules (2.6), and low enough that a running dinosaur collides with it.
    - [ ] Both-kinds and gap guarantees for pumpkins from spec 001 still hold. Bats share the gap rule but do not count toward the small/large guarantee.

### 2.6 Ducking

- **Acceptance Criteria:**
    - [ ] Given the dinosaur is on the ground during a run, when the player presses ArrowDown, the dinosaur crouches for 30 ticks (0.5 s) and then returns to its running pose. Its hitbox shrinks vertically from the top during the crouch so that a bat flies over it.
    - [ ] Given the dinosaur is crouching, when the player presses SPACE or ArrowUp, the crouch cancels and a normal jump begins.
    - [ ] Given the dinosaur is airborne, when the player presses ArrowDown, nothing happens; the key does not fast-fall or interrupt the jump.
    - [ ] When the player presses ArrowDown anywhere in the game, the page does not scroll.

---

## 3. Out of scope (explicit)

- The witch's hat, candies, hearts and the "crash-softener" mechanic.
- Any spooky set-pieces at milestones.
- Audio of any kind.
- Changes to score, death, high score, or restart behaviour from spec 001.
