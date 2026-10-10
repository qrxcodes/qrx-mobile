#!/usr/bin/env bash
# Store screenshots of the mock build: iPhone 6.9" (1320x2868) and iPad 13" (2064x2752), light and dark, then the
# Maestro smoke flows on the iPhone.
set -euo pipefail

APP="$1"
BUNDLE=codes.qrx.app
OUT="$PWD/shots/ios"
status=0
mkdir -p "$OUT"

runtime=$(xcrun simctl list runtimes -j | python3 -c 'import json,sys; r=[x for x in json.load(sys.stdin)["runtimes"] if x["platform"]=="iOS" and x["isAvailable"]]; r.sort(key=lambda x: [int(p) for p in x["version"].split(".")]); print(r[-1]["identifier"])')
# simctl lists device types in no useful order: take the highest-numbered model of each kind
pick() {
  xcrun simctl list devicetypes -j | python3 -c "
import json, re, sys
names = [d['name'] for d in json.load(sys.stdin)['devicetypes'] if re.fullmatch(sys.argv[1], d['name'])]
names.sort(key=lambda n: [int(x) for x in re.findall(r'\d+', n)] or [0])
print(names[-1])" "$1"
}
PHONE_TYPE=$(pick 'iPhone \d+ Pro Max')
PAD_TYPE=$(pick 'iPad Pro 13-inch \(M\d+\)')
echo "runtime $runtime; phone $PHONE_TYPE; pad $PAD_TYPE"

capture() {
  local label="$1" type="$2" want="$3"
  local udid
  udid=$(xcrun simctl create "qrx-$label" "$type" "$runtime")
  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" -b > /dev/null
  xcrun simctl status_bar "$udid" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
  xcrun simctl install "$udid" "$APP"
  xcrun simctl privacy "$udid" grant photos-add "$BUNDLE" || true
  # let first-boot banners (such as Apple Intelligence) come and go before any screenshot
  sleep 45

  for mode in light dark; do
    xcrun simctl ui "$udid" appearance "$mode"
    maestro --device "$udid" test -e MODE="$label-$mode" --test-output-dir "$OUT/run-$label-$mode" \
      --debug-output "$OUT/debug-$label-$mode" .maestro/screenshots/store.yaml || status=1
    find "$OUT/run-$label-$mode" -name "$label-$mode-*.png" -exec mv {} "$OUT/" \;
  done
  xcrun simctl ui "$udid" appearance light

  for f in "$OUT/$label"-*.png; do
    size=$(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/ {print $2}' | paste -sd x -)
    [ "$size" = "$want" ] || { echo "::error::$f is $size, expected $want"; exit 1; }
  done

  if [ "$label" = iphone ]; then
    xcrun simctl terminate "$udid" "$BUNDLE" 2> /dev/null || true
    maestro --device "$udid" test --format junit --output "$OUT/maestro-report.xml" --debug-output "$OUT/debug-smoke" .maestro || status=1
  fi
  xcrun simctl shutdown "$udid"
}

capture iphone "$PHONE_TYPE" 1320x2868
capture ipad "$PAD_TYPE" 2064x2752
exit $status
