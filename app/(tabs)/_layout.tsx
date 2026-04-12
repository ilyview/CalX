import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#1e1e1e',
          height: 72,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 10.75, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Nutwition', tabBarIcon: ({ color, size }) => <Ionicons name="nutrition-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="training" options={{ title: 'Twaining', tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: ({ color, size }) => <Ionicons name="journal-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Pwogwess', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
