# Sound effects

Drop these six files in here — filenames only matter, no code change needed:

- `tick.mp3` — used silently at zero volume to unlock mobile audio playback on first tap
- `correct.mp3` — a team/student answers correctly (per-question, non-final)
- `incorrect.mp3` — a team/student answers incorrectly (per-question, non-final)
- `drumroll.mp3` — the suspense beat before the final question's reveal
- `winner.mp3` — the winner-declaration burst (confetti moment)
- `tier-up.mp3` — a student crosses a tier boundary (quieter, personal moment, not the quiz winner burst)

Until real files are added, playback fails silently (see `lib/jules/sound.ts`) — nothing breaks, there's just no sound yet.
