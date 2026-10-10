import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ago, displayLink } from '@/lib/format';
import { describeProblem, toProblem } from '@/lib/problem';
import type { Code } from '@/lib/types';
import { useCodes } from '@/state/queries';
import { CodeImage } from '@/ui/code-image';
import { Button, Notice, Text } from '@/ui/components';
import { MAX_CONTENT_WIDTH, radius, space, useTheme } from '@/ui/theme';

export default function MyCodes() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const codes = useCodes();
  const [refreshing, setRefreshing] = useState(false);

  const inner = Math.min(width - space.lg * 2, MAX_CONTENT_WIDTH * 1.5);
  const columns = inner > 700 ? 4 : inner > 480 ? 3 : 2;
  const gap = space.md;
  const tile = (inner - gap * (columns - 1)) / columns;

  const header = (
    <View style={{ gap: 6, paddingTop: insets.top + space.lg + space.sm, paddingBottom: space.lg }}>
      <Text variant="display" accessibilityRole="header">
        My codes
      </Text>
      <Text variant="body" tone="muted">
        Every code you make, here and on qrx.codes.
      </Text>
    </View>
  );

  const empty = codes.isPending ? (
    <ActivityIndicator style={{ marginTop: space.xxl }} color={c.accent} />
  ) : codes.isError ? (
    <Notice
      title={describeProblem(toProblem(codes.error)).title}
      detail={describeProblem(toProblem(codes.error)).detail}
      tone="danger"
      action={<Button title="Try again" kind="secondary" compact onPress={() => codes.refetch()} />}
    />
  ) : (
    <View style={{ alignItems: 'flex-start', gap: space.md, paddingTop: space.lg }}>
      <Text variant="heading">No codes yet</Text>
      <Text variant="body" tone="muted">
        Make your first one: describe a picture and add your link.
      </Text>
      <Button title="Create a code" onPress={() => router.navigate('/')} />
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingBottom: insets.bottom + space.xxl * 2,
        width: '100%',
        maxWidth: MAX_CONTENT_WIDTH * 1.5 + space.lg * 2,
        alignSelf: 'center',
      }}
      key={columns}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      ItemSeparatorComponent={() => <View style={{ height: gap + space.xs }} />}
      data={codes.data ?? []}
      keyExtractor={(code) => code.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <Tile code={item} size={tile} />}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (codes.hasNextPage && !codes.isFetchingNextPage) void codes.fetchNextPage();
      }}
      ListFooterComponent={
        codes.isFetchingNextPage ? <ActivityIndicator style={{ margin: space.lg }} color={c.accent} /> : null
      }
      refreshControl={
        <RefreshControl
          tintColor={c.accent}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await codes.refetch();
            setRefreshing(false);
          }}
        />
      }
    />
  );
}

function Tile({ code, size }: { code: Code; size: number }) {
  const status =
    code.status === 'succeeded'
      ? displayLink(code.shortUrl)
      : code.status === 'failed'
        ? 'Didn’t work out'
        : 'Being made…';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${code.prompt}. ${status}`}
      onPress={() => router.push({ pathname: '/code/[id]', params: { id: code.id } })}
      style={({ pressed }) => ({ width: size, gap: 6, opacity: pressed ? 0.85 : 1 })}
    >
      <CodeImage imageUrl={code.status === 'succeeded' ? code.imageUrl : null} rounded={radius.lg} />
      <View style={{ gap: 1, paddingHorizontal: 2 }}>
        <Text variant="small" numberOfLines={1} style={{ fontFamily: 'InstrumentSans-SemiBold' }}>
          {code.prompt}
        </Text>
        <Text variant="caption" tone={code.status === 'failed' ? 'danger' : 'muted'} numberOfLines={1}>
          {status} · {ago(code.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
