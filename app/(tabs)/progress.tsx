import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getWeightLog,
  addWeightEntry,
  getStreaks,
  getVolumeHistory,
  getJournal,
} from '../../utils/storage';

import { WeightEntry } from '../../utils/types';

/* ───── THEME ───── */
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

const todayStr = () => new Date().toISOString().split('T')[0];

const shortDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

/* ───── LINE CHART ───── */
function LineChart({ data, color = ACCENT }: any) {
  if (data.length < 2) {
    return (
      <View style={{ height: CHART_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: SUB }}>Log at least 2 entries</Text>
      </View>
    );
  }

  const values = data.map((d: any) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d: any, i: number) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: CHART_H - ((d.value - min) / range) * (CHART_H - 20) - 10,
  }));

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ marginLeft: 36, width: CHART_W, height: CHART_H }}>

        {/* subtle grid */}
        {[0, 0.5, 1].map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: p * (CHART_H - 20) + 10,
              height: 1,
              backgroundColor: '#1f1f1f',
            }}
          />
        ))}

        {/* glow line (fake glow by stacking lines) */}
        {points.slice(0, -1).map((p: any, i: number) => {
          const n = points[i + 1];
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View key={i}>
              {/* outer glow */}
              <View
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: len,
                  height: 6,
                  backgroundColor: color,
                  opacity: 0.15,
                  transform: [{ rotate: `${angle}deg` }],
                  borderRadius: 6,
                }}
              />
              {/* main line */}
              <View
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: len,
                  height: 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            </View>
          );
        })}

        {/* dots */}
        {points.map((p: any, i: number) => {
          const isLast = i === points.length - 1;

          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: p.x - 4,
                top: p.y - 4,
                width: isLast ? 10 : 8,
                height: isLast ? 10 : 8,
                borderRadius: 999,
                backgroundColor: isLast ? '#fff' : color,
                borderWidth: 2,
                borderColor: BG,
                shadowColor: color,
                shadowOpacity: 0.4,
                shadowRadius: 6,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ───── BAR CHART ───── */
function BarChart({ data }: any) {
  if (!data.length) {
    return (
      <View style={{ height: CHART_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: SUB }}>No data yet</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d: any) => d.volume));
  const barW = Math.min(28, CHART_W / data.length - 6);

  return (
    <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {data.map((d: any, i: number) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{
              width: barW,
              height: Math.max(4, (d.volume / max) * (CHART_H - 16)),
              backgroundColor: i === data.length - 1 ? ACCENT : ACCENT + '55',
              borderRadius: 4,
            }}
          />
        </View>
      ))}
    </View>
  );
}

/* ───── SCREEN ───── */
export default function ProgressScreen() {
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [streaks, setStreaks] = useState({ calorie: 0, training: 0 });

  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [volumeHistory, setVolumeHistory] = useState<any[]>([]);

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  /* ───── LOAD DATA ───── */
  const load = useCallback(async () => {
    const wl = await getWeightLog();
    setWeightLog(wl);

    const s = await getStreaks();
    setStreaks(s);

    const journal = await getJournal();
    const names = new Set<string>();

    Object.values(journal).forEach((entry: any) => {
      entry.exercises.forEach((ex: any) => {
        if (ex.sets.length) names.add(ex.exerciseName);
      });
    });

    const arr = Array.from(names);
    setExerciseNames(arr);

    if (!selectedExercise && arr.length) setSelectedExercise(arr[0]);
  }, [selectedExercise]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedExercise) {
      getVolumeHistory(selectedExercise).then(setVolumeHistory);
    }
  }, [selectedExercise]);

  /* ───── SAVE WEIGHT ───── */
  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;

    await addWeightEntry({ date: todayStr(), weight: w });
    setWeightInput('');
    setWeightModal(false);
    load();
  };

  const latest = weightLog.at(-1);

  /* ───── UI ───── */
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>

        {/* STREAKS (RESTORED FULL) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaks</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={styles.cardCenter}>
              <Text style={styles.emoji}>🔥</Text>
              <Text style={styles.bigNum}>{streaks.calorie}</Text>
              <Text style={styles.bigLabel}>calorie streak</Text>
            </View>

            <View style={styles.cardCenter}>
              <Text style={styles.emoji}>💪</Text>
              <Text style={styles.bigNum}>{streaks.training}</Text>
              <Text style={styles.bigLabel}>training streak</Text>
            </View>
          </View>
        </View>

        {/* BODY WEIGHT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Weight</Text>

          <View style={styles.card}>
            {latest ? (
              <>
                <Text style={{ fontSize: 32, color: TEXT }}>
                  {latest.weight} kg
                </Text>
                <Text style={{ color: SUB }}>
                  Last logged {shortDate(latest.date)}
                </Text>
              </>
            ) : (
              <Text style={{ color: SUB }}>No data yet</Text>
            )}

            <LineChart data={weightLog.slice(-14).map(w => ({ date: w.date, value: w.weight }))} />
          </View>
        </View>

        {/* VOLUME */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volume Tracking</Text>

          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {exerciseNames.map(name => (
                <Pressable
                  key={name}
                  onPress={() => setSelectedExercise(name)}
                  style={({ pressed }) => [
                    styles.pill,
                    selectedExercise === name && styles.pillActive,
                    pressed && { transform: [{ scale: 0.96 }] }
                  ]}
                >
                  <Text style={{ color: selectedExercise === name ? '#fff' : SUB }}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <BarChart data={volumeHistory} />
          </View>
        </View>

      </ScrollView>

      {/* MODAL */}
      <Modal visible={weightModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modal}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder="Weight"
                placeholderTextColor={SUB}
                style={styles.input}
              />

              <TouchableOpacity onPress={handleSaveWeight} style={styles.save}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ───── STYLES ───── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: TEXT },

  section: { padding: 16 },
  sectionTitle: { color: TEXT, fontSize: 16, marginBottom: 10 },

  card: { backgroundColor: CARD, padding: 16, borderRadius: 16 },

  cardCenter: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },

  emoji: { fontSize: 28 },
  bigNum: { fontSize: 28, fontWeight: '800', color: ACCENT },
  bigLabel: { fontSize: 12, color: SUB },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    marginRight: 8,
  },

  pillActive: {
    backgroundColor: ACCENT,
  },

  modal: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000000aa',
  },

  input: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 12,
    color: TEXT,
    marginBottom: 10,
  },

  save: {
    backgroundColor: ACCENT,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});