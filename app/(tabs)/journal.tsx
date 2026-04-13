import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { getJournal, saveJournalEntry, getFoodLog, getWorkoutPlans, getSchedule, getRestTimerDuration } from '../../utils/storage';
import { JournalEntry, LoggedExercise, LoggedSet, WorkoutPlan } from '../../utils/types';

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

function calc1RM(sets: LoggedSet[]): number | null {
  let best = 0;
  for (const s of sets) {
    const reps = parseFloat(s.reps); const weight = parseFloat(s.weight);
    if (isNaN(reps) || isNaN(weight) || reps <= 0 || weight <= 0) continue;
    const est = weight * (1 + reps / 30);
    if (est > best) best = est;
  }
  return best > 0 ? Math.round(best) : null;
}

function RestTimer({ seconds, onDone, theme: T }: { seconds: number; onDone: () => void; theme: any }) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 0, duration: seconds * 1000, useNativeDriver: false }).start();
    const interval = setInterval(() => {
      setRemaining((r) => { if (r <= 1) { clearInterval(interval); onDone(); return 0; } return r - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  const widthPct = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ backgroundColor: T.card, borderRadius: T.radius, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', ...(T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}), shadowColor: T.accent, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: widthPct, backgroundColor: T.accent + '33' }} />
      <Text style={{ flex: 1, color: T.accent, fontWeight: '700', fontSize: 16, zIndex: 1 }}>{label} rest</Text>
      <TouchableOpacity style={{ backgroundColor: T.accent + '22', borderRadius: T.radius, paddingHorizontal: 12, paddingVertical: 6, zIndex: 1 }} onPress={onDone}>
        <Text style={{ color: T.accent, fontWeight: '600', fontSize: 13 }}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

function SetRow({ setNum, set, onChange, onDelete, theme: T }: { setNum: number; set: LoggedSet; onChange: (s: LoggedSet) => void; onDelete: () => void; theme: any }) {
  const inputStyle = { flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 10, color: T.text, fontSize: 14, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Text style={{ width: 22, textAlign: 'center', color: T.sub, fontWeight: '700', fontSize: 13 }}>{setNum}</Text>
      <TextInput style={inputStyle} placeholder="Reps" placeholderTextColor={T.sub} value={set.reps} onChangeText={(v) => onChange({ ...set, reps: v })} keyboardType="numeric" />
      <TextInput style={inputStyle} placeholder="Weight" placeholderTextColor={T.sub} value={set.weight} onChangeText={(v) => onChange({ ...set, weight: v })} />
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color={T.sub} />
      </TouchableOpacity>
    </View>
  );
}

function ExerciseLogger({ exercise, onChange, restDuration, theme: T }: { exercise: LoggedExercise; onChange: (e: LoggedExercise) => void; restDuration: number; theme: any }) {
  const [timerSecs, setTimerSecs] = useState<number | null>(null);

  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: LoggedSet = { reps: lastSet?.reps || '', weight: lastSet?.weight || '' };
    onChange({ ...exercise, sets: [...exercise.sets, newSet] });
    if (exercise.sets.length > 0) setTimerSecs(restDuration);
  };
  const updateSet = (i: number, s: LoggedSet) => { const sets = [...exercise.sets]; sets[i] = s; onChange({ ...exercise, sets }); };
  const deleteSet = (i: number) => onChange({ ...exercise, sets: exercise.sets.filter((_, idx) => idx !== i) });

  const est1RM = calc1RM(exercise.sets);

  return (
    <View style={{ backgroundColor: T.card, borderRadius: T.radius, padding: 14, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}), shadowColor: T.accent, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{exercise.exerciseName}</Text>
        {est1RM !== null && (
          <View style={{ backgroundColor: T.accent + '22', borderRadius: T.radius, paddingHorizontal: 10, paddingVertical: 4, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.accent } : {}) }}>
            <Text style={{ color: T.accent, fontWeight: '700', fontSize: 12 }}>~{est1RM}kg 1RM</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ width: 22, textAlign: 'center', fontSize: 11, color: T.sub, fontWeight: '600' }}>#</Text>
        <Text style={{ flex: 1, fontSize: 11, color: T.sub, fontWeight: '600' }}>Reps</Text>
        <Text style={{ flex: 1, fontSize: 11, color: T.sub, fontWeight: '600' }}>Weight</Text>
        <View style={{ width: 18 }} />
      </View>
      {exercise.sets.map((set, i) => (
        <SetRow key={i} setNum={i + 1} set={set} onChange={(s) => updateSet(i, s)} onDelete={() => deleteSet(i)} theme={T} />
      ))}
      {timerSecs !== null && <RestTimer seconds={timerSecs} onDone={() => setTimerSecs(null)} theme={T} />}
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: T.accent + '18', borderRadius: T.radius }} onPress={addSet}>
        <Ionicons name="add" size={15} color={T.accent} />
        <Text style={{ color: T.accent, fontWeight: '600', fontSize: 13 }}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function JournalScreen() {
  const { theme: T } = useTheme();
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
    if (existing) { setEntry(existing); setNotes(existing.notes); }
    else {
      const freshExercises: LoggedExercise[] = plan ? plan.exercises.map((ex) => ({ exerciseName: ex.name, sets: [] })) : [];
      setEntry({ date: currentDate, wentToGym: false, exercises: freshExercises, notes: '' });
      setNotes('');
    }
    const dayFoods = foodLog[currentDate] || [];
    setCaloriesForDay(dayFoods.reduce((s, f) => s + f.calories, 0));
    const rd = await getRestTimerDuration();
    setRestDuration(rd);
  }, [currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (updated: JournalEntry) => { setSaving(true); await saveJournalEntry(updated); setSaving(false); };
  const toggleWent = async () => { if (!entry) return; const u = { ...entry, wentToGym: !entry.wentToGym }; setEntry(u); await save(u); };
  const updateExercise = async (i: number, ex: LoggedExercise) => {
    if (!entry) return;
    const exercises = [...entry.exercises]; exercises[i] = ex;
    const u = { ...entry, exercises }; setEntry(u); await save(u);
  };
  const saveNotes = async () => { if (!entry) return; const u = { ...entry, notes }; setEntry(u); await save(u); };

  if (!entry) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: T.sub }}>Loading…</Text>
    </SafeAreaView>
  );

  const totalSets = entry.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          {T.name === 'minecraft' ? '📖 Journal' : 'Journal'}
        </Text>
        {saving && <Text style={{ color: T.sub, fontSize: 12 }}>Saving…</Text>}
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Date Nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 }}>
            <TouchableOpacity onPress={() => setDateOffset((d) => d - 1)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={20} color={T.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, color: T.text, fontWeight: '600', minWidth: 160, textAlign: 'center' }}>{formatDateLabel(currentDate)}</Text>
            <TouchableOpacity onPress={() => setDateOffset((d) => d + 1)} disabled={dateOffset >= 0} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={20} color={dateOffset >= 0 ? T.progressBg : T.text} />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 }}>
            {[
              { val: caloriesForDay.toLocaleString(), label: 'kcal eaten' },
              { val: totalSets, label: 'sets logged', color: entry.wentToGym ? T.accent : T.sub },
              scheduledPlan ? { val: scheduledPlan.name, label: 'scheduled', small: true } : null,
            ].filter(Boolean).map((item: any, i) => (
              <View key={i} style={[{ flex: 1, backgroundColor: T.card, borderRadius: T.radius, padding: 14, alignItems: 'center' }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}, { shadowColor: T.accent, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }]}>
                <Text style={{ fontSize: item.small ? 13 : 20, fontWeight: '800', color: item.color || T.text }} numberOfLines={1}>{item.val}</Text>
                <Text style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Trained toggle */}
          <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Did you train?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: T.radius, padding: 15, backgroundColor: T.card }, entry.wentToGym ? { backgroundColor: T.accent } : T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}
                onPress={() => { if (!entry.wentToGym) toggleWent(); }}
              >
                <Ionicons name="checkmark-circle" size={18} color={entry.wentToGym ? T.accentText : T.sub} />
                <Text style={{ color: entry.wentToGym ? T.accentText : T.sub, fontWeight: '600', fontSize: 14 }}>Yes, I trained</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: T.radius, padding: 15, backgroundColor: T.card }, !entry.wentToGym ? { backgroundColor: T.inputBg, borderWidth: T.cardBorder ? 2 : 1, borderColor: T.cardBorder || T.sub + '44' } : T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}
                onPress={() => { if (entry.wentToGym) toggleWent(); }}
              >
                <Text style={{ color: !entry.wentToGym ? T.text : T.sub, fontWeight: '600', fontSize: 14 }}>Rest day 💤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercises */}
          {entry.wentToGym && (
            <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Exercises</Text>
              {entry.exercises.length === 0 ? (
                <View style={[{ backgroundColor: T.card, borderRadius: T.radius, padding: 20, alignItems: 'center', gap: 6 }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}>
                  <Text style={{ color: T.sub, fontSize: 14 }}>No exercises in today's plan</Text>
                  <Text style={{ color: T.sub, fontSize: 12, opacity: 0.6 }}>Assign a workout to {getDayKey(currentDate)} in Training</Text>
                </View>
              ) : (
                entry.exercises.map((ex, i) => (
                  <ExerciseLogger key={i} exercise={ex} onChange={(updated) => updateExercise(i, updated)} restDuration={restDuration} theme={T} />
                ))
              )}
            </View>
          )}

          {/* Notes */}
          <View style={{ paddingHorizontal: 16, marginBottom: 22 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Notes</Text>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TextInput
                style={[{ backgroundColor: T.card, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, minHeight: 100 }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}
                placeholder={T.name === 'minecraft' ? 'How was the grind today?' : 'How did it go? Energy levels, sleep, mood…'}
                placeholderTextColor={T.sub}
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
