import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { describeProblem, toProblem } from '@/lib/problem';
import { useApi } from '@/state/session';
import { Button, Field, Notice, Text } from '@/ui/components';
import { space, useTheme } from '@/ui/theme';

/**
 * Report a picture as offensive or harmful, without leaving the app. Reports go to the QRX team, who review them and
 * use them to improve filtering.
 */
export default function ReportImage() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setState('sending');
    setError(null);
    try {
      await api.reportCode(id, reason);
      setState('sent');
    } catch (err) {
      setError(describeProblem(toProblem(err)).detail);
      setState('idle');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: space.xl, gap: space.lg }}>
      <Text variant="title">Report this image</Text>
      {state === 'sent' ? (
        <>
          <Notice title="Thanks, we’ve got it" detail="The QRX team will review this image." tone="success" />
          <Button title="Done" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text variant="body" tone="muted">
            If this picture is offensive, harmful or not what you asked for, let us know. The QRX team reviews every
            report.
          </Text>
          <Field
            label="What’s wrong? (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Tell us briefly"
            multiline
            maxLength={500}
          />
          {error ? <Notice title="Not sent" detail={error} tone="danger" /> : null}
          <Button title="Send report" onPress={send} loading={state === 'sending'} />
        </>
      )}
    </View>
  );
}
