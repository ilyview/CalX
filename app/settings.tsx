import React, { useState, useEffect } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity,
  ScrollView, Modal, TextInput, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../utils/ThemeContext';
import { getRestTimerDuration, setRestTimerDuration, getCalorieGoals, setCalorieGoals } from '../utils/storage';
import { CalorieGoals } from '../utils/types';
import { ThemeName } from '../utils/theme';

const PRESET_TIMERS = [30, 60, 90, 120, 180, 240, 300];

function formatTime(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${secs / 60}m${secs % 60 > 0 ? ` ${secs % 60}s` : ''}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme: T, themeName, setTheme } = useTheme();
  const [restDuration, setRestDurationState] = useState(90);
  const [goals, setGoalsState] = useState<CalorieGoals>({ training: 2500, rest: 2000 });
  const [goalModal, setGoalModal] = useState(false);
  const [newTraining, setNewTraining] = useState('');
  const [newRest, setNewRest] = useState('');

  useEffect(() => {
    getRestTimerDuration().then(setRestDurationState);
    getCalorieGoals().then(setGoalsState);
  }, []);

  const selectTimer = async (secs: number) => { await setRestTimerDuration(secs); setRestDurationState(secs); };
  const saveGoals = async () => {
    const t = parseInt(newTraining); const r = parseInt(newRest);
    if (isNaN(t) || isNaN(r) || t < 100 || r < 100) return;
    const updated = { training: t, rest: r };
    await setCalorieGoals(updated); setGoalsState(updated); setGoalModal(false);
  };

  const inputStyle = { backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const cardStyle = [
    { backgroundColor: T.card, borderRadius: T.radius, padding: 16 },
    T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {},
    { shadowColor: T.accent, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Theme */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 4 }}>Theme</Text>
          <Text style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Customize the look of the app</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Default Theme */}
            <TouchableOpacity
              style={[...cardStyle, { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8 }, themeName === 'default' ? { borderWidth: 2, borderColor: T.accent } : {}]}
              onPress={() => setTheme('default')}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d0d0d', borderWidth: 2, borderColor: '#a78bfa', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#a78bfa' }} />
              </View>
              <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>Default</Text>
              <Text style={{ color: T.sub, fontSize: 11 }}>Dark purple</Text>
              {themeName === 'default' && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
            </TouchableOpacity>

            {/* Minecraft Theme */}
            <TouchableOpacity
              style={[...cardStyle, { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 8 }, themeName === 'minecraft' ? { borderWidth: 2, borderColor: T.accent } : {}]}
              onPress={() => setTheme('minecraft')}
            >
              <View style={{ width: 44, height: 44, borderRadius: 4, backgroundColor: '#2d2010', borderWidth: 2, borderColor: '#5a3d18', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>⛏️</Text>
              </View>
              <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>Minecraft</Text>
              <Text style={{ color: T.sub, fontSize: 11 }}>Blocky & earthy</Text>
              {themeName === 'minecraft' && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Rest Timer */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 4 }}>Rest Timer</Text>
          <Text style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Time between sets in Journal</Text>
          <View style={cardStyle}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 48, fontWeight: '800', color: T.accent }}>{formatTime(restDuration)}</Text>
              <Text style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>current</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_TIMERS.map((secs) => (
                <TouchableOpacity
                  key={secs}
                  style={[{ paddingHorizontal: 18, paddingVertical: 11, backgroundColor: T.inputBg, borderRadius: T.radius }, restDuration === secs ? { backgroundColor: T.accent, shadowColor: T.accent, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]}
                  onPress={() => selectTimer(secs)}
                >
                  <Text style={[{ fontWeight: '700', fontSize: 14, color: T.sub }, restDuration === secs && { color: T.accentText }]}>{formatTime(secs)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Calorie Goals */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 4 }}>Calorie Goals</Text>
          <Text style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Auto-switches based on your training schedule</Text>
          <TouchableOpacity style={cardStyle} onPress={() => { setNewTraining(goals.training.toString()); setNewRest(goals.rest.toString()); setGoalModal(true); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 16 }}>🏋️</Text>
                  <Text style={{ flex: 1, color: T.text, fontSize: 15 }}>Training day</Text>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 15 }}>{goals.training.toLocaleString()} kcal</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <Text style={{ fontSize: 16 }}>💤</Text>
                  <Text style={{ flex: 1, color: T.text, fontSize: 15 }}>Rest day</Text>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 15 }}>{goals.rest.toLocaleString()} kcal</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.sub} style={{ marginLeft: 12 }} />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={goalModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44, ...(T.cardBorder ? { borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: T.cardBorder } : {}) }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>Calorie Goals</Text>
                <Text style={{ fontSize: 14, color: T.text, fontWeight: '600', marginBottom: 8 }}>🏋️ Training day</Text>
                <TextInput style={inputStyle} placeholder="e.g. 2500" placeholderTextColor={T.sub} value={newTraining} onChangeText={setNewTraining} keyboardType="numeric" />
                <Text style={{ fontSize: 14, color: T.text, fontWeight: '600', marginBottom: 8 }}>💤 Rest day</Text>
                <TextInput style={inputStyle} placeholder="e.g. 2000" placeholderTextColor={T.sub} value={newRest} onChangeText={setNewRest} keyboardType="numeric" />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 15, alignItems: 'center' }} onPress={() => setGoalModal(false)}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: T.accent, borderRadius: T.radius, padding: 15, alignItems: 'center' }} onPress={saveGoals}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
