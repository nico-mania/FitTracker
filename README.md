# FitTracker 🏃

A simple step counter app built with React Native and Bare Workflow.

> This is a personal learning project. Expect bugs and rough edges!

## Features (v0.3.0)

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

1. Go to [Releases](../../releases) and download the latest APK (v0.3.0+)
2. Install on your Android device (sideloading must be enabled)
3. Allow activity recognition & notification permissions on first launch
4. App will start background service automatically – schritte werden auch ohne App im Vordergrund getrackt

> **Note:** iOS is not supported. Bare Workflow Android only.

## What's New (v0.3.0)

- **Background Service**: Native Kotlin Foreground Service für persistentes Schritt-Tracking
- **Service-to-App Integration**: Service schreibt Schritte in Datei, App liest alle 10 Sekunden
- **Calendar Improvements**: Zeigt nun auch Tage ohne Daten (0 Schritte) in Grau
- **Better Persistence**: Schritte surviven App Neustart (Service startet automatisch)

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
