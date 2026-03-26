# FitTracker 🏃

A simple step counter app built with React Native and Expo.

> This is a personal learning project. Expect bugs and rough edges!

## Features

- 🏃 Step counting via Android Pedometer
- 🔵 Custom algorithm using the accelerometer for comparison
- 📊 Daily goal tracking with progress bar (5k, 10k, 15k, 20k steps)
- 📅 Monthly calendar view – green = goal reached, red = missed
- 🌙 Dark mode (default) and light mode
- ⚙️ Configurable daily reset time
- 💾 Persistent settings and history

## Installation

1. Go to [Releases](../../releases) and download the latest APK
2. Install on your Android device (sideloading must be enabled)
3. Allow activity recognition permission on first launch

> **Note:** iOS is not supported yet.

## Development

Built with:
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/) SDK 54
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) for step counting and accelerometer
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for persistent storage

### Getting Started
```bash
# Clone the repo
git clone https://github.com/manikarov/FitTracker.git
cd FitTracker

# Install dependencies
npm install

# Start development server
npx expo start --dev-client
```

### Building
```bash
# Development build
eas build --profile development --platform android

# Preview APK
eas build --profile preview --platform android
```
