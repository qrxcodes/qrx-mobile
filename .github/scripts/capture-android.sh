#!/usr/bin/env bash
# Store screenshots of the mock build on the emulator (1080x2400, Pixel 7), in light and dark, then the Maestro smoke
# flows. Run as one line from android-emulator-runner, which runs each script line in its own shell.
set -euo pipefail

PKG=codes.qrx.app
APK=android/app/build/outputs/apk/release/app-release.apk
OUT="$PWD/shots/android"
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

status=0
for mode in light dark; do
  if [ "$mode" = dark ]; then adb shell cmd uimode night yes; else adb shell cmd uimode night no; fi
  maestro test -e OUT="$OUT" -e MODE="$mode" --debug-output "$OUT/debug-$mode" .maestro/screenshots/store.yaml || status=1
done
adb shell cmd uimode night no

# the size Play expects from this profile
python3 - "$OUT" << 'PY'
import struct, sys, pathlib
for p in sorted(pathlib.Path(sys.argv[1]).glob('*.png')):
    w, h = struct.unpack('>II', p.read_bytes()[16:24])
    print(p.name, w, h)
    assert (w, h) == (1080, 2400), f'{p.name} is {w}x{h}'
PY

maestro test --format junit --output "$OUT/maestro-report.xml" --debug-output "$OUT/debug-smoke" .maestro || status=1
exit $status
