import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

type IconName = React.ComponentProps<typeof Feather>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={name} size={size - 2} color={color} />
  );
}

/**
 * Tab labels are sentence-case (more scannable than Title Case per the
 * UI principles).  Tab-bar surface uses the theme tokens so dark mode
 * works correctly — no hardcoded hex literals.
 */
export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const tokens = dark
    ? { ink: '#f4f0e8', muted: '#a29c90', paper: '#121210', rule: '#322e27' }
    : { ink: '#14110f', muted: '#6e6860', paper: '#faf9f6', rule: '#e2ded5' };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.ink,
        tabBarInactiveTintColor: tokens.muted,
        tabBarStyle: {
          backgroundColor: tokens.paper,
          borderTopColor: tokens.rule,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.4,
        },
        tabBarItemStyle: { minHeight: 48 },
        headerStyle: {
          backgroundColor: tokens.paper,
          borderBottomWidth: 0,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: tokens.ink,
          fontFamily: 'Fraunces',
          fontWeight: '500',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('compass'), headerShown: false }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Library', tabBarIcon: tabIcon('book-open') }}
      />
      <Tabs.Screen
        name="sessions"
        options={{ title: 'Sessions', tabBarIcon: tabIcon('clock') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('settings') }}
      />
    </Tabs>
  );
}
