import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { displayLink, normaliseLink } from '@/lib/format';
import { describeProblem, toProblem } from '@/lib/problem';
import { queryKeys, useCode } from '@/state/queries';
import { useApi } from '@/state/session';
import { Button, Field, Notice, Text } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/** Change where a code points. The printed code stays the same: its qrx.to link now sends scans somewhere else. */
export default function ChangeDestination() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const queryClient = useQueryClient();
  const code = useCode(id).data;
  const [link, setLink] = useState(code?.destination ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const destination = normaliseLink(link);
    if (!destination) {
      setError('Enter a web address, like example.com/menu');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.changeDestination(id, destination);
      queryClient.setQueryData(queryKeys.code(id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.codes });
      router.back();
    } catch (err) {
      setError(describeProblem(toProblem(err)).detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: space.xl, gap: space.lg }}>
      <Text variant="title">Change link</Text>
      <Text variant="body" tone="muted">
        Your printed code keeps working. Scans of {displayLink(code?.shortUrl)} will go to the new link.
      </Text>
      <Field
        label="New link"
        value={link}
        onChangeText={setLink}
        placeholder="example.com/new-page"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        textContentType="URL"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      {error ? <Notice title="Not changed" detail={error} tone="danger" /> : null}
      <Button title="Save" onPress={save} loading={busy} disabled={!link.trim() || link.trim() === code?.destination} />
    </View>
  );
}
