import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { getWeightLog, addWeightEntry, getStreaks, getVolumeHistory, getJournal, getNutritionHistory } from '../../utils/storage';
import { WeightEntry } from '../../utils/types';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;
const CHART_H = 110;

function getTodayStr() { return new Date().toISOString().split('T')[0]; }

type TimeRange = '7d' | '30d' | '6m' | '1y';
const RANGE_DAYS: Record<TimeRange, number> = { '7d': 7, '30d': 30, '6m': 180, '1y': 365 };

function shortDate(dateStr: string, range: TimeRange) {
  const d = new Date(dateStr + 'T00:00:00');
  if (range === '7d') return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RangePicker({ value, onChange, theme: T }: { value: TimeRange; onChange: (r: TimeRange) => void; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
      {(['7d', '30d', '6m', '1y'] as TimeRange[]).map((r) => (
        <TouchableOpacity key={r} style={[{ flex: 1, paddingVertical: 8, borderRadius: T.radius, backgroundColor: T.inputBg, alignItems: 'center' }, value === r ? { backgroundColor: T.accent } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]} onPress={() => onChange(r)}>
          <Text style={[{ fontWeight: '700', fontSize: 13, color: T.sub }, value === r && { color: T.accentText }]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LineChart({ data, color, range, theme: T }: { data: { date: string; value: number }[]; color: string; range: TimeRange; theme: any }) {
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length < 2) return (
    <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: T.sub, fontSize: 13 }}>Not enough data yet</Text>
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
        {[0, 0.5, 1].map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: PAD + H * (1 - p) - 0.5, height: 1, backgroundColor: T.progressBg }} />
        ))}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1];
          if (pt.value === 0 || next.value === 0) return null;
          const dx = next.x - pt.x; const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const cx = (pt.x + next.x) / 2; const cy = (pt.y + next.y) / 2;
          return <View key={i} style={{ position: 'absolute', left: cx - len / 2, top: cy - 1, width: len, height: 2, backgroundColor: color, borderRadius: 1, transform: [{ rotate: `${angle}deg` }] }} />;
        })}
        {points.map((pt, i) => pt.value > 0 ? (
          <View key={i} style={{ position: 'absolute', left: pt.x - 4, top: pt.y - 4, width: 8, height: 8, borderRadius: T.name === 'minecraft' ? 1 : 4, backgroundColor: color, borderWidth: 2, borderColor: T.card, shadowColor: color, shadowOpacity: 0.7, shadowRadius: 4 }} />
        ) : null)}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 4 }}>
        {labelIdxs.map((idx) => <Text key={idx} style={{ fontSize: 9, color: T.sub }}>{shortDate(data[idx].date, range)}</Text>)}
      </View>
    </View>
  );
}

function BarChart({ data, theme: T }: { data: { date: string; volume: number }[]; theme: any }) {
  if (data.length === 0) return <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: T.sub, fontSize: 13 }}>No data yet — log sets in Journal</Text></View>;
  const max = Math.max(...data.map((d) => d.volume)) || 1;
  const trend = data.length >= 2 ? data[data.length-1].volume > data[0].volume ? 'up' : data[data.length-1].volume < data[0].volume ? 'down' : 'flat' : 'flat';
  const trendColor = trend === 'up' ? T.successText : trend === 'down' ? T.dangerText : T.sub;
  const barW = Math.min(28, (CHART_W / data.length) - 4);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ionicons name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'} size={15} color={trendColor} />
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
              <View style={[{ width: barW, height: h, borderRadius: T.name === 'minecraft' ? 2 : 4 }, isLast ? { backgroundColor: T.accent, shadowColor: T.accent, shadowOpacity: 0.6, shadowRadius: 6 } : { backgroundColor: T.accent + '44' }]} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: T.sub }}>{data[0]?.date ? shortDate(data[0].date, '7d') : ''}</Text>
        <Text style={{ fontSize: 10, color: T.sub }}>{data[data.length-1]?.date ? shortDate(data[data.length-1].date, '7d') : ''}</Text>
      </View>
    </View>
  );
}

type NutritionKey = 'calories' | 'protein' | 'carbs' | 'fat';

function NutritionGraphs({ range, theme: T }: { range: TimeRange; theme: any }) {
  const [data, setData] = useState<any[]>([]);
  const [activeMetric, setActiveMetric] = useState<NutritionKey>('calories');

  const NUTRITION_COLORS: Record<NutritionKey, string> = { calories: T.accent, protein: T.protein, carbs: T.carbs, fat: T.fat };
  const NUTRITION_LABELS: Record<NutritionKey, string> = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
  const NUTRITION_UNITS: Record<NutritionKey, string> = { calories: 'kcal', protein: 'g', carbs: 'g', fat: 'g' };

  useEffect(() => { getNutritionHistory(RANGE_DAYS[range]).then(setData); }, [range]);

  const chartData = data.map((d) => ({ date: d.date, value: d[activeMetric] }));
  const nonZero = chartData.filter((d) => d.value > 0);
  const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((s, d) => s + d.value, 0) / nonZero.length) : 0;
  const latest = nonZero.length > 0 ? nonZero[nonZero.length - 1].value : 0;

  return (
    <View style={[{ backgroundColor: T.card, borderRadius: T.radius, padding: 16 }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}, { shadowColor: T.accent, shadowOpacity: 0.18, shadowRadius: 10, elevation: 5 }]}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {(Object.keys(NUTRITION_COLORS) as NutritionKey[]).map((key) => (
          <TouchableOpacity key={key} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: T.radius, backgroundColor: T.inputBg }, activeMetric === key ? { backgroundColor: NUTRITION_COLORS[key] + '33', borderWidth: 1, borderColor: NUTRITION_COLORS[key] } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]} onPress={() => setActiveMetric(key)}>
            <View style={{ width: 6, height: 6, borderRadius: T.name === 'minecraft' ? 1 : 3, backgroundColor: NUTRITION_COLORS[key] }} />
            <Text style={[{ fontWeight: '600', fontSize: 11, color: T.sub }, activeMetric === key && { color: NUTRITION_COLORS[key] }]}>{NUTRITION_LABELS[key]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {[['today ' + NUTRITION_UNITS[activeMetric], latest], ['avg ' + NUTRITION_UNITS[activeMetric], avg]].map(([label, val], i) => (
          <View key={i} style={[{ flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 12, alignItems: 'center' }, T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: NUTRITION_COLORS[activeMetric] }}>{(val as number).toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label as string}</Text>
          </View>
        ))}
      </View>
      <LineChart data={chartData} color={NUTRITION_COLORS[activeMetric]} range={range} theme={T} />
    </View>
  );
}

export default function ProgressScreen() {
  const { theme: T } = useTheme();
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [streaks, setStreaks] = useState({ calorie: 0, training: 0 });
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [volumeHistory, setVolumeHistory] = useState<{ date: string; volume: number }[]>([]);
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [nutritionRange, setNutritionRange] = useState<TimeRange>('7d');

  const load = useCallback(async () => {
    const wl = await getWeightLog(); setWeightLog(wl);
    const s = await getStreaks(); setStreaks(s);
    const journal = await getJournal();
    const names = new Set<string>();
    for (const entry of Object.values(journal)) for (const ex of entry.exercises) if (ex.sets.length > 0) names.add(ex.exerciseName);
    const nameArr = Array.from(names);
    setExerciseNames(nameArr);
    if (nameArr.length > 0 && !selectedExercise) setSelectedExercise(nameArr[0]);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selectedExercise) getVolumeHistory(selectedExercise).then(setVolumeHistory); }, [selectedExercise]);

  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;
    await addWeightEntry({ date: getTodayStr(), weight: w });
    setWeightInput(''); setWeightModal(false); load();
  };

  const weightChartData = weightLog.slice(-30).map((e) => ({ date: e.date, value: e.weight }));
  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1] : null;
  const weightChange = weightLog.length >= 2 ? weightLog[weightLog.length-1].weight - weightLog[weightLog.length-2].weight : null;

  const cardStyle = (extra?: object) => ([
    { backgroundColor: T.card, borderRadius: T.radius, padding: 16 },
    T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {},
    { shadowColor: T.accent, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
    extra || {},
  ]);

  const inputStyle = { backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          {T.name === 'minecraft' ? '📊 Progress' : 'Progress'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Streaks */}
        <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Streaks</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ emoji: '🔥', val: streaks.calorie, label: 'day calorie streak' }, { emoji: '💪', val: streaks.training, label: 'day training streak' }].map((item, i) => (
              <View key={i} style={[...cardStyle(), { flex: 1, alignItems: 'center', paddingVertical: 20 }]}>
                <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                <Text style={{ fontSize: 42, fontWeight: '800', color: T.accent, marginTop: 4 }}>{item.val}</Text>
                <Text style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Nutrition */}
        <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Nutrition</Text>
          <RangePicker value={nutritionRange} onChange={setNutritionRange} theme={T} />
          <NutritionGraphs range={nutritionRange} theme={T} />
        </View>

        {/* Body Weight */}
        <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text }}>Body Weight</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => { setWeightInput(latestWeight?.weight.toString() || ''); setWeightModal(true); }}>
              <Ionicons name="add" size={15} color={T.accent} />
              <Text style={{ color: T.accent, fontWeight: '600', fontSize: 14 }}>Log today</Text>
            </TouchableOpacity>
          </View>
          <View style={cardStyle()}>
            {latestWeight ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: T.text }}>{latestWeight.weight}<Text style={{ fontSize: 16, color: T.sub }}> kg</Text></Text>
                  <Text style={{ fontSize: 12, color: T.sub }}>Last logged {shortDate(latestWeight.date, '30d')}</Text>
                </View>
                {weightChange !== null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: weightChange < 0 ? T.successText : T.dangerText }}>{weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg</Text>
                    <Text style={{ fontSize: 11, color: T.sub }}>vs last entry</Text>
                  </View>
                )}
              </View>
            ) : <Text style={{ color: T.sub, fontSize: 14, marginBottom: 12 }}>No weight logged yet</Text>}
            <LineChart data={weightChartData} color={T.protein} range="30d" theme={T} />
          </View>
        </View>

        {/* Volume */}
        <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Volume Tracking</Text>
          {exerciseNames.length === 0 ? (
            <View style={[...cardStyle(), { alignItems: 'center', paddingVertical: 30, gap: 6 }]}>
              <Ionicons name="barbell-outline" size={32} color={T.sub} />
              <Text style={{ color: T.sub, fontSize: 15, fontWeight: '600' }}>No exercise data yet</Text>
              <Text style={{ color: T.sub, fontSize: 13, opacity: 0.6 }}>Log sets in Journal to see volume graphs</Text>
            </View>
          ) : (
            <View style={cardStyle()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                {exerciseNames.map((name) => (
                  <TouchableOpacity key={name} style={[{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.inputBg, borderRadius: T.radius * 2 }, selectedExercise === name ? { backgroundColor: T.accent } : T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]} onPress={() => setSelectedExercise(name)}>
                    <Text style={[{ fontWeight: '600', fontSize: 13, color: T.sub }, selectedExercise === name && { color: T.accentText }]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {selectedExercise && <BarChart data={volumeHistory} theme={T} />}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={weightModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44, ...(T.cardBorder ? { borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: T.cardBorder } : {}) }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>Log Body Weight</Text>
                <TextInput style={inputStyle} placeholder="Weight in kg (e.g. 75.5)" placeholderTextColor={T.sub} value={weightInput} onChangeText={setWeightInput} keyboardType="numeric" autoFocus />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 15, alignItems: 'center' }} onPress={() => setWeightModal(false)}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: T.accent, borderRadius: T.radius, padding: 15, alignItems: 'center' }} onPress={handleSaveWeight}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
