# FitTracker 🏃

Ein einfacher Schrittzähler für Android, gebaut mit React Native (Bare Workflow).

> Persönliches Lernprojekt – Fehler und unfertige Ecken sind möglich.

## Features (v0.2.2)

- 🏃 Schrittzählung per Android-Pedometer (Hardware-Sensor)
- 🔄 Hintergrund-Tracking – zählt weiter wenn die App geschlossen ist (Foreground Service)
- 🔵 Eigener Algorithmus per Beschleunigungssensor zum Vergleich
- 📊 Tagesзiel mit Fortschrittsbalken (5k, 10k, 15k, 20k Schritte) – passt sich dem gewählten Anzeigemodus an
- 📅 Monatskalender – grün = Ziel erreicht, rot = nicht erreicht, grau = keine Daten
- 🌙 Dark Mode (Standard) und Light Mode
- ⚙️ Einstellbare tägliche Reset-Uhrzeit (0–6 Uhr)
- 💾 Persistente Schrittdaten – beide Zähler (Android & Sensor) überleben App-Neustarts
- 🗑️ Manueller Reset in den Einstellungen mit Bestätigungs-Dialog

## Installation

1. Unter [Releases](../../releases) die neueste APK herunterladen (`0.2.2_FitTracker.apk`)
2. Auf dem Android-Gerät installieren (Sideloading muss erlaubt sein)
3. Beim ersten Start Aktivitätserkennung & Benachrichtigungsberechtigung erlauben
4. Der Foreground Service startet automatisch – Schritte werden auch im Hintergrund gezählt

> **Hinweis:** iOS wird nicht unterstützt. Nur Android (Bare Workflow).

## Neu in v0.2.2

- **Manueller Reset** – Roter Button in Einstellungen löscht alle Schritte & Verlauf nach Bestätigung (`reset` eintippen)
- **Sensor-Schritte persistent** – eigener Algorithmus-Zähler wird jetzt ebenfalls gespeichert und nach Neustart wiederhergestellt
- **Fortschrittsbalken nach Anzeigemodus** – Ziel und Balken berechnen sich aus dem jeweils aktiven Zähler (Android / Sensor / Durchschnitt)

## Änderungsverlauf

### v0.2.1
- **Tagesgrenze nach Reset-Uhrzeit** – Schritte von Mitternacht bis zur Reset-Stunde werden dem richtigen Tag zugeordnet
- **Doppelte Notification entfernt** – nur noch eine Notification vom Foreground Service (keine Abweichung mehr zwischen Anzeige und Benachrichtigung)
- **Service läuft im echten Hintergrund** – `onDestroy()` stoppt den Service nicht mehr; `START_STICKY` sorgt für automatischen Neustart
- **Datei-Kommunikation korrigiert** – Service schreibt in `filesDir` (intern), JS liest über `FileSystem.documentDirectory` (gleicher Pfad)
- **Steps nach Neustart persistent** – `currentStepsDate` wird mitgespeichert, veraltete Werte werden verworfen

### v0.2.0
- **Foreground Service** – nativer Kotlin-Service für Hintergrund-Tracking
- **Service-Synchronisation** – Service schreibt Schritte in Datei, App liest alle 5 Sekunden
- **Kalender-Verbesserungen** – Tage ohne Daten werden grau dargestellt

## Entwicklung

Gebaut mit:
- [React Native](https://reactnative.dev/) (Bare Workflow)
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) – Pedometer & Beschleunigungssensor
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) – Kommunikation mit dem nativen Service
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) – Benachrichtigungskanal
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) – persistente Speicherung

### Lokaler Start
```bash
git clone https://github.com/manikarov/FitTracker.git
cd FitTracker
npm install
npx expo start --dev-client
```

### APK lokal bauen

**Voraussetzungen:** Android Studio + ANDROID_HOME gesetzt

```bash
# APK bauen
cd android && ./gradlew assembleRelease

# APK liegt unter:
# android/app/build/outputs/apk/release/<version>_FitTracker.apk
```

### EAS Cloud Build
```bash
eas build --profile preview --platform android
```
