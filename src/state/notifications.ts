import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderDelaySeconds } from '@/lib/format';
import type { Code } from '@/lib/types';

/**
 * "Your code is ready" notifications, all scheduled on the device: no push token or device id leaves the phone.
 *
 * iOS suspends an app soon after it goes to the background, so the app can't reliably watch a code finish from there.
 * Two notifications cover it:
 * - when the app leaves the foreground with a code still being made, a reminder is scheduled for about when the code
 *   should be done ("should be ready"); it is cancelled if the app comes back first or sees the code finish;
 * - if the app is still running in the background when the code finishes (common on Android), it says so at once.
 */

const CHANNEL = 'codes';
const reminderId = (codeId: string) => `ready-${codeId}`;

export function configureNotifications() {
  // in the foreground the screen itself shows the code, so no banner
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Finished codes',
      description: 'When a QR code you started is ready',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export type NotifyPermission = 'granted' | 'denied' | 'undetermined';

export async function notificationPermission(): Promise<NotifyPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function scheduleReadyReminder(code: Pick<Code, 'id' | 'createdAt'>) {
  if ((await notificationPermission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(code.id),
    content: {
      title: 'Your QR code should be ready',
      body: 'Tap to see how it turned out.',
      data: { codeId: code.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: reminderDelaySeconds(code.createdAt),
      channelId: CHANNEL,
    },
  });
}

export async function cancelReadyReminder(codeId: string) {
  await Notifications.cancelScheduledNotificationAsync(reminderId(codeId)).catch(() => undefined);
}

export async function notifyFinished(code: Code) {
  if ((await notificationPermission()) !== 'granted') return;
  await cancelReadyReminder(code.id);
  const ok = code.status === 'succeeded';
  await Notifications.scheduleNotificationAsync({
    identifier: `done-${code.id}`,
    content: {
      title: ok ? 'Your QR code is ready' : "Your QR code didn't work out",
      body: ok ? 'It scans. Tap to share it or save it to Photos.' : 'Tap to try another prompt.',
      data: { codeId: code.id },
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}

/** Calls back with the code id when someone taps one of these notifications (including the one that opened the app). */
export function onNotificationTap(handler: (codeId: string) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const codeId = response?.notification.request.content.data?.codeId;
    if (typeof codeId === 'string') handler(codeId);
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    handle(last);
    Notifications.clearLastNotificationResponse();
  }
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
