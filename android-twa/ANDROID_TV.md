# 📺 Cinevo → Android (TV) App — Full Runbook

This is the complete, step-by-step process for packaging the Cinevo PWA as an
Android / Android-TV app using **Bubblewrap** (a Trusted Web Activity wrapper),
signing it, publishing the Digital Asset Links, and building + testing the APK.

Commands are **Windows PowerShell** (the project's dev environment). All
Android files live in **`android-twa/`** — `cd` there before any `bubblewrap`/Gradle command.

Project facts used throughout:

| Thing | Value |
| --- | --- |
| Web app (must be deployed, HTTPS) | `https://cinevo.k79.space` |
| Web manifest URL | `https://cinevo.k79.space/manifest.webmanifest` |
| Android applicationId / package | `space.k79.cinevo.twa` |
| Launcher component | `space.k79.cinevo.twa/space.k79.cinevo.twa.LauncherActivity` |
| Keystore | `android-twa/android.keystore` (alias `android`) |
| Asset links served at | `https://cinevo.k79.space/.well-known/assetlinks.json` |

---

## 0. How it works (30-second mental model)

A TWA is a thin Android app that opens your **live website** full-screen in the
user's Chrome (no browser UI) — *if* Chrome can verify the app and the site
share an owner. That proof is the **Digital Asset Links** check: the app's
**signing-key SHA-256 fingerprint** must appear in
`https://<your-domain>/.well-known/assetlinks.json`. No fingerprint match → the
app still runs, but inside a Custom Tab with a URL bar + a
"Digital asset links verification failed" chip.

So the three things that must agree: **package name**, **signing key fingerprint**,
and the **assetlinks.json on the live site**.

---

## 1. Prerequisites

- **Node.js 18+** (already have it — this is a Next.js project).
- **JDK 17+** — Bubblewrap downloads its own to `~/.bubblewrap/jdk/...`; Android Studio also bundles one at `…\Android Studio\jbr`.
- **Android Studio** (for the SDK + `adb` + the TV emulator). SDK installs at `%LOCALAPPDATA%\Android\Sdk`.
- The site **deployed over HTTPS** (TWA can't wrap `localhost`).

Make `adb` easy to call (optional — add to PATH or use the full path):
```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
adb version
```

---

## 2. Install Bubblewrap & check the toolchain

```powershell
npm i -g @bubblewrap/cli
bubblewrap doctor      # verifies JDK + Android SDK; follow any fix it prints
```
If `doctor` complains about the SDK/JDK path, point it at:
- SDK: `%LOCALAPPDATA%\Android\Sdk`
- JDK: `C:\Program Files\Android\Android Studio\jbr` (or the `~/.bubblewrap/jdk/...` one)

---

## 3. Initialise the TWA project

> ⚠️ `--manifest` takes the **URL of the live Web App Manifest**, *not* a local
> file. (`bubblewrap init --manifest ./twa-manifest.json` → "Invalid URL".)

```powershell
cd android-twa            # do this from the folder that should hold the project
bubblewrap init --manifest https://cinevo.k79.space/manifest.webmanifest
```

Answer the prompts with these values:

| Prompt | Value |
| --- | --- |
| Domain | `cinevo.k79.space` |
| Application ID | `space.k79.cinevo.twa` |
| App name / Launcher name | `Cinevo` |
| Display mode | `standalone` |
| Orientation | `landscape-primary` *(good for TV)* |
| Theme / background colour | `#0A0A0A` |
| Start URL | `/` |
| Include support for Push? | `yes` (optional) |
| Signing key | **Create new** → it generates `android.keystore` |
| Key alias | `android` |
| Key/store passwords | **set them and SAVE them** (needed for every build) |

This produces the Android project + `twa-manifest.json` (the saved config that
future builds reuse).

> Already initialised in this repo — you only re-run `init` if you wipe the project.

---

## 4. Project layout (`android-twa/`)

```
android-twa/
├─ twa-manifest.json          # Bubblewrap config (signingKey.path = ./android.keystore)
├─ app/
│  ├─ src/main/AndroidManifest.xml   # ← the leanback (TV) edits live here
│  ├─ src/main/java/space/k79/cinevo/twa/*.java
│  └─ src/main/res/                  # icons, splash, colors, strings
├─ build.gradle  settings.gradle  gradle.properties
├─ gradle/  gradlew  gradlew.bat     # Gradle wrapper
├─ store_icon.png  manifest-checksum.txt
├─ android.keystore           # 🔐 signing key — gitignored, back it up privately
└─ (.gradle/, app/build/, *.apk, *.idsig → build output, gitignored)
```

---

## 5. Make it an **Android TV** (leanback) app

Bubblewrap targets phones by default. Edit `android-twa/app/src/main/AndroidManifest.xml`:

**a) Declare TV support** — right after the opening `<manifest …>` tag:
```xml
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.software.leanback" android:required="false" />
```

**b) Add a TV banner** — on the `<application …>` tag:
```xml
android:banner="@mipmap/ic_launcher"
```
*(Replace with a real 320×180 `res/drawable/banner.png` for a proper Apps-row banner.)*

**c) Add the leanback launcher category** — inside the MAIN `<intent-filter>` of `LauncherActivity`:
```xml
<intent-filter>
  <action android:name="android.intent.action.MAIN" />
  <category android:name="android.intent.category.LAUNCHER" />
  <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
</intent-filter>
```

> These are **already applied** in this repo. ⚠️ `bubblewrap update` regenerates
> this file from `twa-manifest.json` and will wipe these edits — re-apply them if you run it.

---

## 6. Get the signing-key SHA-256 fingerprint

`bubblewrap fingerprint list` only shows fingerprints stored in the manifest (empty by default) — it does **not** read the keystore. Use **keytool** instead.

`keytool` isn't on PATH; it lives in the JDK. Find it:
```powershell
Get-ChildItem "$env:USERPROFILE\.bubblewrap","C:\Program Files\Android" -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue | Select FullName
```
Then run it against the keystore (enter the keystore password when prompted):
```powershell
& "C:\Users\<you>\.bubblewrap\jdk\jdk-17.0.11+9\bin\keytool.exe" `
  -list -v -keystore android.keystore -alias android
```
Copy the **SHA256** line, e.g.:
```
SHA256: F3:5B:EA:7C:A1:AB:46:C9:20:79:B1:BB:42:8E:4A:CB:5A:89:D8:50:46:CE:60:F3:18:87:D0:B9:DF:4B:A9:46
```

> If you publish via **Google Play App Signing**, Google re-signs the app — use the
> **Play-managed** SHA-256 (Play Console → Setup → App integrity → App signing key),
> not the upload key. For sideloading, the keystore fingerprint above is correct.

---

## 7. Publish the Digital Asset Links

The repo serves the file from `public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "space.k79.cinevo.twa",
      "sha256_cert_fingerprints": [
        "F3:5B:EA:7C:A1:AB:46:C9:20:79:B1:BB:42:8E:4A:CB:5A:89:D8:50:46:CE:60:F3:18:87:D0:B9:DF:4B:A9:46"
      ]
    }
  }
]
```
- `package_name` **must** equal the applicationId (`space.k79.cinevo.twa`).
- The array can hold **multiple** fingerprints (e.g. local key + Play key).

**Deploy**, then verify it's actually live:
```
https://cinevo.k79.space/.well-known/assetlinks.json
```
You must see the JSON with the fingerprint. Validate with Google's tester:
`https://developers.google.com/digital-asset-links/tools/generator`

---

## 8. Build the APK

```powershell
cd android-twa
bubblewrap build          # signs with android.keystore → app-release-signed.apk (+ .aab)
#   ↑ enter the keystore + key passwords when prompted
# (equivalent: ./gradlew assembleRelease)
```
Output: `android-twa/app-release-signed.apk` (and `app-release-bundle.aab` for Play).

---

## 9. Set up a test target

### Option A — Android TV emulator (Android Studio)
1. **SDK Manager** → ensure a recent SDK Platform + **Platform-Tools** are installed.
2. **Virtual Device Manager → Create Device → TV → "Television (1080p)"** → pick an **x86_64** system image (download it) → Finish → ▶ boot.
3. Navigate the emulator with **keyboard arrows + Enter**, **Esc = Back**, or the **⋯ → Directional pad**.

**If the emulator hangs / is unusably slow:**
- Use an **x86_64** image (never ARM on a PC).
- Enable acceleration — Windows Features → tick **Windows Hypervisor Platform** + **Virtual Machine Platform** → reboot. Check: `& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -accel-check`.
- Edit AVD → Advanced: RAM **2048+**, Graphics **Hardware - GLES**, Multi-Core CPU. Then **Cold Boot Now**, wait 2–5 min; **Wipe Data** if wedged.
- Ensure VT-x/AMD-V is enabled in BIOS.

### Option B — Phone emulator (e.g. MuMu Player)
Works for verifying the TWA/asset-links, but it's a **phone**, not TV — the leanback launcher/remote behaviour won't show. Fine for a quick "does it open fullscreen" check.

### Option C — Real Android TV / Google TV (recommended)
Enable **Developer options → ADB debugging** on the TV, then:
```powershell
adb connect <tv-ip>:5555
```

---

## 10. Install & launch

```powershell
# emulator/device must be visible:
adb devices

adb install android-twa\app-release-signed.apk

# launch directly (more reliable than hunting the Apps row):
adb shell am start -n "space.k79.cinevo.twa/space.k79.cinevo.twa.LauncherActivity"
```
On a TV it also appears in the **Apps** row as "Cinevo". Drive it with the D-pad:
arrow keys move the red focus ring (nav → hero buttons → home carousel cards),
**Enter** opens a title, **Back** returns / closes overlays.

---

## 11. Confirm full-screen (re-verification)

Chrome only re-checks asset links on **install**. After the assetlinks file is
live, reinstall to clear the URL bar / verification chip:
```powershell
adb uninstall space.k79.cinevo.twa
adb install android-twa\app-release-signed.apk
```
If it still shows the chip: the device must be online, and
`https://cinevo.k79.space/.well-known/assetlinks.json` must return the JSON
(no 404, `Content-Type: application/json`).

---

## 12. Shipping a new version

1. Bump versions in `twa-manifest.json` (`appVersion`/`appVersionName` + `appVersionCode`).
2. `cd android-twa && bubblewrap build` — **sign with the SAME `android.keystore`** (a different key changes the fingerprint and breaks verification until you add the new one to assetlinks).
3. Reinstall / upload the new APK/AAB.

The website itself updates independently — a normal Vercel deploy of the Next.js
app instantly changes what the installed TWA shows; you only rebuild the APK to
change the wrapper (icons, version, package config).

---

## 13. Commit vs. don't-commit

**✅ Commit:** `android-twa/twa-manifest.json`, `app/` source, `*.gradle`, `gradle/` wrapper, `gradlew*`, `store_icon.png`, `manifest-checksum.txt`, and `public/.well-known/assetlinks.json`.

**🚫 Never commit** (already in `.gitignore`): `android.keystore` / `*.keystore` / `*.jks` (🔐 back up privately — losing it = can't update the app), `.gradle/`, `app/build/`, `*.apk`, `*.aab`, `*.idsig`, `local.properties`.

---

## 14. Troubleshooting quick reference

| Symptom | Cause / fix |
| --- | --- |
| `bubblewrap init … "Invalid URL"` | `--manifest` needs the **web manifest URL**, not a local file. Use `https://cinevo.k79.space/manifest.webmanifest`. |
| `bubblewrap fingerprint list` prints nothing | It reads the manifest's `fingerprints` array (empty), not the keystore. Use **keytool** (§6). |
| `keytool: not recognized` | Not on PATH — call it from the JDK (`~/.bubblewrap/jdk/.../bin/keytool.exe`). |
| "Digital asset links verification failed" chip + URL bar | assetlinks not live / wrong `package_name` / wrong fingerprint. Fix §7, redeploy, **reinstall**. |
| App not in TV Apps row | Missing `LEANBACK_LAUNCHER` category (§5) — or launch directly with `adb shell am start …`. |
| Emulator hangs | No hardware acceleration / ARM image — see §9 Option A. |
| `adb` not recognized | Add `…\Android\Sdk\platform-tools` to PATH. |
