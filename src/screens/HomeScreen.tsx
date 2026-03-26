import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Theme } from '../theme';

type Props = {
  androidSteps: number;
  sensorSteps: number;
  stepGoal: number;
  theme: Theme;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
};

export default function HomeScreen({
  androidSteps,
  sensorSteps,
  stepGoal,
  theme,
  onOpenSettings,
  onOpenCalendar,
}: Props) {
  const progress = Math.min((androidSteps / stepGoal) * 100, 100).toFixed(0);

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

      {/* Android Pedometer Card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.subtext }]}>Android Pedometer</Text>
        <Text style={[styles.steps, { color: '#4CAF50' }]}>{androidSteps}</Text>
        <Text style={[styles.label, { color: theme.subtext }]}>Schritte (OS)</Text>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <Text style={[styles.goalText, { color: theme.subtext }]}>
          {progress}% von {stepGoal.toLocaleString()} Schritten
        </Text>
      </View>

      {/* Eigener Algorithmus Card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardTitle, { color: theme.subtext }]}>Eigener Algorithmus</Text>
        <Text style={[styles.steps, { color: '#2196F3' }]}>{sensorSteps}</Text>
        <Text style={[styles.label, { color: theme.subtext }]}>Schritte (Sensor)</Text>
      </View>

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
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 13,
    marginTop: 6,
  },
});