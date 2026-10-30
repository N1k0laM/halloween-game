# Tasks: Halloween Edition

Six slices, in order. Each one keeps `npm test` green.

- [ ] **Slice 1: Pumpkins replace cacti.** Add pumpkin sprites and `PUMPKIN_COLOR`; make `obstacleSprite` return pumpkins for 'small'/'large'; renderer paints obstacles in the pumpkin colour. No gameplay change.
- [ ] **Slice 2: Night sky with moon and drifting clouds; darkening with survival.** New `features/night-sky.ts` installed from `main.ts`. Pure darkening function in the feature exposed for test. Unit test for monotonic darkening.
- [ ] **Slice 3: Dust puffs on jump and land.** New `features/dust-puffs.ts` subscribing to `jump` and `land`. Reset on `start`/`restart`. Unit test for puff lifecycle.
- [ ] **Slice 4: Bats as a new ObstacleKind.** Grow union; add bat sprite; `obstacleSprite` returns bat; spawner emits a single-bat group with probability `BAT_PROBABILITY` after `BAT_UNLOCK_TICK`. Unit test on spawn.
- [ ] **Slice 5: Ducking.** Grow `Intent` and `DinoPose`; wire ArrowDown through keyboard; `game.ts` tracks `duckUntil`; projectDino returns duck pose and lowered hitbox. Acceptance tests.
- [ ] **Slice 6: Verify.** Run full `npm test`, update spec acceptance checkboxes with evidence, mark Status Completed.
