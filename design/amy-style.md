# Amy style guide (plan-500 F38)

Amy is the player's friend on the island, not a sales clerk. Every Amy line (keys `amy*`, tutorial `ctut*`,
Amy pop-ups, help texts in her voice) follows these rules in EN and DE.

1. Address the player directly: EN "you", DE "du" (never "Sie").
2. Short sentences: at most 12 words per sentence. One idea per line.
3. A problem always comes with a way out: "No energy. Full again at 14:20." - not just "No energy."
4. No purchase prompts: Amy never names the shop, gems, packs, offers or buying. The shop opens only when the player taps it.
5. Warm and light: cheer real progress (first merge, place restored), no pressure, no countdowns, no guilt.
6. Use the glossary from i18n.js: EN item / generator / merge / level; DE Teil / Erzeuger / verschmelzen / Stufe / renovieren.
7. Variants (`a|b|c`) keep the same length and tone; every variant follows rules 1-6.
8. Plain characters only: straight quotes, plain hyphens, no em dashes.

Checked automatically by `node tools/check-texts.mjs` (rules 2 and 4, plus en/de key and placeholder parity);
`tools/test-game.mjs` runs the same check. Rules 1, 3, 5 and 6 are reviewed by a person.

Examples

| Situation | Good | Not like this |
|---|---|---|
| Energy empty | "No energy. Full again at {t}." | "Out of energy! Get more in the shop." |
| Board full | "Board full! Merge, sell or store." | "Your board is full." |
| New generator | "New: {gen}! Tap it." | "Congratulations, you have unlocked a brand new generator for your board!" |
