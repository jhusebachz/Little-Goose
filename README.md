# Little Goose

Little Goose is an Expo Android app for thrift-store resale scouting. You can snap a photo of an item, let the app identify it, and compare the find against live eBay sold and active listings before you buy.

## What The App Does

- `Camera-first pricing`: take a photo or choose one from your gallery while you are in the store
- `Photo identification`: use OpenAI to turn the image into a practical resale search query
- `Live comp lookup`: use eBay's Finding API to compare sold and active listings
- `On-device keys`: keep your OpenAI key and eBay App ID stored locally in SecureStore on your phone
- `Manual fallback`: type the item title yourself if you want to skip photo identification

## Local Development

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Open it on Android:

- press `a` in the Expo terminal for an emulator
- or scan the QR code with Expo Go on your Android phone

## Android Testing

Build a preview APK:

```bash
eas build -p android --profile preview
```

Push an OTA update for JavaScript and asset changes:

```bash
eas update --channel preview --message "Describe the change"
```

Important:

- `GitHub pushes do not update the phone app by themselves.`
- `eas update` is enough for JavaScript and asset changes.
- native changes like package IDs, permissions, plugins, or app config need a fresh APK.
- after each versioned update, the README and GitHub repo should be updated to match the shipped change set.

## Versioning

Little Goose follows semantic versioning:

- `MAJOR` for big product shifts or breaking structural changes
- `MINOR` for major new features or meaningful workflow expansions
- `PATCH` for fixes, polish, copy changes, and low-risk UX improvements

The app version lives in:

- [`app.json`](./app.json)
- [`package.json`](./package.json)
- [`package-lock.json`](./package-lock.json)

Because Expo Updates uses `runtimeVersion.policy = "appVersion"`, version changes matter for OTA compatibility.

## Current Release

`1.0.1`

This release adds visual polish and device-ready customization on top of the first Android preview setup:

- native Expo Android app shell for thrift-store photo pricing
- on-device Settings storage for OpenAI and eBay credentials
- OpenAI image identification flow with manual search fallback
- live eBay sold and active comp lookup with a price-band estimate
- EAS preview/production configuration for APK builds and OTA updates
- dark mode and light mode in Settings, with dark mode as the default
- proper Android app icon assets wired into Expo and adaptive icon config

## Notes

- Add your OpenAI key and eBay App ID from the in-app Settings screen.
- Without an OpenAI key, you can still type an item title manually.
- Without an eBay App ID, Little Goose still gives you direct search links, but it cannot compute the price band from live comps.
- Pricing quality still depends on how specific the identified item is, so brand and model details help a lot.
