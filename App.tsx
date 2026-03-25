import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Switch } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

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
  const [androidSteps, setAndroidSteps] = useState(0);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [stepCooldown, setStepCooldown] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

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

            <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={darkMode ? '#fff' : '#fff'}
              />
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
  settingLabel: {
    fontSize: 16,
  },
});