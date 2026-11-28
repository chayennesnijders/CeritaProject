#!/usr/bin/env bash
# Builds the iPhone app from apple/ and, with an App Store Connect API key, signs it (Xcode cloud
# signing) and uploads it to App Store Connect / TestFlight. Used by codemagic.yaml and
# .github/workflows/ios.yml. Env: APPLE_TEAM_ID, APPSTORE_ISSUER_ID, APPSTORE_KEY_ID, APPSTORE_KEY_P8,
# BUILD_NUMBER (optional), APP_VERSION (optional).
set -euo pipefail
cd "$(dirname "$0")"
BUNDLE_ID=com.ceritaproject.mijnapp
VERSION="${APP_VERSION:-1.0.0}"
BUILD="${BUILD_NUMBER:-1}"
TMP="${TMPDIR:-/tmp}"

npm install --no-audit --no-fund
rm -rf ios
npx cap add ios --packagemanager SPM

ICONSET=ios/App/App/Assets.xcassets/AppIcon.appiconset
for f in "$ICONSET"/*.png; do cp icon-1024.png "$f"; done
PLIST=ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName CeritaProject" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" || true
/usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" "$PLIST" || true
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"

if [ -z "${APPSTORE_KEY_P8:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ]; then
  xcodebuild build -project ios/App/App.xcodeproj -scheme App -configuration Release \
    -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" | tail -20
  echo "Testbouw gelukt. Zet de vier Apple-geheimen erin voor een echte bouw naar TestFlight."
  exit 0
fi

KEY="$TMP/AuthKey_$APPSTORE_KEY_ID.p8"
printf '%s\n' "$APPSTORE_KEY_P8" > "$KEY"
trap 'rm -f "$KEY"' EXIT
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$APPSTORE_KEY_ID" -authenticationKeyIssuerID "$APPSTORE_ISSUER_ID")
# Archive unsigned: every build runs on a fresh Mac without our certificate keys. The export below
# signs with Apple's cloud-managed distribution certificate, which needs no local private key.
xcodebuild archive -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$TMP/App.xcarchive" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  IPHONEOS_DEPLOYMENT_TARGET=15.0 MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD" | tail -30
cat > "$TMP/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$APPLE_TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF
xcodebuild -exportArchive -archivePath "$TMP/App.xcarchive" -exportOptionsPlist "$TMP/ExportOptions.plist" \
  -exportPath "$TMP/export" "${AUTH[@]}"
echo "Build $BUILD (versie $VERSION) staat in App Store Connect. Na ongeveer 15 minuten verschijnt hij in TestFlight."
