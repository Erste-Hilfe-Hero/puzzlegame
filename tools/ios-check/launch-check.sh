#!/bin/bash
# Launches the EXACT built device app (unsigned .app or .zip) in the iOS simulator and proves it shows real content.
# The arm64 device binaries are re-tagged as iOS-simulator binaries (vtool) and ad-hoc signed; nothing is rebuilt.
# Usage: launch-check.sh <App.app|App.zip|app.tar.gz> <outdir> [taps]   taps = "x,y x,y" in points (optional)
# Exit 1 when the app does not start or the screen stays blank (one colour).
set -uo pipefail
SRC=$1; OUT=$2; TAPS=${3:-}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
W=$(mktemp -d)
case "$SRC" in
  *.zip) ditto -x -k "$SRC" "$W" ;;
  *.tar.gz|*.tgz) tar -xzf "$SRC" -C "$W" ;;
  *) cp -R "$SRC" "$W/" ;;
esac
APP=$(find "$W" -maxdepth 3 -name '*.app' -type d | head -1)
[ -n "$APP" ] || { echo "FAIL no .app in $SRC" | tee "$OUT/summary.txt"; exit 1; }
BID=$(plutil -extract CFBundleIdentifier raw "$APP/Info.plist")
VER="$(plutil -extract CFBundleShortVersionString raw "$APP/Info.plist") ($(plutil -extract CFBundleVersion raw "$APP/Info.plist"))"
EXE=$(plutil -extract CFBundleExecutable raw "$APP/Info.plist")
echo "app $(basename "$APP") $BID $VER" | tee "$OUT/summary.txt"
# web wrappers: the bundle must carry web/index.html (www/ was the blank-screen bug)
if [ -d "$APP/web" ] || [ -d "$APP/www" ]; then
  if [ -f "$APP/web/index.html" ]; then echo "web bundle: web/index.html present" | tee -a "$OUT/summary.txt"
  else echo "FAIL web bundle: web/index.html missing" | tee -a "$OUT/summary.txt"; exit 1; fi
fi
# re-tag every Mach-O for the simulator
SDK=$(xcrun --sdk iphonesimulator --show-sdk-version)
find "$APP" -type f | while read -r f; do
  if file "$f" | grep -q 'Mach-O'; then
    xcrun vtool -arch arm64 -set-build-version 7 15.0 "$SDK" -replace -output "$f.sim" "$f" 2>>"$OUT/vtool.log" && mv "$f.sim" "$f" || echo "vtool failed $f" >> "$OUT/vtool.log"
  fi
done
find "$APP" -name _CodeSignature -type d -prune -exec rm -rf {} +
rm -f "$APP/embedded.mobileprovision"
find "$APP" \( -name '*.framework' -o -name '*.dylib' \) -prune | while read -r f; do codesign -f -s - "$f" >/dev/null 2>&1; done
codesign -f -s - "$APP" 2>&1 | tail -2
DEV=$(xcrun simctl list devices available -j | python3 -c 'import json,sys;d=json.load(sys.stdin)["devices"];c=[x["udid"] for k,v in sorted(d.items()) if "iOS" in k for x in v if x["name"].startswith("iPhone 16 Pro") or x["name"].startswith("iPhone 17 Pro")];a=[x["udid"] for k,v in sorted(d.items()) if "iOS" in k for x in v if x["name"].startswith("iPhone")];print((c or a)[-1])')
xcrun simctl boot "$DEV" 2>/dev/null; xcrun simctl bootstatus "$DEV" -b >/dev/null
xcrun simctl uninstall "$DEV" "$BID" 2>/dev/null
xcrun simctl install "$DEV" "$APP" || { echo "FAIL install" | tee -a "$OUT/summary.txt"; exit 1; }
xcrun simctl spawn "$DEV" log stream --style compact --predicate "process == \"$EXE\" OR subsystem == \"com.apple.WebKit\"" > "$OUT/device.log" 2>&1 &
LOGPID=$!
PID=$(xcrun simctl launch "$DEV" "$BID" 2>&1 | tail -1)
echo "launch: $PID" | tee -a "$OUT/summary.txt"
sleep 20
shot() { xcrun simctl io "$DEV" screenshot "$OUT/$1.png" >/dev/null 2>&1; python3 "$HERE/blank.py" "$OUT/$1.png" | tee -a "$OUT/summary.txt"; }
shot 01-start
RES=$(tail -1 "$OUT/summary.txt")
alive() { xcrun simctl spawn "$DEV" launchctl list 2>/dev/null | grep -q "UIKitApplication:$BID"; }
alive && echo "process alive after 20 s" | tee -a "$OUT/summary.txt" || { echo "FAIL app process gone (crash)" | tee -a "$OUT/summary.txt"; RES="BLANK"; }
if [ -n "$TAPS" ] && command -v idb >/dev/null; then
  idb connect "$DEV" >/dev/null 2>&1
  i=2
  for t in $TAPS; do
    idb ui tap --udid "$DEV" "${t%,*}" "${t#*,}" >/dev/null 2>&1; sleep 6
    shot "0$i-tap"; i=$((i+1))
  done
  idb ui describe-all --udid "$DEV" > "$OUT/ui-tree.json" 2>/dev/null
fi
alive || echo "FAIL app process gone at the end" | tee -a "$OUT/summary.txt"
kill $LOGPID 2>/dev/null
xcrun simctl terminate "$DEV" "$BID" 2>/dev/null
xcrun simctl shutdown "$DEV" 2>/dev/null
grep -q '^FAIL\|BLANK' "$OUT/summary.txt" && { echo "RESULT FAIL" | tee -a "$OUT/summary.txt"; exit 1; }
echo "RESULT OK" | tee -a "$OUT/summary.txt"
