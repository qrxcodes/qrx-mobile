import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MAX_PROMPT_LENGTH, allowanceLine, normaliseLink, orderStyles, resetsIn } from '@/lib/format';
import { createWithRetry } from '@/lib/poll';
import { describeProblem, toProblem } from '@/lib/problem';
import type { ProblemInfo } from '@/lib/types';
import { useJobs } from '@/state/jobs';
import { queryKeys, useAccount, useStyles } from '@/state/queries';
import { useApi } from '@/state/session';
import { Button, Field, Notice, Screen, Text } from '@/ui/components';
import { StyleGrid } from '@/ui/style-grid';
import { space } from '@/ui/theme';

const NO_STYLE = 'Noop';

export default function Create() {
  const api = useApi();
  const jobs = useJobs();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ prompt?: string; destination?: string; style?: string }>();
  const account = useAccount();
  const styles = useStyles();

  const [prompt, setPrompt] = useState('');
  const [link, setLink] = useState('');
  const [style, setStyle] = useState(NO_STYLE);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const [busy, setBusy] = useState(false);

  // "Try again" from a failed code fills the form with what was asked for
  const prefill = JSON.stringify([params.prompt, params.destination, params.style]);
  const [applied, setApplied] = useState(JSON.stringify([]));
  if (prefill !== applied) {
    setApplied(prefill);
    if (params.prompt) setPrompt(params.prompt);
    if (params.destination) setLink(params.destination);
    if (params.style) setStyle(params.style);
  }

  const remaining = account.data?.codes.remainingToday;
  const outOfCodes = remaining !== null && remaining !== undefined && remaining <= 0;
  const allowance = allowanceLine(account.data);

  const submit = async () => {
    setProblem(null);
    const destination = normaliseLink(link);
    if (!destination) {
      setLinkError('Enter a web address, like example.com/menu');
      return;
    }
    setLinkError(null);
    setBusy(true);
    try {
      const code = await createWithRetry(
        api,
        { prompt: prompt.trim(), destination, ...(style !== NO_STYLE ? { style } : {}) },
        Crypto.randomUUID(),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.setQueryData(queryKeys.code(code.id), code);
      void queryClient.invalidateQueries({ queryKey: queryKeys.codes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.account });
      jobs.track(code);
      setPrompt('');
      router.push({ pathname: '/code/[id]', params: { id: code.id } });
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setProblem(toProblem(err));
      void queryClient.invalidateQueries({ queryKey: queryKeys.account });
    } finally {
      setBusy(false);
    }
  };

  const shown = problem ? describeProblem(problem) : null;
  const when = resetsIn(account.data?.codes.resetsAt);

  return (
    <Screen
      title="Create"
      subtitle="Describe a picture and add your link. Each code is checked to scan before you get it."
    >
      <Field
        label="Picture"
        value={prompt}
        onChangeText={setPrompt}
        placeholder="A lighthouse on a rocky coast at dawn, soft watercolour"
        multiline
        maxLength={MAX_PROMPT_LENGTH}
        hint="Describe the picture you want. QRX takes care of the code."
        accessibilityHint="The picture your QR code will be painted as"
      />
      <Field
        label="Link"
        value={link}
        onChangeText={(text) => {
          setLink(text);
          if (linkError) setLinkError(null);
        }}
        placeholder="example.com/menu"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="URL"
        error={linkError}
        hint="Where people go when they scan. Your code gets its own qrx.to link."
      />
      <View style={{ gap: space.sm }}>
        <Text variant="label">Style</Text>
        {styles.data ? (
          <StyleGrid styles={orderStyles(styles.data)} value={style} onChange={setStyle} />
        ) : styles.isError ? (
          <Text variant="small" tone="muted">
            Styles couldn’t load. You can still create a code without one.
          </Text>
        ) : (
          <View style={{ height: 120 }} />
        )}
      </View>

      {shown ? (
        <Notice
          title={shown.title}
          detail={problem?.type === 'daily-limit' && when ? `Your allowance resets ${when}.` : shown.detail}
          tone={problem?.type === 'daily-limit' ? 'warning' : 'danger'}
        />
      ) : outOfCodes ? (
        <Notice title="You've used today's codes" detail={when ? `Your allowance resets ${when}.` : undefined} />
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          title="Create code"
          icon={{ ios: 'sparkles', android: 'auto_awesome' }}
          onPress={submit}
          loading={busy}
          disabled={!prompt.trim() || !link.trim() || outOfCodes}
        />
        {allowance && !outOfCodes ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {allowance}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
