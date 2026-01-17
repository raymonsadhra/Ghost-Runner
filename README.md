# Ghost Runner

Race your past self with a live ghost overlay and spatial audio cues.

## What is included
- GPS route recording with live distance and pace stats.
- Ghost racing engine that compares your current distance to a past run.
- Spatial audio manager wired for breathing, footsteps, heartbeat, and victory.
- Screens: Home, Run, Ghost Select, Ghost Run, Summary.

## Setup (SDK 54)
1) Install dependencies:
```bash
npm install
```
2) Align Expo packages:
```bash
npx expo install --fix
```
3) Install the Babel preset used by `babel.config.js`:
```bash
npm install --save-dev babel-preset-expo
```
4) Configure Firebase env vars (see below).
5) Add audio files and wire them in `src/config/audioSources.js`.
6) Start the app:
```bash
npm run start
```

## Firebase config
This project reads config from Expo public env vars:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

You can set these in a local `.env` file or your shell environment.

## Audio assets
Place your audio files under `assets/audio/` and update:
- `src/config/audioSources.js`

Example:
```js
export const audioSources = {
  breathing: require('../../assets/audio/heavy-breathing-14431.mp3'),
  footsteps: require('../../assets/audio/heavy-walking-footsteps-352771.mp3'),
  heartbeat: require('../../assets/audio/thudding-heartbeat-372487.mp3'),
  cheer: require('../../assets/audio/crowd-cheering-383111.mp3'),
};
```

## Project structure
```
App.js
src/
  config/
  screens/
  services/
  utils/
```

## Notes
- `react-native-maps` may require platform-specific config for iOS and Android.
- The ghost engine currently compares route distance by elapsed time.
- Firebase Auth is not initialized yet; runs save with `userId: "anon"` until auth is wired.
- Runs are stored locally in AsyncStorage and synced to Firestore when available.

## Expo Go + SDK compatibility
- Expo Go on iOS only supports the latest SDK. This project targets SDK 54.
- If the QR does not scan, open Expo Go and use “Enter URL” with the `exp://` link.

## Troubleshooting
- `EMFILE: too many open files`: install Watchman (`brew install watchman`) or run `ulimit -n 8192` then restart Metro.
- Watchman recrawl warning: `watchman watch-del '<project>' ; watchman watch-project '<project>'`.
