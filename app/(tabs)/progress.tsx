import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWeightLog, addWeightEntry, getStreaks,
  getVolumeHistory, getJournal, getNutritionHistory,
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

const GLOW = {
  shadowColor: ACCENT,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 5,
};

const GLOW_STRONG = {
  shadowColor: ACCENT,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 8,
};

type TimeRange = '7d' | '30d' | '6m' | '1y';

const RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7, '30d': 30, '6m': 180, '1y': 365,
};

function getTodayStr() { return new Date().toISOString().split('T')[0]; }

function shortDate(dateStr: string, range: TimeRange) {
  const d = new Date(dateStr + 'T00:00:00');
  if (range === '7d') return d.toLocaleDateString('en-US', { weekday: 'short' });
  if (range === '30d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Time Range Picker ──────────────────────────────────────────────
function RangePicker({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const ranges: TimeRange[] = ['7d', '30d', '6m', '1y'];
  return (
    <View style={rpStyles.row}>
      {ranges.map((r) => (
        <TouchableOpacity
          key={r}
          style={[rpStyles.btn, value === r && rpStyles.active]}
          onPress={() => onChange(r)}
        >
          <Text style={[rpStyles.txt, value === r && rpStyles.activeTxt]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const rpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#222', alignItems: 'center' },
  active: { backgroundColor: ACCENT },
  txt: { color: SUB, fontWeight: '700', fontSize: 13 },
  activeTxt: { color: '#fff' },
});

// ── Simple line chart ──────────────────────────────────────────────
function LineChart({ data, color = ACCENT, unit = '', range }: {
  data: { date: string; value: number }[];
  color?: string;
  unit?: string;
  range: TimeRange;
}) {
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length < 2) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: SUB, fontSize: 13 }}>Not enough data yet</Text>
    </View>
  );

  const values = data.map((d) => d.value);
  const max = Math.max(...values) || 1;
  const PAD = 10;
  const H = CHART_H - PAD * 2;

  const px = (i: number) => data.length > 1 ? (i / (data.length - 1)) * CHART_W : CHART_W / 2;
  const py = (v: number) => PAD + H - (v / max) * H;

  const points = data.map((d, i) => ({ x: px(i), y: py(d.value), value: d.value, date: d.date }));

  const labelIdxs = (() => {
    const n = data.length;
    if (n <= 7) return data.map((_, i) => i);
    if (n <= 30) return [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1];
    return [0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1];
  })();

  return (
    <View style={{ height: CHART_H + 20, marginTop: 4 }}>
      <View style={{ width: CHART_W, height: CHART_H, position: 'relative' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: PAD + H * (1 - p) - 0.5, height: 1, backgroundColor: '#222' }} />
        ))}
        {/* Line segments — rotated around their own center */}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1];
          if (pt.value === 0 || next.value === 0) return null;
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const cx = (pt.x + next.x) / 2;
          const cy = (pt.y + next.y) / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: cx - len / 2,
                top: cy - 1,
                width: len,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
        {/* Dots */}
        {points.map((pt, i) =>
          pt.value > 0 ? (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pt.x - 4,
                top: pt.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
                borderWidth: 2,
                borderColor: CARD,
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 4,
              }}
            />
          ) : null
        )}
      </View>
      {/* X axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
        {labelIdxs.map((idx) => (
          <Text key={idx} style={{ fontSize: 9, color: SUB }}>{shortDate(data[idx].date, range)}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Bar chart for volume ───────────────────────────────────────────
function BarChart({ data }: { data: { date: string; volume: number }[] }) {
  if (data.length === 0) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: SUB, fontSize: 13 }}>No data yet — log sets in Journal</Text>
    </View>
  );
  const max = Math.max(...data.map((d) => d.volume)) || 1;
  const trend = data.length >= 2
    ? data[data.length-1].volume > data[0].volume ? 'up' : data[data.length-1].volume < data[0].volume ? 'down' : 'flat'
    : 'flat';
  const trendColor = trend === 'up' ? GREEN : trend === 'down' ? '#f87171' : SUB;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const barW = Math.min(28, (CHART_W / data.length) - 4);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ionicons name={trendIcon as any} size={15} color={trendColor} />
        <Text style={{ color: trendColor, fontSize: 12, fontWeight: '600' }}>
          {trend === 'up' ? 'Trending up — progressive overload working' : trend === 'down' ? 'Volume dropping — check recovery' : 'Volume stable'}
        </Text>
      </View>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.volume / max) * (CHART_H - 8));
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[
                { width: barW, height: h, borderRadius: 4 },
                isLast
                  ? { backgroundColor: ACCENT, shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 }
                  : { backgroundColor: ACCENT + '44' }
              ]} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: SUB }}>{data[0]?.date ? shortDate(data[0].date, '7d') : ''}</Text>
        <Text style={{ fontSize: 10, color: SUB }}>{data[data.length-1]?.date ? shortDate(data[data.length-1].date, '7d') : ''}</Text>
      </View>
    </View>
  );
}

// ── Nutrition multi-line chart ────────────────────────────────────
type NutritionKey = 'calories' | 'protein' | 'carbs' | 'fat';
const NUTRITION_COLORS: Record<NutritionKey, string> = {
  calories: ACCENT,
  protein: '#60a5fa',
  carbs: '#fbbf24',
  fat: '#f87171',
};
const NUTRITION_LABELS: Record<NutritionKey, string> = {
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
};
const NUTRITION_UNITS: Record<NutritionKey, string> = {
  calories: 'kcal', protein: 'g', carbs: 'g', fat: 'g',
};

function NutritionGraphs({ range }: { range: TimeRange }) {
  const [data, setData] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);
  const [activeMetric, setActiveMetric] = useState<NutritionKey>('calories');

  useEffect(() => {
    getNutritionHistory(RANGE_DAYS[range]).then(setData);
  }, [range]);

  const chartData = data.map((d) => ({ date: d.date, value: d[activeMetric] }));
  const nonZero = chartData.filter((d) => d.value > 0);
  const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length) : 0;
  const latest = nonZero.length > 0 ? nonZero[nonZero.length - 1].value : 0;

  return (
    <View style={[styles.card, GLOW]}>
      {/* Metric selector */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {(Object.keys(NUTRITION_COLORS) as NutritionKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[ngStyles.pill, activeMetric === key && { backgroundColor: NUTRITION_COLORS[key] + '33', borderColor: NUTRITION_COLORS[key], borderWidth: 1 }]}
            onPress={() => setActiveMetric(key)}
          >
            <View style={[ngStyles.dot, { backgroundColor: NUTRITION_COLORS[key] }]} />
            <Text style={[ngStyles.pillTxt, activeMetric === key && { color: NUTRITION_COLORS[key] }]}>{NUTRITION_LABELS[key]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={ngStyles.statBox}>
          <Text style={[ngStyles.statVal, { color: NUTRITION_COLORS[activeMetric] }]}>{latest.toLocaleString()}</Text>
          <Text style={ngStyles.statLabel}>today {NUTRITION_UNITS[activeMetric]}</Text>
        </View>
        <View style={ngStyles.statBox}>
          <Text style={[ngStyles.statVal, { color: NUTRITION_COLORS[activeMetric] }]}>{avg.toLocaleString()}</Text>
          <Text style={ngStyles.statLabel}>avg {NUTRITION_UNITS[activeMetric]}</Text>
        </View>
      </View>

      <LineChart data={chartData} color={NUTRITION_COLORS[activeMetric]} unit={NUTRITION_UNITS[activeMetric]} range={range} />
    </View>
  );
}

const ngStyles = StyleSheet.create({
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 10, backgroundColor: '#222' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { color: SUB, fontWeight: '600', fontSize: 11 },
  statBox: { flex: 1, backgroundColor: '#222', borderRadius: 10, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: SUB, marginTop: 2 },
});

// ── Main Screen ────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [streaks, setStreaks] = useState({ calorie: 0, training: 0 });
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [volumeHistory, setVolumeHistory] = useState<{ date: string; volume: number }[]>([]);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [nutritionRange, setNutritionRange] = useState<TimeRange>('7d');
  const [volumeRange, setVolumeRange] = useState<TimeRange>('30d');

  const load = useCallback(async () => {
    const wl = await getWeightLog();
    setWeightLog(wl);
    const s = await getStreaks();
    setStreaks(s);
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

  const weightChartData = weightLog.slice(-RANGE_DAYS['30d']).map((e) => ({ date: e.date, value: e.weight }));
  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1] : null;
  const weightChange = weightLog.length >= 2
    ? weightLog[weightLog.length-1].weight - weightLog[weightLog.length-2].weight
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
            <View style={[styles.card, { flex: 1, alignItems: 'center', paddingVertical: 20 }, GLOW]}>
              <Text style={{ fontSize: 32 }}>🔥</Text>
              <Text style={styles.bigNum}>{streaks.calorie}</Text>
              <Text style={styles.bigLabel}>day calorie streak</Text>
            </View>
            <View style={[styles.card, { flex: 1, alignItems: 'center', paddingVertical: 20 }, GLOW]}>
              <Text style={{ fontSize: 32 }}>💪</Text>
              <Text style={styles.bigNum}>{streaks.training}</Text>
              <Text style={styles.bigLabel}>day training streak</Text>
            </View>
          </View>
        </View>

        {/* Nutrition Graphs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition</Text>
          <RangePicker value={nutritionRange} onChange={setNutritionRange} />
          <NutritionGraphs range={nutritionRange} />
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
          <View style={[styles.card, GLOW]}>
            {latestWeight ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: TEXT }}>
                    {latestWeight.weight}<Text style={{ fontSize: 16, color: SUB }}> kg</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: SUB }}>Last logged {shortDate(latestWeight.date, '30d')}</Text>
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
              <Text style={{ color: SUB, fontSize: 14, marginBottom: 12 }}>No weight logged yet</Text>
            )}
            <LineChart data={weightChartData} color={BLUE} unit="kg" range="30d" />
          </View>
        </View>

        {/* Volume Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume Tracking</Text>
          {exerciseNames.length === 0 ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 30, gap: 6 }]}>
              <Ionicons name="barbell-outline" size={32} color="#333" />
              <Text style={{ color: '#444', fontSize: 15, fontWeight: '600' }}>No exercise data yet</Text>
              <Text style={{ color: '#333', fontSize: 13 }}>Log sets in Journal to see volume graphs</Text>
            </View>
          ) : (
            <View style={[styles.card, GLOW]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
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
              <Text style={{ fontSize: 11, color: '#2a2a2a', marginTop: 10 }}>
                Volume = reps × weight per set, summed per session.
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
