import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, PermissionsAndroid, BackHandler } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';

import { dark, light } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen, { DisplayMode } from './src/screens/SettingsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import { setupNotificationChannel, requestNotificationPermissions } from './src/tasks/stepTrackerTask';

type Screen = 'home' | 'settings' | 'calendar';

// FileSystem.documentDirectory maps to the same internal filesDir the Kotlin service uses
const SERVICE_DIR       = FileSystem.documentDirectory ?? '';
const STEPS_FILE        = SERVICE_DIR + 'steps.txt';
const DAY_FILE          = SERVICE_DIR + 'day.txt';
const RESET_SIGNAL_FILE = SERVICE_DIR + 'reset_signal.txt';
const RESET_HOUR_FILE   = SERVICE_DIR + 'reset_hour.txt';

/**
 * Date key adjusted for the user's reset hour.
 * If current time is before resetHour, we are still in "yesterday's" period.
 */
function getTodayKey(resetHour: number): string {
  const now = new Date();
  if (now.getHours() < resetHour) now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function requestPermissions() {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default function App() {
  const [screen, setScreen]               = useState<Screen>('home');
  const [androidSteps, setAndroidSteps]   = useState(0);
  const [sensorSteps,  setSensorSteps]    = useState(0);
  const [darkMode,     setDarkMode]       = useState(true);
  const [resetHour,    setResetHour]      = useState(4);
  const [stepGoal,     setStepGoal]       = useState(10000);
  const [displayMode,  setDisplayMode]    = useState<DisplayMode>('android');
  const [history,      setHistory]        = useState<Record<string, number>>({});

  const resetTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const androidStepsRef    = useRef(0);
  const historyRef         = useRef<Record<string, number>>({});
  const resetHourRef       = useRef(4);
  const pedometerBaseRef   = useRef<number | null>(null);
  const sensorStepsRef     = useRef(0);
  const stepCooldownRef    = useRef(false);

  const theme = darkMode ? dark : light;

  // ── Service-file helpers ─────────────────────────────────────────────────

  const writeServiceFile = async (path: string, content: string) => {
    try {
      // @ts-ignore legacy API — still fully functional
      await FileSystem.writeAsStringAsync(path, content);
    } catch {}
  };

  const readServiceFile = async (path: string): Promise<string | null> => {
    try {
      // @ts-ignore legacy API — still fully functional
      return await FileSystem.readAsStringAsync(path);
    } catch {
      return null;
    }
  };

  /**
   * Read steps from the foreground service file.
   * Only updates androidSteps if the service is tracking today's period
   * AND has counted more steps than we already have.
   */
  const loadStepsFromService = async () => {
    const stepsRaw = await readServiceFile(STEPS_FILE);
    if (stepsRaw === null) return;

    const steps = parseInt(stepsRaw.trim(), 10);
    if (isNaN(steps) || steps < 0) return;

    const dayRaw = await readServiceFile(DAY_FILE);
    const serviceDayKey  = dayRaw?.trim();
    const expectedDayKey = getTodayKey(resetHourRef.current);

    // Service is still on a previous day — wait for it to reset
    if (serviceDayKey && serviceDayKey !== expectedDayKey) return;

    if (steps > androidStepsRef.current) {
      setAndroidSteps(steps);
      androidStepsRef.current = steps;
      // Also advance the pedometer base so delta tracking doesn't double-count
      pedometerBaseRef.current = null;

      await AsyncStorage.setItem('currentSteps', steps.toString());
      await AsyncStorage.setItem('currentStepsDate', expectedDayKey);

      if (steps > 0) {
        const updated = { ...historyRef.current, [expectedDayKey]: steps };
        historyRef.current = updated;
        setHistory(updated);
        await AsyncStorage.setItem('stepHistory', JSON.stringify(updated));
      }
    }
  };

  // ── Notification handler ─────────────────────────────────────────────────

  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const sub = Notifications.addNotificationResponseReceivedListener(r => {
        const data = r.notification.request.content.data;
        if (data.screen) setScreen(data.screen as Screen);
      });
      return () => sub.remove();
    } catch {}
  }, []);

  // ── Back button ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'home') { setScreen('home'); return true; }
      return false;
    });
    return () => handler.remove();
  }, [screen]);

  // ── Keep refs in sync ────────────────────────────────────────────────────

  useEffect(() => { androidStepsRef.current = androidSteps; }, [androidSteps]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { resetHourRef.current = resetHour; }, [resetHour]);

  // ── Load saved data on startup ───────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedDark, savedReset, savedGoal, savedDisplay,
          savedHistory, savedSteps, savedStepsDate,
          savedSensorSteps, savedSensorStepsDate,
        ] = await Promise.all([
          AsyncStorage.getItem('darkMode'),
          AsyncStorage.getItem('resetHour'),
          AsyncStorage.getItem('stepGoal'),
          AsyncStorage.getItem('displayMode'),
          AsyncStorage.getItem('stepHistory'),
          AsyncStorage.getItem('currentSteps'),
          AsyncStorage.getItem('currentStepsDate'),
          AsyncStorage.getItem('currentSensorSteps'),
          AsyncStorage.getItem('currentSensorStepsDate'),
        ]);

        if (savedDark    !== null) setDarkMode(JSON.parse(savedDark));
        if (savedGoal    !== null) setStepGoal(JSON.parse(savedGoal));
        if (savedDisplay !== null) setDisplayMode(JSON.parse(savedDisplay));

        let loadedResetHour = 4;
        if (savedReset !== null) {
          loadedResetHour = JSON.parse(savedReset);
          setResetHour(loadedResetHour);
          resetHourRef.current = loadedResetHour;
        }

        if (savedHistory !== null) {
          const h = JSON.parse(savedHistory);
          setHistory(h);
          historyRef.current = h;
        }

        // Restore saved steps only if they belong to the current tracking period
        const todayKey = getTodayKey(loadedResetHour);
        if (savedSteps !== null && savedStepsDate === todayKey) {
          const steps = parseInt(savedSteps, 10);
          if (!isNaN(steps) && steps > 0) {
            setAndroidSteps(steps);
            androidStepsRef.current = steps;
          }
        }
        if (savedSensorSteps !== null && savedSensorStepsDate === todayKey) {
          const steps = parseInt(savedSensorSteps, 10);
          if (!isNaN(steps) && steps > 0) {
            setSensorSteps(steps);
            sensorStepsRef.current = steps;
          }
        }

        // Supplement with service file (may have more steps from background tracking)
        await loadStepsFromService();
      } catch (e) {
        console.error('Error loading data:', e);
      }
    }

    loadData();

    // Poll service file every 5 s for live background updates
    const interval = setInterval(loadStepsFromService, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist settings ─────────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.setItem('darkMode', JSON.stringify(darkMode)).catch(() => {});
  }, [darkMode]);

  useEffect(() => {
    AsyncStorage.setItem('resetHour', JSON.stringify(resetHour)).catch(() => {});
    writeServiceFile(RESET_HOUR_FILE, resetHour.toString());
  }, [resetHour]);

  useEffect(() => {
    AsyncStorage.setItem('stepGoal', JSON.stringify(stepGoal)).catch(() => {});
  }, [stepGoal]);

  useEffect(() => {
    AsyncStorage.setItem('displayMode', JSON.stringify(displayMode)).catch(() => {});
  }, [displayMode]);

  // ── Sensors & reset ──────────────────────────────────────────────────────

  useEffect(() => {
    let pedometerSub: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let accelSub: ReturnType<typeof Accelerometer.addListener> | null = null;

    async function setup() {
      try {
        await requestPermissions();
        try {
          await setupNotificationChannel();
          await requestNotificationPermissions();
        } catch {}

        await writeServiceFile(RESET_HOUR_FILE, resetHour.toString());

        // Pedometer — Android hardware step counter (primary in-app source)
        pedometerBaseRef.current = null;
        pedometerSub = Pedometer.watchStepCount(result => {
          if (pedometerBaseRef.current === null) {
            // First event: set base, don't add steps yet
            pedometerBaseRef.current = result.steps;
            return;
          }
          const delta = result.steps - pedometerBaseRef.current;
          if (delta > 0) {
            setAndroidSteps(prev => {
              const updated = prev + delta;
              androidStepsRef.current = updated;
              return updated;
            });
            pedometerBaseRef.current = result.steps;

            // Persist every step update
            const key = getTodayKey(resetHourRef.current);
            AsyncStorage.setItem('currentSteps', androidStepsRef.current.toString()).catch(() => {});
            AsyncStorage.setItem('currentStepsDate', key).catch(() => {});
          }
        });

        // Accelerometer — own algorithm
        Accelerometer.setUpdateInterval(100);
        accelSub = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude > 1.3 && !stepCooldownRef.current) {
            sensorStepsRef.current += 1;
            setSensorSteps(sensorStepsRef.current);
            stepCooldownRef.current = true;
            setTimeout(() => { stepCooldownRef.current = false; }, 400);
            const key = getTodayKey(resetHourRef.current);
            AsyncStorage.setItem('currentSensorSteps', sensorStepsRef.current.toString()).catch(() => {});
            AsyncStorage.setItem('currentSensorStepsDate', key).catch(() => {});
          }
        });

        // Daily reset timer
        function scheduleReset() {
          // Capture the closing period key NOW (before the reset fires)
          const closingKey = getTodayKey(resetHourRef.current);

          const now  = new Date();
          const next = new Date();
          next.setHours(resetHourRef.current, 0, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1);

          resetTimerRef.current = setTimeout(async () => {
            try {
              // Save final count for the period that just ended
              if (androidStepsRef.current > 0) {
                const updated = { ...historyRef.current, [closingKey]: androidStepsRef.current };
                historyRef.current = updated;
                setHistory(updated);
                await AsyncStorage.setItem('stepHistory', JSON.stringify(updated));
              }

              // Reset counters
              setAndroidSteps(0);
              setSensorSteps(0);
              androidStepsRef.current = 0;
              sensorStepsRef.current = 0;
              pedometerBaseRef.current = null;

              const newKey = getTodayKey(resetHourRef.current);
              await AsyncStorage.multiSet([
                ['currentSteps', '0'],
                ['currentStepsDate', newKey],
                ['currentSensorSteps', '0'],
                ['currentSensorStepsDate', newKey],
              ]);

              // Tell the service to reset
              await writeServiceFile(RESET_SIGNAL_FILE, 'reset');

              scheduleReset();
            } catch (e) {
              console.error('Reset error:', e);
            }
          }, next.getTime() - now.getTime());
        }

        scheduleReset();
      } catch (e) {
        console.error('Setup error:', e);
      }
    }

    setup();

    return () => {
      pedometerSub?.remove();
      accelSub?.remove();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetHour]);

  // ── Manual reset (triggered from Settings) ──────────────────────────────

  const handleManualReset = async () => {
    try {
      const key = getTodayKey(resetHourRef.current);

      setAndroidSteps(0);
      setSensorSteps(0);
      androidStepsRef.current = 0;
      sensorStepsRef.current = 0;
      pedometerBaseRef.current = null;

      const emptyHistory = {};
      setHistory(emptyHistory);
      historyRef.current = emptyHistory;

      await AsyncStorage.multiSet([
        ['currentSteps', '0'],
        ['currentStepsDate', key],
        ['currentSensorSteps', '0'],
        ['currentSensorStepsDate', key],
        ['stepHistory', '{}'],
      ]);

      await writeServiceFile(RESET_SIGNAL_FILE, 'reset');
    } catch (e) {
      console.error('Manual reset error:', e);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
          onReset={handleManualReset}
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
