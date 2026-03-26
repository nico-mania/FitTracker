import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, PermissionsAndroid, BackHandler } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';

import { dark, light } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen, { DisplayMode } from './src/screens/SettingsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import { setupNotificationChannel, requestNotificationPermissions, updateStepNotification, stopStepTrackerTask } from './src/tasks/stepTrackerTask';

type Screen = 'home' | 'settings' | 'calendar';

async function requestPermissions() {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [androidSteps, setAndroidSteps] = useState(0);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [stepCooldown, setStepCooldown] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [resetHour, setResetHour] = useState(4);
  const [stepGoal, setStepGoal] = useState(10000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('android');
  const [history, setHistory] = useState<Record<string, number>>({});
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const androidStepsRef = useRef(0);
  const historyRef = useRef<Record<string, number>>({});
  const resetHourRef = useRef(4);
  const stepBaseRef = useRef<number | null>(null);

  const theme = darkMode ? dark : light;

  // Schritte aus Service-Datei laden
  const loadStepsFromService = async () => {
    try {
      const path = 'file:///storage/emulated/0/Android/data/com.manikarov.fittracker/files/steps.txt';
      const content = await FileSystem.readAsStringAsync(path);
      const steps = parseInt(content.trim());
      if (!isNaN(steps) && steps > androidStepsRef.current) {
        setAndroidSteps(steps);
        androidStepsRef.current = steps;
        await AsyncStorage.setItem('currentSteps', steps.toString());
        updateStepNotification(steps, stepGoal).catch(() => {});
      }
    } catch (error) {
      // Datei nicht vorhanden oder Fehler
    }
  };

  // Notification Handler einrichten
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Listener für Notification-Taps
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data.screen) {
          setScreen(data.screen as Screen);
        }
      });

      return () => subscription.remove();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }, []);

  // ✅ NEU: Android Zurück-Button / Swipe
  useEffect(() => {
    const backAction = () => {
      if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [screen]);

  // Refs synchron halten
  useEffect(() => { androidStepsRef.current = androidSteps; }, [androidSteps]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { resetHourRef.current = resetHour; }, [resetHour]);

  // Einstellungen & Historie laden
  useEffect(() => {
    async function loadData() {
      try {
        const savedDark = await AsyncStorage.getItem('darkMode');
        const savedReset = await AsyncStorage.getItem('resetHour');
        const savedGoal = await AsyncStorage.getItem('stepGoal');
        const savedDisplay = await AsyncStorage.getItem('displayMode');
        const savedHistory = await AsyncStorage.getItem('stepHistory');
        const savedSteps = await AsyncStorage.getItem('currentSteps');
        if (savedDark !== null) setDarkMode(JSON.parse(savedDark));
        if (savedReset !== null) setResetHour(JSON.parse(savedReset));
        if (savedGoal !== null) setStepGoal(JSON.parse(savedGoal));
        if (savedDisplay !== null) setDisplayMode(JSON.parse(savedDisplay));
        if (savedHistory !== null) {
          const h = JSON.parse(savedHistory);
          setHistory(h);
          historyRef.current = h;
        }
        if (savedSteps !== null) {
          const steps = parseInt(savedSteps);
          setAndroidSteps(steps);
          androidStepsRef.current = steps;
        }

        // Schritte aus Service laden
        await loadStepsFromService();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    loadData();

    // Regelmäßig Schritte aus Service laden
    const interval = setInterval(loadStepsFromService, 10000); // alle 10 sek
    return () => clearInterval(interval);
  }, []);

  // Einstellungen speichern
  useEffect(() => {
    try {
      AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
    } catch (error) {
      console.error('Error saving darkMode:', error);
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      AsyncStorage.setItem('resetHour', JSON.stringify(resetHour));
    } catch (error) {
      console.error('Error saving resetHour:', error);
    }
  }, [resetHour]);

  useEffect(() => {
    try {
      AsyncStorage.setItem('stepGoal', JSON.stringify(stepGoal));
    } catch (error) {
      console.error('Error saving stepGoal:', error);
    }
  }, [stepGoal]);

  useEffect(() => {
    try {
      AsyncStorage.setItem('displayMode', JSON.stringify(displayMode));
    } catch (error) {
      console.error('Error saving displayMode:', error);
    }
  }, [displayMode]);

  // Historie speichern wenn Schritte sich ändern
  useEffect(() => {
    if (androidSteps === 0) return;
    try {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const updated = { ...historyRef.current, [key]: androidSteps };
      historyRef.current = updated;
      setHistory(updated);
      AsyncStorage.setItem('stepHistory', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }, [androidSteps]);

  // Sensoren & Reset
  useEffect(() => {
    async function setup() {
      try {
        await requestPermissions();

        // Notifications einrichten
        try {
          await setupNotificationChannel();
          await requestNotificationPermissions();
        } catch (e) {
          console.warn('Notifications setup failed:', e);
        }

        stepBaseRef.current = null;

        // Pedometer starten
        const pedometerSub = Pedometer.watchStepCount((result) => {
          if (stepBaseRef.current === null) {
            stepBaseRef.current = result.steps;
            return;
          }
          const delta = result.steps - stepBaseRef.current;
          if (delta > 0) {
            setAndroidSteps(prev => {
              const updated = prev + delta;
              androidStepsRef.current = updated;
              // Notification aktualisieren
              updateStepNotification(updated, stepGoal).catch(() => {});
              return updated;
            });
            stepBaseRef.current = result.steps;
          }
        });

        // Accelerometer für eigenen Algorithmus
        Accelerometer.setUpdateInterval(100);
        const accelSub = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude > 1.3 && !stepCooldown) {
            setSensorSteps(prev => prev + 1);
            setStepCooldown(true);
            setTimeout(() => setStepCooldown(false), 400);
          }
        });

        function scheduleReset() {
          const now = new Date();
          const next = new Date();
          next.setHours(resetHourRef.current, 0, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1);
          const msUntilReset = next.getTime() - now.getTime();

          resetTimerRef.current = setTimeout(async () => {
            try {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
              const updated = { ...historyRef.current, [key]: androidStepsRef.current };
              setHistory(updated);
              historyRef.current = updated;
              await AsyncStorage.setItem('stepHistory', JSON.stringify(updated));

              setAndroidSteps(0);
              setSensorSteps(0);
              androidStepsRef.current = 0;
              await AsyncStorage.setItem('currentSteps', '0');
              
              // Notification clearen
              await Notifications.dismissAllNotificationsAsync();

              scheduleReset();
            } catch (error) {
              console.error('Error during reset:', error);
            }
          }, msUntilReset);
        }

        scheduleReset();

        return () => {
          pedometerSub.remove();
          accelSub.remove();
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          stopStepTrackerTask();
        };
      } catch (error) {
        console.error('Error in setup:', error);
      }
    }

    setup();
  }, [resetHour, stepGoal]);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {screen === 'home' && (
        <HomeScreen
          androidSteps={androidSteps}
          sensorSteps={sensorSteps}
          stepGoal={stepGoal}
          theme={theme}
          displayMode={displayMode}
          backgroundTrackingActive={true}
          onOpenSettings={() => setScreen('settings')}
          onOpenCalendar={() => setScreen('calendar')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          theme={theme}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          resetHour={resetHour}
          setResetHour={setResetHour}
          stepGoal={stepGoal}
          setStepGoal={setStepGoal}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          onClose={() => setScreen('home')}
        />
      )}
      {screen === 'calendar' && (
        <CalendarScreen
          theme={theme}
          stepGoal={stepGoal}
          history={history}
          onClose={() => setScreen('home')}
        />
      )}
    </>
  );
}