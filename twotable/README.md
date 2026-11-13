# Two at the Table

Offline two-player classics for two people face to face over one unfolded iPhone Duo (works on any phone in landscape).
Player Red sits at the left edge, Blue at the right edge; text is rotated toward each player, the fold is the middle line.

- `web/` game (HTML5 canvas, no dependencies): Air Hockey, Four in a Row, Checkers, Dots & Boxes, Chess,
  Backgammon (planned: card games and table themes as paid add-ons). Wins per game are kept in localStorage.
- `ios/` SwiftUI + WKWebView shell (XcodeGen), bundle id `com.nyrathen.twotable`, landscape only.
- `tools/test.mjs` plays every game to the end (random legal moves, air hockey via mouse strikes): must print `games ok 6/6`.
- Build: commit message with `run:twotable-ios` -> `.github/workflows/twotable-ios.yml` (runner image `xcode-27`, so the
  app is built with the iOS 27.1 SDK and fills the Duo inner display) -> branch `twotable-ios-out/<run>`.
- iOS only.
