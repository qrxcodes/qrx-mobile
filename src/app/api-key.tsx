import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toProblem } from '@/lib/problem';
import { useAuth } from '@/state/session';
import { Button, Field, Text } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/** Sign in with an API key from qrx.codes/developers/keys, for developers and for testing. */
export default function ApiKeySheet() {
  const { c } = useTheme();
  const { signInWithApiKey } = useAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithApiKey(key);
      router.dismissAll();
    } catch (err) {
      setError(toProblem(err).detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: space.xl, gap: space.lg }}>
      <Text variant="title">Use an API key</Text>
      <Text variant="body" tone="muted">
        Paste a key from the Developers section of qrx.codes. The app makes codes with it as your account.
      </Text>
      <Field
        label="API key"
        value={key}
        onChangeText={setKey}
        placeholder="qrx_…"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        error={error}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!key.trim()} />
    </View>
  );
}
