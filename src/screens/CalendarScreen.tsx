import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  stepGoal: number;
  history: Record<string, number>;
  onClose: () => void;
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarScreen({ theme, stepGoal, history, onClose }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function getDateKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getDayColor(day: number) {
    const dateObj = new Date(viewYear, viewMonth, day);
    dateObj.setHours(0, 0, 0, 0);
    const todayClean = new Date();
    todayClean.setHours(0, 0, 0, 0);
    if (dateObj > todayClean) return 'transparent';
    const key = getDateKey(day);
    if (!history[key]) return theme.border;
    return history[key] >= stepGoal ? '#4CAF50' : '#f44336';
  }

  function getDaySteps(day: number) {
    return history[getDateKey(day)] || 0;
  }

  function isToday(day: number) {
    return day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear();
  }

  function isFuture(day: number) {
    const dateObj = new Date(viewYear, viewMonth, day);
    dateObj.setHours(0, 0, 0, 0);
    const todayClean = new Date();
    todayClean.setHours(0, 0, 0, 0);
    return dateObj > todayClean;
  }

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.backButton, { color: '#4CAF50' }]}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Verlauf</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Monatsnavigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Wochentage */}
        <View style={styles.weekdays}>
          {WEEKDAYS.map(day => (
            <Text key={day} style={[styles.weekday, { color: theme.subtext }]}>{day}</Text>
          ))}
        </View>

        {/* Kalender Grid */}
        <View style={styles.grid}>
          {blanks.map((_, i) => (
            <View key={`blank-${i}`} style={styles.dayCell} />
          ))}
          {days.map(day => {
            const color = getDayColor(day);
            const steps = getDaySteps(day);
            const future = isFuture(day);
            const textColor = future || color === theme.border
              ? theme.subtext
              : '#fff';

            return (
              <View
                key={day}
                style={[
                  styles.dayCell,
                  { backgroundColor: color },
                  isToday(day) && { borderWidth: 2, borderColor: '#4CAF50' },
                ]}
              >
                <Text style={[styles.dayNumber, { color: textColor },
                  isToday(day) && { fontWeight: 'bold' }]}>
                  {day}
                </Text>
                {steps > 0 && !future && (
                  <Text style={styles.daySteps}>
                    {steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Legende */}
        <View style={[styles.legend, { backgroundColor: theme.card }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: theme.subtext }]}>Ziel erreicht</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f44336' }]} />
            <Text style={[styles.legendText, { color: theme.subtext }]}>Ziel nicht erreicht</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.border }]} />
            <Text style={[styles.legendText, { color: theme.subtext }]}>Keine Daten</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { fontSize: 16, fontWeight: '600', width: 80 },
  title: { fontSize: 20, fontWeight: 'bold' },
  scroll: { padding: 20, gap: 20 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: { padding: 8 },
  navArrow: { fontSize: 28, fontWeight: 'bold' },
  monthTitle: { fontSize: 20, fontWeight: 'bold' },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekday: { width: 40, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: {
    width: 44,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayNumber: { fontSize: 14, fontWeight: '500' },
  daySteps: { fontSize: 9, color: '#fff', marginTop: 2 },
  legend: { borderRadius: 12, padding: 16, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 14 },
});