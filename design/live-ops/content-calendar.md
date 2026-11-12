# Live-ops content calendar (plan E31)

Source of truth for dates: `XL.events` and `XL.seasons` in `web/x-live.js`. Dates are local time, end is exclusive.
Rule: every event is fully tested 4 weeks before start with the test-build parameter `?now=YYYY-MM-DD` (E24).

| Event / season | id | Start | End | Test done by | Notes |
|---|---|---|---|---|---|
| Season 1 Cherry Blossom (Hana) | s1 | 2026-11-02 | 2026-12-14 | 2026-10-05 | see seasons/s1.md |
| Island Cook Fest (autumn) | kochfest-2026-11 | 2026-11-10 | 2026-11-17 | 2026-10-13 | collect event, 10 tiers, 7 daily stages |
| Season 2 Harbor Fest (Rosie) | s2 | 2026-12-14 | 2027-01-25 | 2026-11-16 | see seasons/s2.md |
| Winter Fest | winterfest-2026-12 | 2026-12-18 | 2026-12-25 | 2026-11-20 | collect event, cookie theme |
| Anniversary | - | 2027-01 (TBD) | - | 4 weeks before | needs date from product owner |
| Easter Fest | osterfest-2027-03 | 2027-03-22 | 2027-03-29 | 2027-02-22 | collect event, egg theme |
| Summer Fest | - | 2027-07 (TBD) | - | 4 weeks before | not yet in data |
| Halloween | - | 2027-10-25 (TBD) | - | 4 weeks before | not yet in data |

## Collect event rules (E26, E28)
- Each delivery gives `markBase + sum of item levels` tokens, capped at `cap` (60) per local day.
- 10 reward tiers up to 260 tokens: with the cap the last tier is reachable on day 5 at the earliest.
- 7 daily stages: stage d unlocks on event day d and needs d x 20 tokens.
- At the end unclaimed reached tiers are credited and tokens above 260 become coins (2 each).
- Kill switch (E32): set `disabled: true`; all tokens become coins and a one-time thank-you chest is given.
- Event button shows only from level 3 and finished tutorial (E33), remaining time as "noch 2 T 5 Std", no red countdown (E34).
