# 📺 Cinevo on Android TV

Cinevo is a PWA that's been made **D-pad navigable** with [Norigin spatial navigation](https://github.com/NoriginMedia/Norigin-Spatial-Navigation). That means it already works with a TV remote in the Android TV browser or any WebView wrapper. This guide packages it as an installable **Android TV app** via a Trusted Web Activity (TWA).

> Prerequisites: a **deployed HTTPS site** (TWA can't wrap localhost), **Node 18+**, the **Android SDK** (Android Studio), and a TV device or the **Android TV emulator**.

---

## 1. Remote navigation (already built into the web app)

- **Arrow keys** move focus spatially; focused elements show a red ring (`.tv-focused`).
- **Enter / OK** activates the focused link/button.
- **Back** closes an open overlay (trailer, search, menu) or goes back in history — see `SpatialNavProvider`.
- Init + back handling live in [`src/components/tv/SpatialNavProvider.tsx`](../src/components/tv/SpatialNavProvider.tsx); reusable focusable widgets in [`src/components/tv/Focusable.tsx`](../src/components/tv/Focusable.tsx).

Test it first in a desktop browser: load the site and navigate using only the **arrow keys + Enter** (no mouse).

---

## 2. Build the TWA APK

The generated Android project lives in **`android-twa/`** — build from there:

```bash
npm i -g @bubblewrap/cli
cd android-twa            # all TWA/Gradle files + the signing keystore live here

# (Already initialised — re-run only if you wipe the project.)
# `--manifest` takes the URL of the LIVE Web App Manifest, NOT the local
# twa-manifest.json. The local file is the saved config Bubblewrap reuses.
# bubblewrap init --manifest https://cinevo.k79.space/manifest.webmanifest

bubblewrap build          # → android-twa/app-release-signed.apk
```

> The leanback manifest edits (§3) live in `android-twa/app/src/main/AndroidManifest.xml` and are already applied. `bubblewrap update` would regenerate that file — re-apply them if you run it.

Bubblewrap also prints an **assetlinks.json** fingerprint — host it at
`https://cinevo.k79.space/.well-known/assetlinks.json` so the TWA opens **without a browser URL bar**.

---

## 3. Make it an Android **TV** app (leanback)

Bubblewrap targets phones by default. After `bubblewrap init`, edit the generated
`app/src/main/AndroidManifest.xml`:

```xml
<!-- TV doesn't require touch; allow leanback-only devices -->
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.software.leanback" android:required="false" />

<application ...
    android:banner="@drawable/banner">   <!-- 320×180 TV banner in res/drawable -->

  <activity android:name="LauncherActivity" ...>
    <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <!-- Phone/launcher -->
      <category android:name="android.intent.category.LAUNCHER" />
      <!-- TV "Apps" row launcher -->
      <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
  </activity>
</application>
```

Add a **`res/drawable/banner.png`** (320×180) — this is the icon shown in the Android TV Apps row.

Then rebuild:

```bash
cd android-twa
./gradlew assembleRelease
```

---

## 4. Install & test on a TV

```bash
# Emulator: create an "Android TV (1080p)" AVD in Android Studio, boot it, then:
adb install ./app-release-signed.apk

# Real device: enable Developer options → ADB debugging, connect over network:
adb connect <tv-ip>:5555
adb install ./app-release-signed.apk
```

Launch from the **Apps** row and navigate with the remote. Confirm:
- Focus moves between rows/cards with the D-pad and the focused item is ringed + scrolled into view.
- Enter opens a title; Back returns / closes overlays.
- The player loads; once focus is inside the provider iframe, its own player handles the remote.

---

## 5. Publishing (optional)

To list on the Play Store as a TV app: upload the signed AAB (`bubblewrap build` can emit `.aab`), complete the **Android TV** form in the Play Console, and provide TV screenshots + the banner. Sideloading (step 4) is enough for personal use.

---

## Notes & limitations

- The **embedded video player is a cross-origin iframe** — once focus enters it, the provider controls the remote; we give it a clear focus state and Back exits it.
- Provider sites that block sandboxing behave the same as on web (set their **Ad-block mode → Off** in admin).
- Web Push works in the TWA (it shares the site's service worker), but TV notification UX is limited.
