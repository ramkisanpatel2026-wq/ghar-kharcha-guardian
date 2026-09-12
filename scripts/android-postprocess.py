"""Post-process the generated Android project before building the APK.

Runs in CI after `npx cap sync android`:
  * forces the app display name to "Ghar Kharcha Manager"
  * strips every Android permission except INTERNET
"""

import re
import sys

APP_NAME = "Ghar Kharcha Manager"
STRINGS = "android/app/src/main/res/values/strings.xml"
MANIFEST = "android/app/src/main/AndroidManifest.xml"


def set_app_name() -> None:
    xml = open(STRINGS, encoding="utf-8").read()
    for key in ("app_name", "title_activity_main"):
        xml = re.sub(
            rf'(<string name="{key}">).*?(</string>)',
            rf"\g<1>{APP_NAME}\g<2>",
            xml,
            flags=re.S,
        )
    open(STRINGS, "w", encoding="utf-8").write(xml)
    print(xml)


def only_internet_permission() -> None:
    xml = open(MANIFEST, encoding="utf-8").read()
    xml = re.sub(r"\s*<uses-permission\b[^>]*/>", "", xml)
    xml = xml.replace(
        "</manifest>",
        '\n    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>',
    )
    open(MANIFEST, "w", encoding="utf-8").write(xml)
    print(xml)


if __name__ == "__main__":
    set_app_name()
    only_internet_permission()
    sys.exit(0)
