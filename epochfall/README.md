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

Round 3:
- Class pick after "New game": Eskrimador (unchanged tree) or Babaylan (staff combo at 9 instead of 12 base damage, skill
  button = channelled spirit orb 12 energy / 14..38 damage, summon button B/U or the touch button = the active spirit strikes
  the nearest foe, 20 energy). Babaylan tree: 14 nodes (Anito, Diwata, Rites + Ascension I). Saves store `cls`; old saves load
  as Eskrimador.
- Ascension I: permanent glowing markings + aura, 2.4 s cut-in.
- Customization (pick screen and the Hero menu tab): skin 5, hair style 4, hair colour 5, scarf/sash accent 6; saved in `look`.
- Summon tab: Tala from kills (1, giants 3), chests 30, boss 120, daily gift 100. 1x = 100, 10x = 1000.
  R 79.4 / SR 18 / SSR 2.4 / UR 0.2 %, +6 % SSR chance per pull from pull 70, SSR or better guaranteed at 90, pity counter,
  Odds table with every item. 14 prizes: scarf patterns, weapon skins, auras, titles, Minokawa (SSR spirit, +10 % attack
  speed, homing feathers) and Bakunawa Hatchling (UR spirit, +15 % damage, energy on kill). Duplicates give Stardust.
  RNG is injectable with `EF.rng(fn)`.
- Hell Mode: unlocked once the normal save beat the Tikbalang or reached level 10; own save slot (`epochfall.hell.v1`)
  and character; enemies +60 % HP and damage; boss starts at stage 3; one life, death deletes the hell save and adds
  name, level and time to the Fallen list on the title screen. The account (`epochfall.account.v1`: Tala, Stardust, pity,
  cosmetics, summoned spirits) is shared and never lost.

## Native shells (iOS + Android)

Both wrap the same `web/` folder (single source of truth), landscape only, full-screen. In-app purchases exist on iOS only
(owner decision); the Android shell has no billing.
Bundle id / applicationId `com.nyrathen.epochfall`, version 0.1.0 (build number = CI run number).

- `ios/`: XcodeGen project (`project.yml`), SwiftUI + WKWebView (`App/WebView.swift`). `web/` is bundled as a
  folder reference, so it lands at `Epochfall.app/web/index.html`; the Swift code loads `web/` (falls back to `www/`).
  Status bar hidden, home indicator auto-hidden, no scroll/bounce, full-bleed (the page uses `env(safe-area-inset-*)`).
- `android/`: Gradle WebView app (AGP 8.7.3, Gradle 8.14.3, JDK 17, min/target SDK 24/35). `copyWeb` copies
  `../web` into `assets/web/` at build time. `sensorLandscape`, immersive (system bars hidden). The back button
  dispatches Escape (opens/closes the in-game menu) while playing, otherwise sends the app to the background.

Builds (push to `main` or `claude/project-thread-m6sbdk` touching `epochfall/**`, or run the workflow manually):

- iOS: put `run:epochfall-ios` in the commit message. `.github/workflows/epochfall-ios.yml` runs the Playwright
  playthrough test, then archives unsigned on `macos-15` and pushes `Epochfall-unsigned.zip` + `build-info.txt`
  to branch `epochfall-ios-out/<run>`. Signing and upload happen on the signing host.
- Android: put `run:epochfall-android` in the commit message. `.github/workflows/epochfall-android.yml` builds a
  debug APK and an unsigned release AAB on `ubuntu-latest` and uploads them as artifact `epochfall-android-<run>`.

Local: `cd epochfall/ios && xcodegen generate` (macOS); `cd epochfall/android && gradle assembleDebug` (needs an Android SDK).
App icon: generated with PIL (navy, jade crescent moon, magenta blade); 1024 px in `ios/App/Assets.xcassets`,
adaptive foreground + legacy mipmaps in `android/app/src/main/res`.

## Tala shop (iOS in-app purchases, StoreKit 2)

- Products: `store/iap-products.json` (ids, types, USD prices, Tala, reference/display names and descriptions in en, fil, de for
  the App Store Connect setup). Six consumable Tala packs (60 / 330 / 1090 / 2240 / 3880 / 8080 Tala for 0.99 to 99.99 USD),
  the one-time Starter Pack (non-consumable, 300 Tala + the shop-only SR scarf pattern Tala Starweave) and the consumable
  30-day Moon Pass (300 Tala now, then 90 Tala once per calendar day on login, `ACC.moon = {until, last}`; buying it again
  while active adds 30 days). Local testing: `ios/Epochfall.storekit`, set as the Run StoreKit configuration of the scheme.
- `web/shop.js` (loaded after game.js, hooks via `EF.host`): a Shop button in the Summon tab opens the shop view; there are
  no purchase pop-ups, badges or reminders anywhere else. The Summon tab says that it contains random items and that the odds are shown.
- Bridge: web -> native `webkit.messageHandlers.ef.postMessage({type: 'products' | 'buy' | 'restore' | 'ack', id})`;
  native -> web `EFShop.onProducts([{id, price}])`, `onPurchased(id, txId)`, `onFailed(id, reason)`, `onRestored([{id, txId}])`,
  `onStorefront(countryCode)`. Tala are granted only after native reports a verified transaction, once per transaction id
  (`ACC.iapTx`); the page then acks and native finishes the transaction (unfinished ones are re-sent on the next start,
  `Transaction.updates` covers interrupted purchases). Restore purchases (`AppStore.sync` + `Transaction.currentEntitlements`)
  brings back the Starter Pack cosmetic, not its Tala.
- Storefront BEL or NLD: paid purchases are disabled (web and native); free Tala still work. Tala cannot be traded or cashed out.
- In a normal browser (no native bridge) every pack shows "Available in the iOS app" and buying is disabled.
