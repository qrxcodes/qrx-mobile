import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { codeImageSource } from '@/state/media';

import { Mark } from './components';
import { radius, useTheme } from './theme';

/** A code's picture, square, with the QRX look: soft corners, a hairline, and a gentle fade-in. */
export function CodeImage({
  imageUrl,
  size,
  rounded = radius.lg,
  style,
  label,
}: {
  imageUrl: string | null;
  size?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const { c } = useTheme();
  const source = codeImageSource(imageUrl);
  return (
    <View
      style={[
        {
          width: size ?? '100%',
          aspectRatio: 1,
          borderRadius: rounded,
          overflow: 'hidden',
          backgroundColor: c.sunken,
          borderWidth: 1,
          borderColor: c.line,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ flex: 1 }}
          contentFit="cover"
          transition={220}
          accessible={!!label}
          accessibilityLabel={label}
          recyclingKey={imageUrl ?? undefined}
        />
      ) : (
        <Painting />
      )}
    </View>
  );
}

/** The placeholder while a picture is being made: the QRX mark under a slow scanning line. */
export function Painting() {
  const { c } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [y]);
  const line = useAnimatedStyle(() => ({ top: `${y.value * 100}%` }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken }}>
      <View style={{ opacity: 0.35 }}>
        <Mark size={44} />
      </View>
      <Animated.View
        style={[{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: c.accent, opacity: 0.55 }, line]}
      />
    </View>
  );
}
