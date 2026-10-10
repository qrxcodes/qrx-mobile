import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { links } from '@/state/config';
import { useAuth } from '@/state/session';
import { CodeImage } from '@/ui/code-image';
import { Button, Mark, Notice, Text } from '@/ui/components';
import { MAX_CONTENT_WIDTH, space, useTheme } from '@/ui/theme';

const showcase = ['mock:06-red-fox-birches', 'mock:hv8551', 'mock:16-neon-koi-pond'];

export default function SignIn() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signIn, signingIn, message } = useAuth();
  const tile = Math.min((Math.min(width, MAX_CONTENT_WIDTH) - space.lg * 2 - space.md * 2) / 3, 180);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.lg,
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Mark size={26} />
          <Text variant="title" style={{ fontSize: 22 }}>
            QRX
          </Text>
        </View>

        <View style={{ gap: space.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.md }}>
            {showcase.map((image, i) => (
              <View
                key={image}
                style={{
                  transform: [
                    { rotate: i === 0 ? '-5deg' : i === 2 ? '5deg' : '0deg' },
                    { translateY: i === 1 ? -10 : 6 },
                  ],
                  shadowColor: c.shadow,
                  shadowOpacity: 0.5,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}
              >
                <CodeImage imageUrl={image} size={i === 1 ? tile * 1.12 : tile} rounded={18} />
              </View>
            ))}
          </View>
          <View style={{ gap: space.md }}>
            <Text variant="display" accessibilityRole="header">
              QR codes that are also pictures
            </Text>
            <Text variant="body" tone="muted">
              Describe a picture and add your link. QRX paints it, builds your code into it, and checks that it scans
              before you get it.
            </Text>
          </View>
        </View>

        <View style={{ gap: space.md }}>
          {message ? <Notice title="Not signed in" detail={message} tone="danger" /> : null}
          <Button title="Sign in with QRX" onPress={signIn} loading={signingIn} />
          <Text variant="small" tone="muted" style={{ textAlign: 'center' }}>
            New to QRX? Create a free account on the next screen.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.sm }}>
            <Link href="/api-key" asChild>
              <Pressable hitSlop={8} accessibilityRole="link">
                <Text variant="caption" tone="muted">
                  Use an API key
                </Text>
              </Pressable>
            </Link>
            <Pressable hitSlop={8} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(links.privacy)}>
              <Text variant="caption" tone="muted">
                Privacy
              </Text>
            </Pressable>
            <Pressable hitSlop={8} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(links.terms)}>
              <Text variant="caption" tone="muted">
                Terms
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
