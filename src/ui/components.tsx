import { Image } from 'expo-image';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, fonts, radius, space, useTheme } from './theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'label';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
};

export function Text({
  variant = 'body',
  tone = 'ink',
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: 'ink' | 'muted' | 'accent' | 'danger' | 'success' | 'accentInk' }) {
  const { c } = useTheme();
  return <RNText {...props} style={[variants[variant], { color: c[tone] }, style]} />;
}

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { c } = useTheme();
  return <SymbolView name={name} size={size} tintColor={color ?? c.ink} weight="medium" />;
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  compact,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const colours: Record<ButtonKind, { bg: string; pressed: string; fg: string; border?: string }> = {
    primary: { bg: c.accent, pressed: c.accentPressed, fg: c.accentInk },
    secondary: { bg: c.surface, pressed: c.sunken, fg: c.ink, border: c.lineStrong },
    ghost: { bg: 'transparent', pressed: c.sunken, fg: c.accent },
    danger: { bg: c.dangerSoft, pressed: c.dangerSoft, fg: c.danger },
  };
  const k = colours[kind];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      {...props}
      style={({ pressed }) => [
        {
          minHeight: compact ? 40 : 52,
          paddingHorizontal: compact ? space.md : space.xl,
          borderRadius: radius.lg,
          backgroundColor: pressed ? k.pressed : k.bg,
          borderWidth: k.border ? 1 : 0,
          borderColor: k.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: inactive && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={k.fg} /> : icon ? <Icon name={icon} size={18} color={k.fg} /> : null}
      <RNText style={[variants.bodyStrong, { color: k.fg, fontSize: compact ? 15 : 16 }]}>{title}</RNText>
    </Pressable>
  );
}

/** A square action button with an icon over a short label (Share, Save, Copy). */
export function ActionTile({
  label,
  icon,
  onPress,
  busy,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  busy?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 72,
        borderRadius: radius.lg,
        backgroundColor: pressed ? c.sunken : c.surface,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      })}
    >
      {busy ? <ActivityIndicator color={c.accent} /> : <Icon name={icon} size={22} color={c.accent} />}
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.line, padding: space.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const Field = function Field({
  label,
  hint,
  error,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={c.field}
        selectionColor={c.accent}
        {...props}
        style={[
          {
            fontFamily: fonts.regular,
            fontSize: 16,
            lineHeight: 22,
            color: c.ink,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: error ? c.danger : c.lineStrong,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: props.multiline ? space.md : 0,
            minHeight: props.multiline ? 104 : 50,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

/** A tappable settings row. */
export function Row({
  title,
  detail,
  icon,
  onPress,
  tone = 'ink',
  trailing,
  accessibilityHint,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress?: () => void;
  tone?: 'ink' | 'danger';
  trailing?: ReactNode;
  accessibilityHint?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        backgroundColor: pressed ? c.sunken : 'transparent',
      })}
    >
      {icon ? <Icon name={icon} size={19} color={tone === 'danger' ? c.danger : c.muted} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone={tone}>
          {title}
        </Text>
        {detail ? (
          <Text variant="small" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name={icons.chevron} size={13} color={c.field} /> : null)}
    </Pressable>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  const { c } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <Text variant="label" tone="muted" style={{ paddingHorizontal: space.xs, textTransform: 'uppercase' }}>
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: c.line,
          overflow: 'hidden',
        }}
      >
        {items.map((child, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

/** A problem shown inline: a title, a sentence, and an optional action. */
export function Notice({
  title,
  detail,
  tone = 'warning',
  action,
}: {
  title: string;
  detail?: string;
  tone?: 'warning' | 'danger' | 'success' | 'info';
  action?: ReactNode;
}) {
  const { c } = useTheme();
  const bg = { warning: c.warningSoft, danger: c.dangerSoft, success: c.successSoft, info: c.accentSoft }[tone];
  const fg = { warning: c.warning, danger: c.danger, success: c.success, info: c.accent }[tone];
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: radius.lg, padding: space.lg, gap: 4 }}>
      <RNText style={[variants.bodyStrong, { color: fg }]}>{title}</RNText>
      {detail ? <Text variant="small">{detail}</Text> : null}
      {action ? <View style={{ marginTop: space.sm, alignItems: 'flex-start' }}>{action}</View> : null}
    </View>
  );
}

/**
 * A tab or sheet's scrolling page: safe-area padding, the page background, and content held to a readable width on
 * iPad. `title` renders the large heading the tabs use in place of a navigation bar.
 */
export function Screen({
  children,
  title,
  subtitle,
  topInset = true,
  refreshControl,
  footer,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  topInset?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        contentContainerStyle={{
          paddingTop: (topInset ? insets.top : 0) + space.lg,
          paddingBottom: insets.bottom + space.xxl * 2,
          paddingHorizontal: space.lg,
          alignItems: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: space.xl }}>
          {title ? (
            <View style={{ gap: 6, paddingTop: space.sm }}>
              <Text variant="display" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="body" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
      {footer}
    </View>
  );
}

export function Mark({ size = 28 }: { size?: number }) {
  const { dark } = useTheme();
  return (
    <Image
      accessibilityLabel="QRX"
      source={dark ? require('../../assets/brand/qrx-mark-dark.svg') : require('../../assets/brand/qrx-mark.svg')}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

/** SF Symbols on iOS, Material Symbols on Android. */
export const icons = {
  create: { ios: 'sparkles', android: 'auto_awesome' },
  codes: { ios: 'square.grid.2x2', android: 'grid_view' },
  account: { ios: 'person.crop.circle', android: 'account_circle' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  save: { ios: 'square.and.arrow.down', android: 'download' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  link: { ios: 'link', android: 'link' },
  edit: { ios: 'pencil', android: 'edit' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  bell: { ios: 'bell', android: 'notifications' },
  flag: { ios: 'flag', android: 'flag' },
  help: { ios: 'questionmark.circle', android: 'help' },
  lock: { ios: 'lock', android: 'lock' },
  doc: { ios: 'doc.text', android: 'description' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  trash: { ios: 'trash', android: 'delete' },
  globe: { ios: 'globe', android: 'language' },
  key: { ios: 'key', android: 'key' },
  retry: { ios: 'arrow.clockwise', android: 'refresh' },
  close: { ios: 'xmark', android: 'close' },
} satisfies Record<string, IconName>;
