import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, PermissionsAndroid } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { dark, light } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen, { DisplayMode } from './src/screens/SettingsScreen';
import CalendarScreen from './src/screens/CalendarScreen';

type Screen = 'home' | 'settings' | 'calendar';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [androidSteps, setAndroidSteps] = useState(0);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [stepCooldown, setStepCooldown] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [resetHour, setResetHour] = useState(4);
  const [stepGoal, setStepGoal] = useState(10000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [history, setHistory] = useState<Record<string, number>>({});
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const androidStepsRef = useRef(0);
  const historyRef = useRef<Record<string, number>>({});
  const resetHourRef = useRef(4);
  const stepBaseRef = useRef<number | null>(null);

  const theme = darkMode ? dark : light;

  // Refs synchron halten
  useEffect(() => { androidStepsRef.current = androidSteps; }, [androidSteps]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { resetHourRef.current = resetHour; }, [resetHour]);

  // Einstellungen & Historie laden
  useEffect(() => {
    async function loadData() {
      const savedDark = await AsyncStorage.getItem('darkMode');
      const savedReset = await AsyncStorage.getItem('resetHour');
      const savedGoal = await AsyncStorage.getItem('stepGoal');
      const savedDisplay = await AsyncStorage.getItem('displayMode');
      const savedHistory = await AsyncStorage.getItem('stepHistory');
      if (savedDark !== null) setDarkMode(JSON.parse(savedDark));
      if (savedReset !== null) setResetHour(JSON.parse(savedReset));
      if (savedGoal !== null) setStepGoal(JSON.parse(savedGoal));
      if (savedDisplay !== null) setDisplayMode(JSON.parse(savedDisplay));
      if (savedHistory !== null) {
        const h = JSON.parse(savedHistory);
        setHistory(h);
        historyRef.current = h;
      }
    }
    loadData();
  }, []);

  // Einstellungen speichern
  useEffect(() => {
    AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    AsyncStorage.setItem('resetHour', JSON.stringify(resetHour));
  }, [resetHour]);

  useEffect(() => {
    AsyncStorage.setItem('stepGoal', JSON.stringify(stepGoal));
  }, [stepGoal]);

  useEffect(() => {
    AsyncStorage.setItem('displayMode', JSON.stringify(displayMode));
  }, [displayMode]);

  // Historie speichern wenn Schritte sich ändern
  useEffect(() => {
    if (androidSteps === 0) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const updated = { ...historyRef.current, [key]: androidSteps };
    historyRef.current = updated;
    setHistory(updated);
    AsyncStorage.setItem('stepHistory', JSON.stringify(updated));
  }, [androidSteps]);

  // Sensoren & Reset
  useEffect(() => {
    async function setup() {
      await requestPermissions();

      stepBaseRef.current = null;

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
            return updated;
          });
          stepBaseRef.current = result.steps;
        }
      });

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
          stepBaseRef.current = null;

          scheduleReset();
        }, msUntilReset);
      }

      scheduleReset();

      return () => {
        pedometerSub.remove();
        accelSub.remove();
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      };
    }

    setup();
  }, [resetHour]);

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