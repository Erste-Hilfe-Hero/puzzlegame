# Käse legen

Pickup lines, chat openers and conversation starters (German first, English second). iOS only.

- `web/` app (HTML/JS, no deps). `lines.js` = content + generator templates.
- `ios/` WKWebView shell (XcodeGen), StoreKit 2 non-consumable `com.nyrathen.kaeselegen.pro`.
- Test: `node kaese/tools/test.mjs kaese/web [shotdir]`
- iOS build: commit message with `run:kaese-ios` -> unsigned app on branch `kaese-ios-out/<run>`; signing/upload on Contabo.
