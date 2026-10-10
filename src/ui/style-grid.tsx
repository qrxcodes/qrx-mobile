import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Pressable, View, useWindowDimensions } from 'react-native';

import type { Style } from '@/lib/types';
import { stylePreviewSource } from '@/state/media';

import { Text } from './components';
import { MAX_CONTENT_WIDTH, radius, space, useTheme } from './theme';

/** The styles as a grid of picture tiles; three across on phones, four on wider screens. */
export function StyleGrid({
  styles,
  value,
  onChange,
}: {
  styles: Style[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const inner = Math.min(width - space.lg * 2, MAX_CONTENT_WIDTH);
  const columns = inner > 520 ? 4 : 3;
  const gap = space.sm + 2;
  const tile = (inner - gap * (columns - 1)) / columns;

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {styles.map((style) => {
        const selected = style.id === value;
        const source = stylePreviewSource(style.previewUrl);
        return (
          <Pressable
            key={style.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${style.name} style`}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(style.id);
            }}
            style={{ width: tile, gap: 6 }}
          >
            <View
              style={{
                width: tile,
                height: tile,
                borderRadius: radius.lg,
                padding: 3,
                borderWidth: 2,
                borderColor: selected ? c.accent : 'transparent',
              }}
            >
              <View style={{ flex: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.sunken }}>
                {source ? <Image source={source} style={{ flex: 1 }} contentFit="cover" transition={150} /> : null}
              </View>
            </View>
            <Text
              variant="caption"
              tone={selected ? 'accent' : 'muted'}
              numberOfLines={1}
              style={{ textAlign: 'center', fontFamily: selected ? 'InstrumentSans-SemiBold' : undefined }}
            >
              {style.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
