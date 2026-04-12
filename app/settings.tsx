import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Modal, TextInput, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRestTimerDuration, setRestTimerDuration, getCalorieGoals, setCalorieGoals } from '../utils/storage';
import { CalorieGoals } from '../utils/types';

const ACCENT = '#a78bfa';
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#f0f0f0';
const SUB = '#666';

const GLOW = {
  shadowColor: ACCENT,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 5,
};

const PRESET_TIMERS = [30, 60, 90, 120, 180, 240, 300];

export default function SettingsScreen() {
  const router = useRouter();
  const [restDuration, setRestDurationState] = useState(90);
  const [goals, setGoalsState] = useState<CalorieGoals>({ training: 2500, rest: 2000 });
  const [goalModal, setGoalModal] = useState(false);
  const [newTraining, setNewTraining] = useState('');
  const [newRest, setNewRest] = useState('');

  useEffect(() => {
    getRestTimerDuration().then(setRestDurationState);
    getCalorieGoals().then(setGoalsState);
  }, []);

  const selectTimer = async (secs: number) => {
    await setRestTimerDuration(secs);
    setRestDurationState(secs);
  };

  const saveGoals = async () => {
    const t = parseInt(newTraining);
    const r = parseInt(newRest);
    if (isNaN(t) || isNaN(r) || t < 100 || r < 100) return;
    const updated = { training: t, rest: r };
    await setCalorieGoals(updated);
    setGoalsState(updated);
    setGoalModal(false);
  };

  function formatTime(secs: number) {
    if (secs < 60) return `${secs}s`;
    return `${secs / 60}m${secs % 60 > 0 ? ` ${secs % 60}s` : ''}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Rest Timer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rest Timer</Text>
          <Text style={styles.sectionSub}>Time between sets in Journal</Text>
          <View style={[styles.card, GLOW]}>
            <View style={styles.previewRow}>
              <Text style={styles.previewVal}>{formatTime(restDuration)}</Text>
              <Text style={styles.previewLabel}>current</Text>
            </View>
            <View style={styles.presetGrid}>
              {PRESET_TIMERS.map((secs) => (
                <TouchableOpacity
                  key={secs}
                  style={[styles.presetBtn, restDuration === secs && styles.presetBtnActive]}
                  onPress={() => selectTimer(secs)}
                >
                  <Text style={[styles.presetTxt, restDuration === secs && styles.presetTxtActive]}>
                    {formatTime(secs)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Calorie Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calorie Goals</Text>
          <Text style={styles.sectionSub}>Auto-switches based on your training schedule</Text>
          <View style={[styles.card, GLOW]}>
            <TouchableOpacity
              style={styles.goalRow}
              onPress={() => { setNewTraining(goals.training.toString()); setNewRest(goals.rest.toString()); setGoalModal(true); }}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.goalLine}>
                  <Text style={styles.goalEmoji}>🏋️</Text>
                  <Text style={styles.goalLabel}>Training day</Text>
                  <Text style={styles.goalVal}>{goals.training.toLocaleString()} kcal</Text>
                </View>
                <View style={[styles.goalLine, { marginTop: 12 }]}>
                  <Text style={styles.goalEmoji}>💤</Text>
                  <Text style={styles.goalLabel}>Rest day</Text>
                  <Text style={styles.goalVal}>{goals.rest.toLocaleString()} kcal</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={SUB} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={goalModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Calorie Goals</Text>
                <Text style={styles.goalLabel2}>🏋️ Training day</Text>
                <TextInput style={styles.input} placeholder="e.g. 2500" placeholderTextColor={SUB} value={newTraining} onChangeText={setNewTraining} keyboardType="numeric" />
                <Text style={styles.goalLabel2}>💤 Rest day</Text>
                <TextInput style={styles.input} placeholder="e.g. 2000" placeholderTextColor={SUB} value={newRest} onChangeText={setNewRest} keyboardType="numeric" />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={saveGoals}><Text style={styles.confirmTxt}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: SUB, marginBottom: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16 },
  previewRow: { alignItems: 'center', marginBottom: 16 },
  previewVal: { fontSize: 48, fontWeight: '800', color: ACCENT },
  previewLabel: { fontSize: 12, color: SUB, marginTop: 2 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { paddingHorizontal: 18, paddingVertical: 11, backgroundColor: '#222', borderRadius: 12 },
  presetBtnActive: { backgroundColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  presetTxt: { color: SUB, fontWeight: '700', fontSize: 14 },
  presetTxtActive: { color: '#fff' },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalEmoji: { fontSize: 16 },
  goalLabel: { flex: 1, color: TEXT, fontSize: 15 },
  goalVal: { color: ACCENT, fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#181818', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 18 },
  goalLabel2: { fontSize: 14, color: TEXT, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#222', borderRadius: 11, padding: 14, color: TEXT, fontSize: 15, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#222', borderRadius: 11, padding: 15, alignItems: 'center' },
  cancelTxt: { color: SUB, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 11, padding: 15, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
