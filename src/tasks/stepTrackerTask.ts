import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_CHANNEL_ID = 'step-tracker-channel';

// Notification Channel einrichten (für Android)
export async function setupNotificationChannel() {
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Step Tracker',
    importance: Notifications.AndroidImportance.LOW,
    description: 'Shows step tracking progress',
    sound: false,
    vibrationPattern: [],
    showBadge: false,
  });
}

// Berechtigungen für Notifications
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Notification aktualisieren
export async function updateStepNotification(steps: number, stepGoal: number) {
  const progress = Math.round((steps / stepGoal) * 100);

  try {
    await Notifications.presentNotificationAsync({
      title: '🏃 FitTracker',
      body: `${steps.toLocaleString()} Schritte heute • Ziel: ${progress}%`,
      data: { screen: 'home' },
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        ongoing: true,
      },
    });
  } catch (e) {
    console.warn('Could not update notification:', e);
  }
}

// Task starten (hier für Zukunft - aktuell nicht verwendet)
export async function startStepTrackerTask() {
  await setupNotificationChannel();
  const hasPermission = await requestNotificationPermissions();
  return hasPermission;
}

// Task stoppen
export async function stopStepTrackerTask() {
  await Notifications.dismissAllNotificationsAsync();
}