# Epochfall

Time-travel metroidvania set in a Filipino archipelago (concept: /mnt/project-files/metroidvania-konzept/concept-en.md).

Vertical slice (web build, HTML5 canvas, no dependencies):
- `web/` game (index.html, style.css, i18n.js EN/Filipino/DE, game.js)
- `tools/test.mjs` Playwright playthrough test: `node epochfall/tools/test.mjs epochfall/web [shotDir]`
- `tools/bundle.py` single-file bundle for the playable artifact

Slice content: zone Bagong Liwanag in PAST (900) and PRESENT (2087), 3 Anito shrines, 5 niches (hunter, swarm, flyer,
giant, scavenger) x 3 species (past / present / successor) plus 1 alternate successor (the scavenger successor depends
on whether the swarm niche lives), extinction after 10 past kills, Eskrimador skill tree (14 nodes incl. Ascension I),
Sarimanok Feather double jump, Kampilan Breaker wall, Tikbalang boss with learning stages 1-5
(per-fight dodge/air/ranged memory + stored memory across attempts).

MVP 1 round: giants (Kapre / Kapre Mech / Ugat Colossus, telegraphed ground pound) and scavengers (Taga-Punso /
Rustlings / Mirror Moles or Cinder Shrews, steal dropped materials and flee); 6 spirits (starter Diwata Wisp + the ghost
of each extinct past species, captured at the next Anito shrine, 1 active, passive + active effect); forge +0..+10
(+6% melee per level, 100% up to +5 then 90/80/70/60/50%, failure consumes materials but never downgrades, odds shown);
map grown upward by 40 rows (present-only rooftop district, past-only hidden Punso den behind a vine curtain, balete
canopy, 2 secret chests); era screen wipe, explored-tile map tab with optional HUD mini-map, explored tiles saved.
