# Ghar Kharcha — Build the Android APK from your phone/browser (GitHub Actions)

No Android Studio, no laptop needed. GitHub builds the APK for you in the cloud and gives you a
downloadable file.

- **App name:** Ghar Kharcha
- **Package ID:** `com.gharkharcha.app`
- **Version:** 1.0.0 (versionCode 1)
- **Type:** real native Android app (Capacitor WebView container) — not a PWA shortcut, never opens Chrome.

Local build instructions (Android Studio) are in [`ANDROID_BUILD.md`](./ANDROID_BUILD.md).

---

## 1. Push this project to GitHub

In Lovable: open the **GitHub** button (top right) → **Connect to GitHub** → authorize → **Create
repository**. Your code is now on GitHub and stays in sync automatically.

Already have the repo? Every change you publish in Lovable pushes there by itself.

## 2. Open GitHub Actions

1. Open your repository on github.com (works fine in a mobile browser).
2. Tap the **Actions** tab.
3. If GitHub asks, tap **I understand my workflows, go ahead and enable them**.

## 3. Run the Android build workflow

1. In the left sidebar tap **Android Build (APK)**.
2. Tap **Run workflow** → keep the default branch → **Run workflow**.
3. The build takes roughly 5–10 minutes. Tap the running job to watch the logs.
4. A green check means the APK was built. A red X means it failed — open the failed step to see why.

The workflow also runs automatically on every push to `main`.

## 4. Download the APK

1. Open the finished workflow run.
2. Scroll to the bottom to **Artifacts**.
3. Tap **Ghar-Kharcha-release-apk** (recommended) or **Ghar-Kharcha-debug-apk** — GitHub
   downloads a `.zip`.
4. Open the zip with your phone's Files app and extract the `.apk`.

Every successful run produces three artifacts:

| Artifact | File | Notes |
| --- | --- | --- |
| `Ghar-Kharcha-release-apk` | `Ghar-Kharcha-release.apk` | **Always signed** and installable |
| `Ghar-Kharcha-debug-apk` | `Ghar-Kharcha-debug.apk` | For testing/debugging |
| `Ghar-Kharcha-release-aab` | `app-release.aab` | Upload this one to Google Play |

If you have not added signing secrets, the release APK is signed with a temporary keystore
generated during the build — installable on any phone, but **not** usable for Play Store
updates. Add the secrets below to sign with your own permanent key.

## 5. Install the APK on your Android phone

1. Open **Files** → your Downloads folder → tap `Ghar-Kharcha-debug.apk`.
2. Android will ask to allow installs from this app: tap **Settings** → enable
   **Allow from this source** → go back.
3. Tap **Install** → **Open**.

If Play Protect warns about an unknown developer, tap **Install anyway** — that is normal for
apps not yet published on the Play Store.

---

## Optional: signed release APK / Play Store

Create a keystore once (on any machine with Java):

```bash
keytool -genkey -v -keystore ghar-kharcha.keystore \
  -alias gharkharcha -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 ghar-kharcha.keystore > keystore.b64
```

Then in GitHub: **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | your store password |
| `ANDROID_KEY_ALIAS` | `gharkharcha` |
| `ANDROID_KEY_PASSWORD` | your key password |

Re-run the workflow — the release APK and the `.aab` are then signed with your permanent key and
uploaded as artifacts automatically. Local build details are in `ANDROID_BUILD.md`.

## Note

The APK has **not** been compiled here — Lovable has no Android SDK. The workflow above is what
actually produces it; only call a build successful after the GitHub Actions run shows a green
check and the artifact is present.
