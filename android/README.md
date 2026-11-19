# Android app (Google Play)

The Play Store app is a Trusted Web Activity around https://app.ceritaproject.nl, built by
`.github/workflows/android.yml` with Bubblewrap from `twa-manifest.json`. Nothing here is
built by hand.

- Package name: `nl.ceritaproject.app` (can never change once published).
- New version: raise `appVersionCode` (and `appVersionName`) in `twa-manifest.json` and push.
- Signing: the workflow signs with the upload key. The password is the GitHub secret
  `ANDROID_KEY_PASSWORD`; once the key exists, it is kept as the secret `ANDROID_KEYSTORE_BASE64`.
  Without a password secret the workflow only does a test build and publishes nothing.
- The app opens without an address bar only when `public/.well-known/assetlinks.json` lists the
  SHA-256 fingerprints of the app signing key (Play Console → App-integriteit) and the upload key.
