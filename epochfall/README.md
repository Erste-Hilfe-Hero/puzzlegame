# Epochfall

Time-travel metroidvania set in a Filipino archipelago (concept: /mnt/project-files/metroidvania-konzept/concept-en.md).

Vertical slice (web build, HTML5 canvas, no dependencies):
- `web/` game (index.html, style.css, i18n.js EN/Filipino/DE, game.js)
- `tools/test.mjs` Playwright playthrough test: `node epochfall/tools/test.mjs epochfall/web [shotDir]`
- `tools/bundle.py` single-file bundle for the playable artifact

Slice content: zone Bagong Liwanag in PAST (900) and PRESENT (2087), 3 Anito shrines, 3 niches x 3 species
(past / present / successor), extinction after 10 past kills, Eskrimador skill tree (14 nodes incl. Ascension I),
Sarimanok Feather double jump, Kampilan Breaker wall, Tikbalang boss with learning stages 1-5
(per-fight dodge/air/ranged memory + stored memory across attempts).
