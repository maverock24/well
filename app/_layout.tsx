import '../global.css';
import { Stack } from 'expo-router';
import { colorScheme, useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDb } from '@/db';
import { useLibraryStore } from '@/store/library';
import { useUiStore } from '@/store/ui';

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';

/** Inject Google Fonts on web at runtime. The @import in global.css is
 *  sometimes stripped by the bundler chain, so this is the belt-and-braces
 *  path. No-op on native (where we'd use expo-font + a bundled .ttf). */
function ensureWebFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('well-google-fonts')) return;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = '';
  const link = document.createElement('link');
  link.id = 'well-google-fonts';
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_HREF;
  document.head.append(preconnect1, preconnect2, link);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const refresh = useLibraryStore((s) => s.refresh);
  const themeMode = useUiStore((s) => s.themeMode);
  const { colorScheme: active } = useColorScheme();

  // Drive NativeWind's colorScheme from the user's preference.
  useEffect(() => {
    colorScheme.set(themeMode);
  }, [themeMode]);

  useEffect(() => {
    ensureWebFonts();
    (async () => {
      await initDb();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={active === 'dark' ? '#ece8df' : '#1a1a1a'} />
      </View>
    );
  }

  const isDark = active === 'dark';
  const headerBg = isDark ? '#14130f' : '#fafaf7';
  const headerFg = isDark ? '#ece8df' : '#1a1a1a';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: headerBg },
          headerTitleStyle: { color: headerFg },
          headerTintColor: headerFg,
          contentStyle: { backgroundColor: headerBg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/new" options={{ title: 'New session', presentation: 'modal' }} />
        <Stack.Screen name="session/[id]/index" options={{ title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="session/[id]/deck" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="session/[id]/summary" options={{ title: 'Summary' }} />
        <Stack.Screen name="preset/[id]/edit" options={{ title: 'Edit preset' }} />
        <Stack.Screen name="preset/new" options={{ title: 'New preset', presentation: 'modal' }} />
        <Stack.Screen name="question/[id]" options={{ title: 'Question' }} />
        <Stack.Screen name="question/new" options={{ title: 'New question', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

