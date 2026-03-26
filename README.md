# FitTracker 🏃

A simple step counter app built with React Native and Bare Workflow.

> This is a personal learning project. Expect bugs and rough edges!

## Features (v0.2.0)

- 🏃 Step counting via Android Pedometer (Foreground Service)
- 🔄 Background tracking – continues even when app is closed
- 🔵 Custom algorithm using the accelerometer for comparison
- 📊 Daily goal tracking with progress bar (5k, 10k, 15k, 20k steps)
- 📅 Monthly calendar view – green = goal reached, red = missed, gray = no data
- 🌙 Dark mode (default) and light mode
- ⚙️ Configurable daily reset time
- 💾 Persistent settings, history, and background step data
- 📲 Step progress notifications (updates throughout the day)

## Installation

1. Go to [Releases](../../releases) and download the latest APK (v0.2.0+)
2. Install on your Android device (sideloading must be enabled)
3. Allow activity recognition & notification permissions on first launch
4. App will start background service automatically – steps are tracked even when the app is closed

> **Note:** iOS is not supported. Bare Workflow Android only.

## What's New (v0.2.0)

- **Background Service**: Native Kotlin Foreground Service for persistent step tracking
- **Service-to-App Integration**: Service writes steps to file, app reads every 10 seconds
- **Live Notification Sync**: Notification updates in real-time from background service (fixed 0/10000 bug)
- **Calendar Improvements**: Days with no data now shown in gray
- **Better Persistence**: Steps survive app restarts – service starts automatically

## Development

Built with:
- [React Native](https://reactnative.dev/) (Bare Workflow)
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) for step counting
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) for step tracking notifications
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for persistent storage

### Getting Started
```bash
# Clone the repo
git clone https://github.com/manikarov/FitTracker.git
cd FitTracker

# Install dependencies
npm install

# For development (Expo)
npx expo start --dev-client
```

### Building Locally

**Prerequisites:**
- Android Studio (with SDK tools installed)
- Set ANDROID_HOME environment variable

```bash
# Generate Android native code (if not already done)
npx expo prebuild --clean

# Build APK locally (faster than EAS cloud)
npm run android:local

# APK location: android/app/build/outputs/apk/release/
```

### Building with EAS (Cloud)
```bash
# Preview APK (cloud build)
eas build --profile preview --platform android
```
