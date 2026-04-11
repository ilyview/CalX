import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111111', borderTopColor: '#1e1e1e', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Nutrition', tabBarIcon: ({ color, size }) => <Ionicons name="nutrition-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="training" options={{ title: 'Training', tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: ({ color, size }) => <Ionicons name="journal-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
