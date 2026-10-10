#!/usr/bin/env bash
# Store screenshots of the mock build on the emulator (1080x2400, Pixel 7), in light and dark, then the Maestro smoke
# flows. Run as one line from android-emulator-runner, which runs each script line in its own shell.
set -euo pipefail

PKG=codes.qrx.app
APK=android/app/build/outputs/apk/release/app-release.apk
OUT=shots/android
mkdir -p "$OUT"

adb wait-for-device
adb install -r "$APK"

# a clean status bar: 09:41, full battery, full signal, no notification icons
adb shell settings put global sysui_demo_allowed 1
demo() { adb shell am broadcast -a com.android.systemui.demo -e command "$@" > /dev/null; }
demo enter
demo clock -e hhmm 0941
demo battery -e level 100 -e plugged false
demo network -e wifi show -e level 4
demo network -e mobile show -e datatype none -e level 4
demo notifications -e visible false

link() { adb shell "am start -W -a android.intent.action.VIEW -d '$1' $PKG" > /dev/null; sleep "${2:-7}"; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; echo "captured $1"; }
launch() {
  adb shell am force-stop "$PKG"
  adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > /dev/null
  sleep 15
}

PROMPT='A%20paper%20boat%20drifting%20on%20a%20calm%20lake%20at%20dawn%2C%20watercolour'
DEST='harbourcafe.example%2Fmenu'

for mode in light dark; do
  if [ "$mode" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  launch
  link "$PKG://preview-sign-in"; shot "$mode-1-sign-in"
  link "$PKG://?prompt=$PROMPT&destination=$DEST&style=ae4c1"; shot "$mode-2-create"
  link "$PKG://code/n3wc0d"; shot "$mode-3-progress"
  link "$PKG://code/hv8551" 9; shot "$mode-4-result"
  link "$PKG://codes" 9; shot "$mode-5-my-codes"
  link "$PKG://account"; shot "$mode-6-account"
done
adb shell cmd uimode night no

# the size Play expects from this profile
python3 - "$OUT" <<'PY'
import struct, sys, pathlib
for p in sorted(pathlib.Path(sys.argv[1]).glob('*.png')):
    w, h = struct.unpack('>II', p.read_bytes()[16:24])
    print(p.name, w, h)
    assert (w, h) == (1080, 2400), f'{p.name} is {w}x{h}'
PY

launch
maestro test --format junit --output "$OUT/maestro-report.xml" .maestro
