import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getJournal, saveJournalEntry, getFoodLog, getWorkoutPlans, getSchedule, getRestTimerDuration } from '../../utils/storage';
import { JournalEntry, LoggedExercise, LoggedSet, WorkoutPlan } from '../../utils/types';

const ACCENT = '#a78bfa';
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#f0f0f0';
const SUB = '#666';
const GREEN = '#4ade80';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTodayStr() { return new Date().toISOString().split('T')[0]; }
function getDateStr(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
function formatDateLabel(dateStr: string) {
  const today = getTodayStr();
  const yesterday = getDateStr(-1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function getDayKey(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return DAYS[idx];
}

// ── Rest Timer Component ──────────────────────────────────────────
function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: seconds * 1000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(interval); onDone(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  const widthPct = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={timerStyles.wrap}>
      <View style={timerStyles.progressBg}>
        <Animated.View style={[timerStyles.progressFill, { width: widthPct }]} />
      </View>
      <Text style={timerStyles.label}>{label} rest</Text>
      <TouchableOpacity style={timerStyles.skipBtn} onPress={onDone}>
        <Text style={timerStyles.skipTxt}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  wrap: { backgroundColor: '#1e1a2e', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  progressBg: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: '#2a2040', borderRadius: 14 },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#a78bfa22' },
  label: { flex: 1, color: '#a78bfa', fontWeight: '700', fontSize: 16, zIndex: 1 },
  skipBtn: { backgroundColor: '#a78bfa18', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, zIndex: 1 },
  skipTxt: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },
});

// ── Set Row ────────────────────────────────────────────────────────
function SetRow({ setNum, set, onChange, onDelete }: { setNum: number; set: LoggedSet; onChange: (s: LoggedSet) => void; onDelete: () => void }) {
  return (
    <View style={setStyles.row}>
      <Text style={setStyles.num}>{setNum}</Text>
      <TextInput
        style={setStyles.input}
        placeholder="Reps"
        placeholderTextColor={SUB}
        value={set.reps}
        onChangeText={(v) => onChange({ ...set, reps: v })}
        keyboardType="numeric"
      />
      <TextInput
        style={setStyles.input}
        placeholder="Weight"
        placeholderTextColor={SUB}
        value={set.weight}
        onChangeText={(v) => onChange({ ...set, weight: v })}
      />
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color="#3a3a3a" />
      </TouchableOpacity>
    </View>
  );
}

const setStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  num: { width: 22, textAlign: 'center', color: SUB, fontWeight: '700', fontSize: 13 },
  input: { flex: 1, backgroundColor: '#222', borderRadius: 9, padding: 10, color: TEXT, fontSize: 14 },
});

// ── Exercise Logger ────────────────────────────────────────────────
function calc1RM(sets: LoggedSet[]): number | null {
  let best = 0;
  for (const s of sets) {
    const reps = parseFloat(s.reps);
    const weight = parseFloat(s.weight);
    if (isNaN(reps) || isNaN(weight) || reps <= 0 || weight <= 0) continue;
    const est = weight * (1 + reps / 30);
    if (est > best) best = est;
  }
  return best > 0 ? Math.round(best) : null;
}

function ExerciseLogger({ exercise, onChange, restDuration }: { exercise: LoggedExercise; onChange: (e: LoggedExercise) => void; restDuration: number }) {
  const [timerSecs, setTimerSecs] = useState<number | null>(null);

  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: LoggedSet = { reps: lastSet?.reps || '', weight: lastSet?.weight || '' };
    const updated = { ...exercise, sets: [...exercise.sets, newSet] };
    onChange(updated);
    if (exercise.sets.length > 0) setTimerSecs(restDuration);
  };

  const updateSet = (i: number, s: LoggedSet) => {
    const sets = [...exercise.sets]; sets[i] = s;
    onChange({ ...exercise, sets });
  };

  const deleteSet = (i: number) => {
    const sets = exercise.sets.filter((_, idx) => idx !== i);
    onChange({ ...exercise, sets });
  };

  const est1RM = calc1RM(exercise.sets);

  return (
    <View style={exStyles.wrap}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={exStyles.name}>{exercise.exerciseName}</Text>
        {est1RM !== null && (
          <View style={exStyles.ormBadge}>
            <Text style={exStyles.ormTxt}>~{est1RM}kg 1RM</Text>
          </View>
        )}
      </View>
      <View style={exStyles.header}>
        <Text style={[exStyles.col, { width: 22 }]}>#</Text>
        <Text style={[exStyles.col, { flex: 1 }]}>Reps</Text>
        <Text style={[exStyles.col, { flex: 1 }]}>Weight</Text>
        <View style={{ width: 18 }} />
      </View>
      {exercise.sets.map((set, i) => (
        <SetRow key={i} setNum={i + 1} set={set} onChange={(s) => updateSet(i, s)} onDelete={() => deleteSet(i)} />
      ))}
      {timerSecs !== null && (
        <RestTimer seconds={timerSecs} onDone={() => setTimerSecs(null)} />
      )}
      <TouchableOpacity style={exStyles.addSetBtn} onPress={addSet}>
        <Ionicons name="add" size={15} color={ACCENT} />
        <Text style={exStyles.addSetTxt}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const exStyles = StyleSheet.create({
  wrap: { backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  name: { fontSize: 15, fontWeight: '700', color: TEXT },
  ormBadge: { backgroundColor: ACCENT + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ormTxt: { color: ACCENT, fontWeight: '700', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  col: { fontSize: 11, color: SUB, fontWeight: '600' },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#a78bfa15', borderRadius: 8 },
  addSetTxt: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },
});

// ── Main Journal Screen ────────────────────────────────────────────
export default function JournalScreen() {
  const [dateOffset, setDateOffset] = useState(0);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [caloriesForDay, setCaloriesForDay] = useState(0);
  const [scheduledPlan, setScheduledPlan] = useState<WorkoutPlan | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  const currentDate = getDateStr(dateOffset);

  const loadData = useCallback(async () => {
    const journal = await getJournal();
    const foodLog = await getFoodLog();
    const plans = await getWorkoutPlans();
    const schedule = await getSchedule();

    const dayKey = getDayKey(currentDate);
    const planId = schedule[dayKey];
    const plan = planId ? plans.find((p) => p.id === planId) || null : null;
    setScheduledPlan(plan);

    const existing = journal[currentDate];
    if (existing) {
      setEntry(existing);
      setNotes(existing.notes);
    } else {
      // Build a fresh entry pre-populated with today's scheduled exercises
      const freshExercises: LoggedExercise[] = plan
        ? plan.exercises.map((ex) => ({ exerciseName: ex.name, sets: [] }))
        : [];
      setEntry({ date: currentDate, wentToGym: false, exercises: freshExercises, notes: '' });
      setNotes('');
    }

    const dayFoods = foodLog[currentDate] || [];
    setCaloriesForDay(dayFoods.reduce((s, f) => s + f.calories, 0));
    const rd = await getRestTimerDuration();
    setRestDuration(rd);
  }, [currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (updated: JournalEntry) => {
    setSaving(true);
    await saveJournalEntry(updated);
    setSaving(false);
  };

  const toggleWent = async () => {
    if (!entry) return;
    const updated = { ...entry, wentToGym: !entry.wentToGym };
    setEntry(updated); await save(updated);
  };

  const updateExercise = async (i: number, ex: LoggedExercise) => {
    if (!entry) return;
    const exercises = [...entry.exercises]; exercises[i] = ex;
    const updated = { ...entry, exercises };
    setEntry(updated); await save(updated);
  };

  const saveNotes = async () => {
    if (!entry) return;
    const updated = { ...entry, notes };
    setEntry(updated); await save(updated);
  };

  if (!entry) return <SafeAreaView style={styles.safe}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUB }}>Loading…</Text></View></SafeAreaView>;

  const totalSets = entry.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        {saving && <Text style={{ color: SUB, fontSize: 12 }}>Saving…</Text>}
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Date Navigator */}
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => setDateOffset((d) => d - 1)} style={styles.dateBtn}>
              <Ionicons name="chevron-back" size={20} color={TEXT} />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{formatDateLabel(currentDate)}</Text>
            <TouchableOpacity onPress={() => setDateOffset((d) => d + 1)} disabled={dateOffset >= 0} style={styles.dateBtn}>
              <Ionicons name="chevron-forward" size={20} color={dateOffset >= 0 ? '#2a2a2a' : TEXT} />
            </TouchableOpacity>
          </View>

          {/* Summary Row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryVal}>{caloriesForDay.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>kcal eaten</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryVal, { color: entry.wentToGym ? '#a78bfa' : SUB }]}>{totalSets}</Text>
              <Text style={styles.summaryLabel}>sets logged</Text>
            </View>
            {scheduledPlan && (
              <View style={styles.summaryChip}>
                <Text style={[styles.summaryVal, { fontSize: 13 }]} numberOfLines={1}>{scheduledPlan.name}</Text>
                <Text style={styles.summaryLabel}>scheduled</Text>
              </View>
            )}
          </View>

          {/* Went to gym toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Did you train?</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, entry.wentToGym && styles.toggleBtnActive]}
                onPress={() => { if (!entry.wentToGym) toggleWent(); }}
              >
                <Ionicons name="checkmark-circle" size={18} color={entry.wentToGym ? '#fff' : SUB} />
                <Text style={[styles.toggleTxt, entry.wentToGym && { color: '#111' }]}>Yes, I trained</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !entry.wentToGym && styles.toggleBtnRest]}
                onPress={() => { if (entry.wentToGym) toggleWent(); }}
              >
                <Text style={[styles.toggleTxt, !entry.wentToGym && { color: '#fff' }]}>Rest day 💤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise logging */}
          {entry.wentToGym && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {entry.exercises.length === 0 ? (
                <View style={[CARD && { backgroundColor: CARD }, { borderRadius: 14, padding: 20, alignItems: 'center', gap: 6 }]}>
                  <Text style={{ color: SUB, fontSize: 14 }}>No exercises in today's plan</Text>
                  <Text style={{ color: '#333', fontSize: 12 }}>Assign a workout plan to {getDayKey(currentDate)} in Training</Text>
                </View>
              ) : (
                entry.exercises.map((ex, i) => (
                  <ExerciseLogger key={i} exercise={ex} onChange={(updated) => updateExercise(i, updated)} restDuration={restDuration} />
                ))
              )}
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput
                style={styles.notesInput}
                placeholder="How did it go? Energy levels, sleep, mood…"
                placeholderTextColor={SUB}
                value={notes}
                onChangeText={setNotes}
                onBlur={saveNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </KeyboardAvoidingView>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 },
  dateBtn: { padding: 4 },
  dateLabel: { fontSize: 15, color: TEXT, fontWeight: '600', minWidth: 160, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  summaryChip: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  summaryVal: { fontSize: 20, fontWeight: '800', color: TEXT },
  summaryLabel: { fontSize: 11, color: SUB, marginTop: 3 },
  section: { paddingHorizontal: 16, marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CARD, borderRadius: 13, padding: 15 },
  toggleBtnActive: { backgroundColor: '#a78bfa' },
  toggleBtnRest: { backgroundColor: '#2a2a2a' },
  toggleTxt: { color: SUB, fontWeight: '600', fontSize: 14 },
  notesInput: { backgroundColor: CARD, borderRadius: 13, padding: 14, color: TEXT, fontSize: 15, minHeight: 100 },
});
