# Cheat guide app (working title "GTA 6 Cheats")

Fan-made, unofficial cheat list. iOS + Android from the same commit. Not submitted to any store.

- `web/` app (DE + EN). Name in `web/config.js`, `ios/project.yml` (CFBundleDisplayName), `android/.../values*/strings.xml`.
- `web/data.js` bundled list. The app fetches the live list from `contentUrl` (`https://play.nyrathen.com/cheats/cheats.json`, not deployed yet) and caches it, so new cheats need no app update.
- Only cheats confirmed in the released game go in, with `verified: true`. Unverified entries are hidden. No rumors, no codes from unreliable sites.
- Bundle id `com.nyrathen.cheatbook` (neutral, so a store-safe rename does not need a new id).
- Test: `node cheats/tools/test.mjs cheats/web [shotdir]`. Icon: `node cheats/tools/icon.mjs`.
- Build: commit message with `run:cheats-build` (`.github/workflows/cheats-build.yml`): iOS unsigned archive + simulator launch screenshot -> branch `cheats-ios-out/<run>`, Android unsigned APK/AAB -> workflow artifact.

Entry format:

```json
{ "id": "armor", "cat": "health", "verified": true,
  "name": { "de": "...", "en": "..." }, "effect": { "de": "...", "en": "..." },
  "input": { "ps5": ["R1", "x", "left"], "xbox": ["R1", "x", "left"], "phone": "1-999-..." } }
```

Keys: x o t s (PS face buttons, mapped to A B Y X on Xbox), L1 R1 L2 R2 L3 R3, up down left right. Categories: health weapons vehicles wanted world fun.

Store risk: "GTA" is a Rockstar Games / Take-Two trademark. Do not submit under that name.
