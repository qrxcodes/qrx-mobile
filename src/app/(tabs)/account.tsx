import { useFocusEffect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, View } from 'react-native';

import { resetsIn } from '@/lib/format';
import { describeProblem, toProblem } from '@/lib/problem';
import { config, links } from '@/state/config';
import { notificationPermission, requestNotificationPermission, type NotifyPermission } from '@/state/notifications';
import { useAccount } from '@/state/queries';
import { useAuth } from '@/state/session';
import { Card, Group, Notice, Row, Screen, Text, icons } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

export default function AccountScreen() {
  const { c } = useTheme();
  const { signOut, method } = useAuth();
  const account = useAccount();
  const [permission, setPermission] = useState<NotifyPermission | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void notificationPermission().then(setPermission);
    }, []),
  );

  const codes = account.data?.codes;
  const limited = codes?.dailyLimit !== null && codes?.dailyLimit !== undefined;
  const used = limited ? Math.max(0, codes!.dailyLimit! - (codes!.remainingToday ?? 0)) : 0;
  const when = resetsIn(codes?.resetsAt);

  const open = (url: string) => void WebBrowser.openBrowserAsync(url);

  return (
    <Screen
      title="Account"
      refreshControl={
        <RefreshControl
          tintColor={c.accent}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await account.refetch();
            setRefreshing(false);
          }}
        />
      }
    >
      {account.isError ? (
        <Notice
          title={describeProblem(toProblem(account.error)).title}
          detail={describeProblem(toProblem(account.error)).detail}
          tone="danger"
        />
      ) : null}

      <Card style={{ gap: space.md }}>
        <Text variant="label" tone="muted" style={{ textTransform: 'uppercase' }}>
          Today
        </Text>
        {!account.data ? (
          <View style={{ height: 64 }} />
        ) : limited ? (
          <>
            <Text variant="title">
              {codes!.remainingToday} of {codes!.dailyLimit} codes left
            </Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sunken, overflow: 'hidden' }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.accent,
                  width: `${Math.min(100, (used / Math.max(1, codes!.dailyLimit!)) * 100)}%`,
                }}
              />
            </View>
            {when ? (
              <Text variant="small" tone="muted">
                Your allowance resets {when}.
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="title">No daily limit</Text>
        )}
        {account.data ? (
          <Text variant="small" tone="muted">
            {account.data.features.changeDestination
              ? 'You can change where your codes point.'
              : 'Changing where a code points is available on a paid plan.'}
          </Text>
        ) : null}
      </Card>

      <Group title="Settings">
        <Row
          title="Notifications"
          detail={
            permission === 'granted'
              ? 'On: we’ll tell you when a code is ready'
              : permission === 'denied'
                ? 'Off. Turn them on in Settings'
                : 'Get a notification when a code is ready'
          }
          icon={icons.bell}
          onPress={async () => {
            if (permission === 'undetermined') setPermission(await requestNotificationPermission());
            else void Linking.openSettings();
          }}
        />
      </Group>

      <Group title="Help and legal">
        <Row
          title="Help and support"
          detail="support@qrx.codes"
          icon={icons.help}
          onPress={() => void Linking.openURL(links.supportEmail)}
        />
        <Row title="Privacy policy" icon={icons.lock} onPress={() => open(links.privacy)} />
        <Row title="Terms of service" icon={icons.doc} onPress={() => open(links.terms)} />
      </Group>

      <Group>
        <Row
          title="Sign out"
          icon={icons.signOut}
          detail={method === 'apiKey' ? 'Signed in with an API key' : undefined}
          onPress={() =>
            Alert.alert('Sign out of QRX?', 'Your codes stay in your account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
            ])
          }
        />
        <Row title="Delete account" icon={icons.trash} tone="danger" onPress={() => router.push('/delete-account')} />
      </Group>

      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        QRX {config.version}
        {config.variant === 'development' ? ' · dev.qrx.codes' : ''} · Made by MakerX
      </Text>
    </Screen>
  );
}
