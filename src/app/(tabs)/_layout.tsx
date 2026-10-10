import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { fonts, useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <NativeTabs
      tintColor={c.accent}
      backgroundColor={c.bg}
      indicatorColor={c.accentSoft}
      labelStyle={{ fontFamily: fonts.medium }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} md="auto_awesome" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="codes">
        <NativeTabs.Trigger.Label>My codes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
