import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Switch } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

const RESET_HOURS = [0, 1, 2, 3, 4, 5, 6];

export default function App() {
  const [androidSteps, setAndroidSteps] = useState(0);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [stepCooldown, setStepCooldown] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Standard: Dark Mode
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [resetHour, setResetHour] = useState(4); // Standard: 4 Uhr
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Einstellungen laden
  useEffect(() => {
    async function loadSettings() {
      const savedDark = await AsyncStorage.getItem('darkMode');
      const savedReset = await AsyncStorage.getItem('resetHour');
      if (savedDark !== null) setDarkMode(JSON.parse(savedDark));
      if (savedReset !== null) setResetHour(JSON.parse(savedReset));
    }
    loadSettings();
  }, []);

  // Einstellungen speichern
  useEffect(() => {
    AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    AsyncStorage.setItem('resetHour', JSON.stringify(resetHour));
  }, [resetHour]);

  // Täglicher Reset
  useEffect(() => {
    function scheduleReset() {
      const now = new Date();
      const next = new Date();
      next.setHours(resetHour, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1); // Morgen
      const msUntilReset = next.getTime() - now.getTime();

      resetTimerRef.current = setTimeout(() => {
        setAndroidSteps(0);
        setSensorSteps(0);
        scheduleReset(); // Nächsten Tag planen
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

  const theme = darkMode ? dark : light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>FitTracker</Text>
        <TouchableOpacity
          onPress={() => setSettingsVisible(true)}
          style={[styles.gearButton, { backgroundColor: theme.card }]}
        >
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Android Pedometer Card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.subtext }]}>Android Pedometer</Text>
        <Text style={[styles.steps, { color: '#4CAF50' }]}>{androidSteps}</Text>
        <Text style={[styles.label, { color: theme.subtext }]}>Schritte (OS)</Text>
      </View>

      {/* Eigener Algorithmus Card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.subtext }]}>Eigener Algorithmus</Text>
        <Text style={[styles.steps, { color: '#2196F3' }]}>{sensorSteps}</Text>
        <Text style={[styles.label, { color: theme.subtext }]}>Schritte (Sensor)</Text>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Einstellungen</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.subtext }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Dark Mode */}
            <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor='#fff'
              />
            </View>

            {/* Reset Uhrzeit */}
            <View style={styles.settingBlock}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Täglicher Reset um {resetHour}:00 Uhr
              </Text>
              <View style={styles.hourPicker}>
                {RESET_HOURS.map(hour => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setResetHour(hour)}
                    style={[
                      styles.hourButton,
                      { backgroundColor: theme.background },
                      resetHour === hour && styles.hourButtonActive,
                    ]}
                  >
                    <Text style={[
                      styles.hourText,
                      { color: theme.subtext },
                      resetHour === hour && styles.hourTextActive,
                    ]}>
                      {hour}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const light = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#111111',
  subtext: '#888888',
  border: '#eeeeee',
};

const dark = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  subtext: '#aaaaaa',
  border: '#333333',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  gearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  gearIcon: {
    fontSize: 22,
  },
  card: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  steps: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingBlock: {
    paddingVertical: 16,
  },
  hourPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  hourButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hourButtonActive: {
    backgroundColor: '#4CAF50',
  },
  hourText: {
    fontSize: 14,
  },
  hourTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});