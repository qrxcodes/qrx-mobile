import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { JobsProvider } from '@/state/jobs';
import { configureNotifications, onNotificationTap } from '@/state/notifications';
import { createQueryClient } from '@/state/queries';
import { AuthProvider, useAuth } from '@/state/session';
import { fonts, useTheme } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [loaded] = useFonts({
    [fonts.regular]: InstrumentSans_400Regular,
    [fonts.medium]: InstrumentSans_500Medium,
    [fonts.semibold]: InstrumentSans_600SemiBold,
    [fonts.bold]: InstrumentSans_700Bold,
    [fonts.display]: BricolageGrotesque_600SemiBold,
  });

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <JobsProvider>
            <Navigator />
          </JobsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const { c, dark } = useTheme();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    if (!signedIn) return;
    return onNotificationTap((codeId) => router.push({ pathname: '/code/[id]', params: { id: codeId } }));
  }, [signedIn]);

  if (status === 'loading') return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.ink, border: c.line },
  };
  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.6, 1],
    headerShown: false,
    contentStyle: { backgroundColor: c.bg },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { fontFamily: fonts.semibold, color: c.ink },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="code/[id]" options={{ title: '' }} />
          <Stack.Screen name="destination/[id]" options={sheet} />
          <Stack.Screen name="report/[id]" options={sheet} />
          <Stack.Screen name="delete-account" options={{ presentation: 'modal', title: 'Delete account' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="api-key" options={sheet} />
        </Stack.Protected>
        <Stack.Screen name="oauth" options={{ headerShown: false }} />
        <Stack.Screen name="preview-sign-in" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
