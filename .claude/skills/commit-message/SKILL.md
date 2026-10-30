---
name: commit-message
description: Writes a Conventional Commit message for the staged changes, matching this repo's style.
---

Read `git diff --staged` and `git log -5 --pretty=format:"%s"` to match tone.
Write a single subject line, under 60 characters, lowercase, no trailing period.
Start with a Conventional Commit prefix (`feat:`, `fix:`, `refactor:`, `test:`,
`docs:`, `chore:`) picked from the diff — not the file names.
Say what changed and why in that one line; skip the body unless the user asks.
If the diff is empty, say so and stop instead of inventing a message.
