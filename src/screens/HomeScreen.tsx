import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Theme } from '../theme';
import { DisplayMode } from './SettingsScreen';

type Props = {
  androidSteps: number;
  sensorSteps: number;
  stepGoal: number;
  theme: Theme;
  displayMode: DisplayMode;
  totalPedometerSteps: number;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
};

function formatShort(n: number): string {
  const fmt = (val: number) => {
    const s = val.toFixed(1);
    return s.endsWith('.0') ? String(Math.round(val)) : s.replace('.', ',');
  };
  if (n >= 1_000_000_000_000) return `${fmt(n / 1_000_000_000_000)} Billionen`;
  if (n >= 1_000_000_000)     return `${fmt(n / 1_000_000_000)} Milliarden`;
  if (n >= 1_000_000)         return `${fmt(n / 1_000_000)} Millionen`;
  if (n >= 1_000)             return `${fmt(n / 1_000)} Tausend`;
  return String(n);
}

export default function HomeScreen({
  androidSteps,
  sensorSteps,
  stepGoal,
  theme,
  displayMode,
  totalPedometerSteps,
  onOpenSettings,
  onOpenCalendar,
}: Props) {
  const averageSteps = Math.round((androidSteps + sensorSteps) / 2);
  const activeSteps =
    displayMode === 'sensor'  ? sensorSteps :
    displayMode === 'average' ? averageSteps :
    androidSteps; // 'android' and 'both' use android as primary
  const progress = Math.min((activeSteps / stepGoal) * 100, 100);
  const progressText = progress.toFixed(0);
  const goalReached = activeSteps >= stepGoal;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>FitTracker</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={onOpenCalendar}
            style={[styles.headerButton, { backgroundColor: theme.card }]}
          >
            <Text style={styles.headerButtonIcon}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenSettings}
            style={[styles.headerButton, { backgroundColor: theme.card }]}
          >
            <Text style={styles.headerButtonIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Ziel Fortschritt Card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalEmoji}>{goalReached ? '🎉' : '🏃'}</Text>
          <View style={styles.goalNumbers}>
            <Text style={[styles.goalCurrent, { color: goalReached ? '#4CAF50' : theme.text }]}>
              {activeSteps.toLocaleString()}
            </Text>
            <Text style={[styles.goalSeparator, { color: theme.subtext }]}>
              {' / '}{stepGoal.toLocaleString()} Schritte
            </Text>
          </View>
          <Text style={[styles.goalPercent, { color: goalReached ? '#4CAF50' : theme.subtext }]}>
            {progressText}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[
            styles.progressFill,
            {
              width: `${progress}%` as any,
              backgroundColor: goalReached ? '#4CAF50' : '#2196F3',
            }
          ]} />
        </View>
        {goalReached && (
          <Text style={[styles.goalReachedText, { color: '#4CAF50' }]}>
            Tagesziel erreicht! 🎉
          </Text>
        )}
      </View>

      {/* Beide anzeigen */}
      {displayMode === 'both' && (
        <>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardTitle, { color: theme.subtext }]}>Android Pedometer</Text>
            <Text style={[styles.steps, { color: '#4CAF50' }]}>{androidSteps}</Text>
            <Text style={[styles.label, { color: theme.subtext }]}>Schritte (OS)</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardTitle, { color: theme.subtext }]}>Eigener Algorithmus</Text>
            <Text style={[styles.steps, { color: '#2196F3' }]}>{sensorSteps}</Text>
            <Text style={[styles.label, { color: theme.subtext }]}>Schritte (Sensor)</Text>
          </View>
        </>
      )}

      {/* Nur Android */}
      {displayMode === 'android' && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.subtext }]}>Android Pedometer</Text>
          <Text style={[styles.steps, { color: '#4CAF50' }]}>{androidSteps}</Text>
          <Text style={[styles.label, { color: theme.subtext }]}>Schritte (OS)</Text>
        </View>
      )}

      {/* Nur Sensor */}
      {displayMode === 'sensor' && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.subtext }]}>Eigener Algorithmus</Text>
          <Text style={[styles.steps, { color: '#2196F3' }]}>{sensorSteps}</Text>
          <Text style={[styles.label, { color: theme.subtext }]}>Schritte (Sensor)</Text>
        </View>
      )}

      {/* Durchschnitt */}
      {displayMode === 'average' && (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.subtext }]}>Durchschnitt</Text>
          <Text style={[styles.steps, { color: '#FF9800' }]}>{averageSteps}</Text>
          <Text style={[styles.label, { color: theme.subtext }]}>
            Ø Android & Sensor
          </Text>
          <Text style={[styles.subInfo, { color: theme.subtext }]}>
            📱 {androidSteps}  •  🔵 {sensorSteps}
          </Text>
        </View>
      )}

      {/* Gerät-Lifetime-Schritte */}
      {totalPedometerSteps > 0 && (
        <View style={[styles.lifetimeBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.lifetimeText, { color: theme.subtext }]}>
            Mit diesem Gerät bist du schon{' '}
            <Text style={{ color: theme.text, fontWeight: '600' }}>
              {totalPedometerSteps.toLocaleString('de-DE')}
            </Text>
            {' '}Schritte gelaufen – das sind etwa{' '}
            <Text style={{ color: theme.text, fontWeight: '600' }}>
              {formatShort(totalPedometerSteps)}
            </Text>
            .
          </Text>
        </View>
      )}

    </View>
  );
}

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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerButtonIcon: {
    fontSize: 22,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  goalEmoji: {
    fontSize: 24,
  },
  goalNumbers: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  goalCurrent: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  goalSeparator: {
    fontSize: 14,
    marginLeft: 2,
  },
  goalPercent: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalReachedText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
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
  subInfo: {
    fontSize: 13,
    marginTop: 8,
  },
  warningCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    width: '80%',
    borderWidth: 1,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
  },
  lifetimeBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '80%',
  },
  lifetimeText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});