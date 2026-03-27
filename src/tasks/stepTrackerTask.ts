import * as Notifications from 'expo-notifications';

const NOTIFICATION_CHANNEL_ID = 'step-tracker-channel';

export async function setupNotificationChannel() {
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Step Tracker',
    importance: Notifications.AndroidImportance.LOW,
    description: 'Shows step tracking progress',
    sound: undefined,
    vibrationPattern: [],
    showBadge: false,
  });
}

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
