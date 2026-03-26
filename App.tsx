import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, PermissionsAndroid } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { dark, light } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
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
  const [history, setHistory] = useState<Record<string, number>>({});
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = darkMode ? dark : light;

  // Einstellungen & Historie laden
  useEffect(() => {
    async function loadData() {
      const savedDark = await AsyncStorage.getItem('darkMode');
      const savedReset = await AsyncStorage.getItem('resetHour');
      const savedGoal = await AsyncStorage.getItem('stepGoal');
      const savedHistory = await AsyncStorage.getItem('stepHistory');
      if (savedDark !== null) setDarkMode(JSON.parse(savedDark));
      if (savedReset !== null) setResetHour(JSON.parse(savedReset));
      if (savedGoal !== null) setStepGoal(JSON.parse(savedGoal));
      if (savedHistory !== null) setHistory(JSON.parse(savedHistory));
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

  // Schritte täglich in Historie speichern
  useEffect(() => {
    if (androidSteps === 0) return;
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const updated = { ...history, [key]: androidSteps };
    setHistory(updated);
    AsyncStorage.setItem('stepHistory', JSON.stringify(updated));
  }, [androidSteps]);

  // Täglicher Reset
  useEffect(() => {
    function scheduleReset() {
      const now = new Date();
      const next = new Date();
      next.setHours(resetHour, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const msUntilReset = next.getTime() - now.getTime();

      resetTimerRef.current = setTimeout(() => {
        setAndroidSteps(0);
        setSensorSteps(0);
        scheduleReset();
      }, msUntilReset);
    }

    scheduleReset();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetHour]);

  // Sensoren
  useEffect(() => {
    async function setup() {
      await requestPermissions();

      const pedometerSub = Pedometer.watchStepCount((result) => {
        setAndroidSteps(result.steps);
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

      return () => {
        pedometerSub.remove();
        accelSub.remove();
      };
    }
    setup();
  }, []);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {screen === 'home' && (
        <HomeScreen
          androidSteps={androidSteps}
          sensorSteps={sensorSteps}
          stepGoal={stepGoal}
          theme={theme}
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