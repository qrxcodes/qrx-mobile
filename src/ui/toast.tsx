import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './components';
import { radius, space, useTheme } from './theme';

/** A short confirmation at the bottom of the screen ("Link copied"), announced to screen readers too. */
export function useToast() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  const element = message ? (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + space.xl, alignItems: 'center' }}
    >
      <Animated.View
        key={message}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(180)}
        style={{
          backgroundColor: c.ink,
          borderRadius: radius.pill,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm + 2,
        }}
      >
        <Text variant="bodyStrong" style={{ color: c.bg }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  ) : null;

  return { show, element };
}
