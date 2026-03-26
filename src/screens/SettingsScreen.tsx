import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  resetHour: number;
  setResetHour: (value: number) => void;
  stepGoal: number;
  setStepGoal: (value: number) => void;
  onClose: () => void;
};

const RESET_HOURS = [0, 1, 2, 3, 4, 5, 6];
const STEP_GOALS = [5000, 10000, 15000, 20000];

export default function SettingsScreen({
  theme,
  darkMode,
  setDarkMode,
  resetHour,
  setResetHour,
  stepGoal,
  setStepGoal,
  onClose,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.backButton, { color: '#4CAF50' }]}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Einstellungen</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Dark Mode */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>DARSTELLUNG</Text>
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor='#fff'
            />
          </View>
        </View>

        {/* Schrittziel */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>TAGESZIEL</Text>
          <View style={styles.goalGrid}>
            {STEP_GOALS.map(goal => (
              <TouchableOpacity
                key={goal}
                onPress={() => setStepGoal(goal)}
                style={[
                  styles.goalButton,
                  { backgroundColor: theme.background },
                  stepGoal === goal && styles.goalButtonActive,
                ]}
              >
                <Text style={[
                  styles.goalText,
                  { color: theme.subtext },
                  stepGoal === goal && styles.goalTextActive,
                ]}>
                  {goal.toLocaleString()}
                </Text>
                <Text style={[
                  styles.goalSubtext,
                  { color: theme.subtext },
                  stepGoal === goal && styles.goalTextActive,
                ]}>
                  Schritte
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reset Uhrzeit */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.subtext }]}>TÄGLICHER RESET</Text>
          <Text style={[styles.resetInfo, { color: theme.subtext }]}>
            Schritte werden täglich um {resetHour}:00 Uhr zurückgesetzt
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

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    width: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goalButtonActive: {
    backgroundColor: '#4CAF50',
  },
  goalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  goalSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  goalTextActive: {
    color: '#fff',
  },
  resetInfo: {
    fontSize: 14,
  },
  hourPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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