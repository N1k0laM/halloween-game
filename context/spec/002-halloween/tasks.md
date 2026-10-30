# Tasks: Halloween Edition

Six slices, in order. Each one keeps `npm test` green.

- [x] **Slice 1: Pumpkins replace cacti.** Pumpkin bitmaps replace cactus bitmaps under the same sprite names; renderer paints obstacles in `PALETTE.pumpkin` via a new optional `color` parameter on `drawSprite`.
- [x] **Slice 2: Night sky with moon and drifting clouds; darkening with survival.** `src/features/night-sky.ts` installed from `main.ts`; pure `darkeningProgress` and `mixHex` helpers covered by `tests/night-sky.test.ts`.
- [x] **Slice 3: Dust puffs on jump and land.** `src/features/dust-puffs.ts` subscribes to `jump`/`land`, draws from the `foreground` layer, resets on `start`/`restart`; covered by `tests/dust-puffs.test.ts`.
- [ ] **Slice 4: Bats.** Not shipped in this iteration (Tier 2).
- [ ] **Slice 5: Ducking.** Not shipped in this iteration (Tier 2).
- [x] **Slice 6: Verify.** `npm test` is green (347/347); spec acceptance checkboxes updated with evidence; Status marked Tier 1 Completed.
