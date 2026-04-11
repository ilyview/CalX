import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWeightLog, addWeightEntry, getStreaks,
  getVolumeHistory, getJournal, getWorkoutPlans,
} from '../../utils/storage';
import { WeightEntry } from '../../utils/types';

const ACCENT = '#a78bfa';
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#f0f0f0';
const SUB = '#666';
const GREEN = '#4ade80';
const BLUE = '#60a5fa';
const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;
const CHART_H = 110;

function getTodayStr() { return new Date().toISOString().split('T')[0]; }

function shortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Simple line chart built from Views ────────────────────────────
function LineChart({ data, color = ACCENT, unit = '' }: { data: { date: string; value: number }[]; color?: string; unit?: string }) {
  if (data.length < 2) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: SUB, fontSize: 13 }}>Log at least 2 entries to see the graph</Text>
    </View>
  );

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: CHART_H - ((d.value - min) / range) * (CHART_H - 20) - 10,
    value: d.value,
    date: d.date,
  }));

  return (
    <View style={{ height: CHART_H + 20, marginTop: 8 }}>
      {/* Y axis labels */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 20, justifyContent: 'space-between' }}>
        <Text style={chartStyles.yLabel}>{max}{unit}</Text>
        <Text style={chartStyles.yLabel}>{Math.round((max + min) / 2)}{unit}</Text>
        <Text style={chartStyles.yLabel}>{min}{unit}</Text>
      </View>
      {/* Chart area */}
      <View style={{ marginLeft: 36, width: CHART_W, height: CHART_H, position: 'relative' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: p * (CHART_H - 20) + 10, height: 1, backgroundColor: '#222' }} />
        ))}
        {/* Line segments */}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1];
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View key={i} style={{
              position: 'absolute', left: pt.x, top: pt.y,
              width: len, height: 2, backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 0',
            }} />
          );
        })}
        {/* Dots */}
        {points.map((pt, i) => (
          <View key={i} style={{ position: 'absolute', left: pt.x - 4, top: pt.y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: color, borderWidth: 2, borderColor: BG }} />
        ))}
      </View>
      {/* X axis labels */}
      <View style={{ marginLeft: 36, flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={chartStyles.xLabel}>{shortDate(data[0].date)}</Text>
        {data.length > 2 && <Text style={chartStyles.xLabel}>{shortDate(data[Math.floor(data.length / 2)].date)}</Text>}
        <Text style={chartStyles.xLabel}>{shortDate(data[data.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  yLabel: { fontSize: 10, color: SUB },
  xLabel: { fontSize: 10, color: SUB },
});

// ── Bar chart for volume ───────────────────────────────────────────
function BarChart({ data }: { data: { date: string; volume: number }[] }) {
  if (data.length === 0) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: SUB, fontSize: 13 }}>No data yet — log some sets in Journal</Text>
    </View>
  );

  const max = Math.max(...data.map((d) => d.volume));
  const barW = Math.min(28, (CHART_W / data.length) - 6);
  const trend = data.length >= 2
    ? data[data.length - 1].volume > data[0].volume ? 'up' : data[data.length - 1].volume < data[0].volume ? 'down' : 'flat'
    : 'flat';
  const trendColor = trend === 'up' ? GREEN : trend === 'down' ? '#f87171' : SUB;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Ionicons name={trendIcon as any} size={16} color={trendColor} />
        <Text style={{ color: trendColor, fontSize: 13, fontWeight: '600' }}>
          {trend === 'up' ? 'Volume trending up — good progress' : trend === 'down' ? 'Volume dropping — check recovery' : 'Volume stable'}
        </Text>
      </View>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.volume / max) * (CHART_H - 16));
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: barW, height: h, backgroundColor: isLast ? ACCENT : ACCENT + '55', borderRadius: 4 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: SUB }}>{shortDate(data[0].date)}</Text>
        <Text style={{ fontSize: 10, color: SUB }}>{shortDate(data[data.length - 1].date)}</Text>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [streaks, setStreaks] = useState({ calorie: 0, training: 0 });
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [volumeHistory, setVolumeHistory] = useState<{ date: string; volume: number }[]>([]);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const load = useCallback(async () => {
    const wl = await getWeightLog();
    setWeightLog(wl);
    const s = await getStreaks();
    setStreaks(s);

    // Gather all unique exercise names from journal
    const journal = await getJournal();
    const names = new Set<string>();
    for (const entry of Object.values(journal)) {
      for (const ex of entry.exercises) {
        if (ex.sets.length > 0) names.add(ex.exerciseName);
      }
    }
    const nameArr = Array.from(names);
    setExerciseNames(nameArr);
    if (nameArr.length > 0 && !selectedExercise) setSelectedExercise(nameArr[0]);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedExercise) return;
    getVolumeHistory(selectedExercise).then(setVolumeHistory);
  }, [selectedExercise]);

  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;
    await addWeightEntry({ date: getTodayStr(), weight: w });
    setWeightInput('');
    setWeightModal(false);
    load();
  };

  const weightChartData = weightLog.slice(-14).map((e) => ({ date: e.date, value: e.weight }));
  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1] : null;
  const weightChange = weightLog.length >= 2
    ? weightLog[weightLog.length - 1].weight - weightLog[weightLog.length - 2].weight
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Streaks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaks</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.card, { flex: 1, alignItems: 'center', paddingVertical: 20 }]}>
              <Text style={{ fontSize: 36 }}>🔥</Text>
              <Text style={styles.bigNum}>{streaks.calorie}</Text>
              <Text style={styles.bigLabel}>day calorie streak</Text>
            </View>
            <View style={[styles.card, { flex: 1, alignItems: 'center', paddingVertical: 20 }]}>
              <Text style={{ fontSize: 36 }}>💪</Text>
              <Text style={styles.bigNum}>{streaks.training}</Text>
              <Text style={styles.bigLabel}>day training streak</Text>
            </View>
          </View>
        </View>

        {/* Body Weight */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Body Weight</Text>
            <TouchableOpacity style={styles.logBtn} onPress={() => { setWeightInput(latestWeight?.weight.toString() || ''); setWeightModal(true); }}>
              <Ionicons name="add" size={15} color={ACCENT} />
              <Text style={styles.logBtnTxt}>Log today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {latestWeight ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: TEXT }}>{latestWeight.weight}<Text style={{ fontSize: 16, color: SUB }}> kg</Text></Text>
                  <Text style={{ fontSize: 12, color: SUB }}>Last logged {shortDate(latestWeight.date)}</Text>
                </View>
                {weightChange !== null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: weightChange < 0 ? GREEN : '#f87171' }}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                    </Text>
                    <Text style={{ fontSize: 11, color: SUB }}>vs last entry</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: SUB, fontSize: 14, marginBottom: 12 }}>No weight logged yet — tap "Log today" to start</Text>
            )}
            <LineChart data={weightChartData} color={BLUE} unit="kg" />
          </View>
        </View>

        {/* Volume Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume Tracking</Text>
          {exerciseNames.length === 0 ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 30, gap: 6 }]}>
              <Ionicons name="barbell-outline" size={32} color="#333" />
              <Text style={{ color: '#444', fontSize: 15, fontWeight: '600' }}>No exercise data yet</Text>
              <Text style={{ color: '#333', fontSize: 13 }}>Log sets in the Journal tab to see volume graphs</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Exercise picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {exerciseNames.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.exPill, selectedExercise === name && styles.exPillActive]}
                    onPress={() => setSelectedExercise(name)}
                  >
                    <Text style={[styles.exPillTxt, selectedExercise === name && { color: '#fff' }]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedExercise && <BarChart data={volumeHistory} />}
              <Text style={{ fontSize: 11, color: '#333', marginTop: 10 }}>
                Volume = reps × weight per set, summed per session. Trending up means progressive overload is working.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Weight Modal */}
      <Modal visible={weightModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Log Body Weight</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Weight in kg (e.g. 75.5)"
                  placeholderTextColor={SUB}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="numeric"
                  autoFocus
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setWeightModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveWeight}><Text style={styles.confirmTxt}>Save</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  section: { paddingHorizontal: 16, marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16 },
  bigNum: { fontSize: 42, fontWeight: '800', color: ACCENT, marginTop: 4 },
  bigLabel: { fontSize: 12, color: SUB, marginTop: 2 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logBtnTxt: { color: ACCENT, fontWeight: '600', fontSize: 14 },
  exPill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#222', borderRadius: 20 },
  exPillActive: { backgroundColor: ACCENT },
  exPillTxt: { color: SUB, fontWeight: '600', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#181818', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 18 },
  input: { backgroundColor: '#222', borderRadius: 11, padding: 14, color: TEXT, fontSize: 15, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#222', borderRadius: 11, padding: 15, alignItems: 'center' },
  cancelTxt: { color: SUB, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 11, padding: 15, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
