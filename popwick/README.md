# Popwick

Pop-up book platformer made for iPhone Duo (Apple's foldable). Opening and closing the phone moves paper pop-ups:
bridges, walls, thorns and lifts each stand only inside their own hinge-angle window, shown as colored arcs on the dial.
The lantern Wick walks on his own; tap to jump. A closed phone shows the book cover.

- `web/` game (HTML5 canvas, no dependencies). `window.onHinge(deg, status)` is the native hinge feed; without it,
  drag up/down sets the angle.
- `ios/` SwiftUI + WKWebView shell (XcodeGen). `.onHingeChange` (iOS 27.1 SDK) feeds the hinge angle; compiled only
  with `DUO_HINGE` (set by CI on Xcode 27.1+).
- `tools/solve.mjs` plays all levels with a scripted hinge schedule (must print `solved N/N`).
- Build: commit message with `run:popwick-ios` -> `.github/workflows/popwick-ios.yml` -> branch `popwick-ios-out/<run>`.
- Bundle id `com.nyrathen.popwick`. iOS only.
