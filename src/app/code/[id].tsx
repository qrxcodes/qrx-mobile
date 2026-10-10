import * as Haptics from 'expo-haptics';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ago, displayLink, isFinished, progressStage, styleName } from '@/lib/format';
import { describeProblem, toProblem } from '@/lib/problem';
import type { Code } from '@/lib/types';
import { useJobs } from '@/state/jobs';
import { copyLink, saveToPhotos, shareImage, shareLink } from '@/state/media';
import { notificationPermission, requestNotificationPermission, type NotifyPermission } from '@/state/notifications';
import { useAccount, useCode, useStyles } from '@/state/queries';
import { CodeImage } from '@/ui/code-image';
import { ActionTile, Button, Card, Group, Icon, Notice, Row, Screen, Text, icons } from '@/ui/components';
import { radius, space, useTheme } from '@/ui/theme';
import { useToast } from '@/ui/toast';

export default function CodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCode(id);
  const jobs = useJobs();
  const code = query.data;

  // follow a code that is still being made, wherever it was opened from
  useEffect(() => {
    if (code && !isFinished(code)) jobs.track(code);
  }, [code, jobs]);

  if (query.isError && !code) {
    const shown = describeProblem(toProblem(query.error));
    return (
      <Screen topInset={false}>
        <Notice
          title={shown.title}
          detail={shown.detail}
          tone="danger"
          action={<Button title="Try again" compact kind="secondary" onPress={() => query.refetch()} />}
        />
      </Screen>
    );
  }
  if (!code) return <Screen topInset={false}>{null}</Screen>;
  if (code.status === 'succeeded') return <Finished code={code} />;
  if (code.status === 'failed') return <Failed code={code} />;
  return <InProgress code={code} />;
}

function InProgress({ code }: { code: Code }) {
  const { c } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState<NotifyPermission | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    void notificationPermission().then(setPermission);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, (now - Date.parse(code.createdAt)) / 1000);
  const { label, fraction } = progressStage(elapsed);
  const bar = useAnimatedStyle(
    () => ({ transform: [{ scaleX: withTiming(fraction, { duration: 900 }) }] }),
    [fraction],
  );

  return (
    <Screen topInset={false}>
      <CodeImage imageUrl={null} rounded={radius.xl} />
      <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
        <Text variant="title">{label}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.sunken, overflow: 'hidden' }}>
          <Animated.View
            style={[{ height: 6, width: '100%', backgroundColor: c.accent, transformOrigin: 'left' }, bar]}
          />
        </View>
        <Text variant="small" tone="muted">
          A code takes about a minute. QRX paints the picture, builds your link into it, then checks that it scans.
        </Text>
      </View>
      <Card style={{ gap: space.md }}>
        <Text variant="bodyStrong">You can leave this screen</Text>
        <Text variant="small" tone="muted">
          QRX keeps going, and the finished code appears in My codes.
          {permission === 'granted' ? ' We’ll send a notification when it’s ready.' : ''}
        </Text>
        {permission === 'undetermined' ? (
          <Button
            title="Notify me when it’s ready"
            kind="secondary"
            compact
            icon={icons.bell}
            onPress={async () => setPermission(await requestNotificationPermission())}
          />
        ) : null}
      </Card>
      <Text variant="small" tone="muted" numberOfLines={3}>
        “{code.prompt}”
      </Text>
    </Screen>
  );
}

function Failed({ code }: { code: Code }) {
  return (
    <Screen topInset={false}>
      <Notice
        title="This one didn’t work out"
        detail={code.error?.message ?? 'QRX could not make a code that scans from that prompt. Try another prompt.'}
        tone="danger"
      />
      <Text variant="body" tone="muted">
        “{code.prompt}”
      </Text>
      <Button
        title="Try again"
        icon={icons.retry}
        onPress={() =>
          router.navigate({
            pathname: '/',
            params: { prompt: code.prompt, destination: code.destination ?? '', style: code.style ?? '' },
          })
        }
      />
    </Screen>
  );
}

function Finished({ code }: { code: Code }) {
  const { c } = useTheme();
  const account = useAccount();
  const styles = useStyles();
  const toast = useToast();
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    // a code that just finished on this screen gets a little tap
    if (!celebrated.current && Date.now() - Date.parse(code.createdAt) < 5 * 60_000) {
      celebrated.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [code.createdAt]);

  const run = async (kind: 'share' | 'save') => {
    setBusy(kind);
    try {
      if (kind === 'share') await shareImage(code);
      else {
        const result = await saveToPhotos(code);
        if (result === 'denied') {
          Alert.alert('Allow QRX to add photos', 'Turn on photo access for QRX in Settings to save codes to Photos.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ]);
        } else toast.show(Platform.OS === 'ios' ? 'Saved to Photos' : 'Saved to your gallery');
      }
    } catch (err) {
      toast.show(describeProblem(toProblem(err)).title);
    } finally {
      setBusy(null);
    }
  };

  const canChange = account.data?.features.changeDestination === true;
  const style = styleName(styles.data, code.style);

  return (
    <View style={{ flex: 1 }}>
      <Screen topInset={false}>
        <Animated.View
          entering={FadeIn.duration(350)}
          style={{
            shadowColor: c.shadow,
            shadowOpacity: 0.45,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 14 },
            elevation: 8,
          }}
        >
          <CodeImage imageUrl={code.imageUrl} rounded={radius.xl} label={`QR code: ${code.prompt}`} />
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Short link ${displayLink(code.shortUrl)}. Copy`}
          onPress={async () => {
            await copyLink(code);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toast.show('Link copied');
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            alignSelf: 'center',
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            borderRadius: radius.pill,
            backgroundColor: pressed ? c.accentSoft : c.surface,
            borderWidth: 1,
            borderColor: c.line,
          })}
        >
          <Icon name={icons.check} size={16} color={c.success} />
          <Text variant="bodyStrong">{displayLink(code.shortUrl)}</Text>
          <Icon name={icons.copy} size={15} color={c.muted} />
        </Pressable>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: -space.md }}>
          Checked to scan
        </Text>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <ActionTile label="Share" icon={icons.share} busy={busy === 'share'} onPress={() => run('share')} />
          <ActionTile label="Save" icon={icons.save} busy={busy === 'save'} onPress={() => run('save')} />
          <ActionTile
            label="Copy link"
            icon={icons.link}
            onPress={async () => {
              await copyLink(code);
              toast.show('Link copied');
            }}
          />
        </View>

        <Group title="Where it points">
          <Row title={displayLink(code.destination)} detail="Scans go here, through the code’s qrx.to link" />
          {canChange ? (
            <Link href={{ pathname: '/destination/[id]', params: { id: code.id } }} asChild>
              <Row title="Change link" icon={icons.edit} />
            </Link>
          ) : (
            <Row
              title="Change link"
              detail="Changing where a code points is available on a paid plan."
              icon={icons.lock}
            />
          )}
          <Row title="Share link" icon={icons.share} onPress={() => void shareLink(code)} />
        </Group>

        <Group title="Details">
          <Row title="Picture" detail={code.prompt} />
          {style ? <Row title="Style" detail={style} /> : null}
          <Row title="Created" detail={ago(code.createdAt)} />
        </Group>

        <Link href={{ pathname: '/report/[id]', params: { id: code.id } }} asChild>
          <Row title="Report a problem with this image" icon={icons.flag} />
        </Link>
      </Screen>
      {toast.element}
    </View>
  );
}
