import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { ApiError } from '@/lib/problem';
import { config, links } from '@/state/config';
import { useApi, useAuth } from '@/state/session';
import { Button, Card, Notice, Screen, Text } from '@/ui/components';
import { space } from '@/ui/theme';

/**
 * Account deletion starts here and finishes on QRX's own account page (Account → Security → Delete account), opened in
 * the same browser session the app signed in with, so the person is usually still signed in there.
 */
export default function DeleteAccount() {
  const api = useApi();
  const { signOut, method } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillThere, setStillThere] = useState(false);

  const start = async () => {
    setStillThere(false);
    await WebBrowser.openAuthSessionAsync(links.deleteAccount, config.redirectUri);
    // back in the app: if the account is gone, the API no longer knows the token
    setChecking(true);
    try {
      await api.account();
      setStillThere(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.dismissAll();
        await signOut('Your QRX account has been deleted.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen topInset={false}>
      <Text variant="body">Deleting your QRX account is permanent. It:</Text>
      <Card style={{ gap: space.md }}>
        <Text variant="body">• Removes your account and sign-in.</Text>
        <Text variant="body">• Deletes your codes. Printed codes stop sending people to your links.</Text>
        <Text variant="body">• Cancels any plan billed through the QRX website, so it doesn’t renew.</Text>
      </Card>
      <Text variant="small" tone="muted">
        You’ll finish on your QRX account page: choose Delete account at the bottom of the Security section. The privacy
        policy explains the few records we have to keep, such as invoices.
      </Text>
      {stillThere ? (
        <Notice
          title="Your account is still active"
          detail="If you meant to delete it, open the account page again and choose Delete account."
        />
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button title="Continue to delete account" kind="danger" onPress={start} loading={checking} />
        {method === 'apiKey' ? (
          <Text variant="caption" tone="muted">
            You’re signed in with an API key, so you may need to sign in on the account page first.
          </Text>
        ) : null}
        <Button title="Email support instead" kind="ghost" onPress={() => void Linking.openURL(links.supportEmail)} />
        <Button title="Cancel" kind="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
