# Playtest first 10 minutes (plan-500 F50)

Status 2026-11-12: protocol ready, human sessions NOT run yet (needs 5 new testers per language).

## Protocol (per tester)
1. Fresh install, language EN or DE, phone at 360-412 px width. No help from the observer.
2. Observer notes time of: first spawn, first merge, first delivery, first renovation (Sweep the terrace), level 2, level 3, first empty energy.
3. Note every hang longer than 10 s (tester does not know what to do), every misread text, every tap on the shop.
4. After 10 minutes: 3 questions - What is the goal? What did you not understand? Would you play again tomorrow?

Targets: 100 % first delivery, 80 % first renovation, 0 hangs.

## Bot proxy (tools/sim-economy.mjs, real game.js, 10 seeds, 1 tap per 3 s)
First delivery 10/10, first task 10/10, hangs 0/10; level 2 at about 3:40, level 3 at about 8:50, energy never empty.
The bot does not read texts, so it says nothing about clarity; it only shows the flow has no dead end.

## Browser smoke (tools/smoke-core.cjs, Chromium 360x640, DE)
Intro, welcome, tutorial steps 0-4, first task with before/after picture: no page errors. Board ready about 230 ms
on a desktop CPU (F42; mid-range Android not measured). Finding: merging by drag does not complete in the headless
run (also on the previous commit); tap-tap merge works. The drag path goes through the x-design drop wrapper (glide).
Screenshots: production/qa/evidence/core-*.png.
