import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// The holographic gradient colors
export const G = ['#a8edea', '#b8a9fc', '#93c5fd'] as const;
export const G_REVERSE = ['#93c5fd', '#b8a9fc', '#a8edea'] as const;

// FAB with gradient
export function GradientFAB({ onPress, icon }: { onPress: () => void; icon: React.ReactNode }) {
  return (
    <TouchableOpacity style={fabStyles.wrap} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient colors={G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fabStyles.grad}>
        {icon}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const fabStyles = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 26, right: 22,
    width: 58, height: 58, borderRadius: 29,
    shadowColor: '#a8edea', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 10,
  },
  grad: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
});

// Badge with gradient background
export function GradientBadge({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[badgeStyles.wrap, style]}>
      {children}
    </LinearGradient>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});

// Confirm button with gradient
export function GradientButton({ onPress, label, style }: { onPress: () => void; label: string; style?: ViewStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={[btnStyles.wrap, style]}>
      <LinearGradient colors={G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={btnStyles.grad}>
        <Text style={btnStyles.txt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  grad: { padding: 15, alignItems: 'center' },
  txt: { color: '#111', fontWeight: '700', fontSize: 15 },
});

// Progress bar fill with gradient
export function GradientBar({ progress, height = 7 }: { progress: number; height?: number }) {
  return (
    <View style={{ height, backgroundColor: '#252525', borderRadius: 4, overflow: 'hidden' }}>
      <LinearGradient
        colors={G}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${Math.min(progress, 1) * 100}%`, borderRadius: 4 }}
      />
    </View>
  );
}

// Active pill with gradient
export function GradientPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient colors={G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
        <Text style={{ color: '#111', fontWeight: '700', fontSize: 13 }}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Streak number with gradient background
export function GradientStreakChip({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <LinearGradient colors={G} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={streakStyles.wrap}>
      <Text style={streakStyles.emoji}>{emoji}</Text>
      <Text style={streakStyles.val}>{value}</Text>
      <Text style={streakStyles.label}>{label}</Text>
    </LinearGradient>
  );
}

const streakStyles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 18 },
  val: { fontSize: 20, fontWeight: '800', color: '#111' },
  label: { fontSize: 11, color: '#33333388', flex: 1 },
});
