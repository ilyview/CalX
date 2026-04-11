import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCalorieGoals, setCalorieGoals, getFoodLog,
  addFoodEntry, removeFoodEntry, getRecentFoods,
  getGoalForDate, getStreaks,
} from '../../utils/storage';
import { FoodEntry, RecentFood, CalorieGoals } from '../../utils/types';

const ACCENT = '#a78bfa';
const BG = '#0d0d0d';
const CARD = '#1a1a1a';
const TEXT = '#f0f0f0';
const SUB = '#666';

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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color }}>{Math.round(value)}g</Text>
      <Text style={{ fontSize: 11, color: SUB, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

export default function NutritionScreen() {
  const [dateOffset, setDateOffset] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [goals, setGoalsState] = useState<CalorieGoals>({ training: 2500, rest: 2000 });
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [streaks, setStreaks] = useState({ calorie: 0, training: 0 });
  const [addModal, setAddModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [newTrainingGoal, setNewTrainingGoal] = useState('');
  const [newRestGoal, setNewRestGoal] = useState('');

  const currentDate = getDateStr(dateOffset);

  const loadData = useCallback(async () => {
    const g = await getCalorieGoals();
    setGoalsState(g);
    const goal = await getGoalForDate(currentDate);
    setCalorieGoal(goal);
    const log = await getFoodLog();
    setEntries(log[currentDate] || []);
    const recents = await getRecentFoods();
    setRecentFoods(recents);
    const s = await getStreaks();
    setStreaks(s);
  }, [currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = entries.reduce((s, e) => s + (e.protein || 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs || 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat || 0), 0);
  const hasMacros = totalProtein > 0 || totalCarbs > 0 || totalFat > 0;
  const progress = Math.min(totalCalories / calorieGoal, 1);
  const remaining = calorieGoal - totalCalories;
  const isOver = remaining < 0;
  const progressColor = isOver ? '#f87171' : ACCENT;

  const openAddModal = (prefill?: RecentFood) => {
    if (prefill) {
      setFoodName(prefill.name); setCalories(prefill.calories.toString());
      setProtein(prefill.protein?.toString() || ''); setCarbs(prefill.carbs?.toString() || ''); setFat(prefill.fat?.toString() || '');
    } else {
      setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    }
    setAddModal(true);
  };

  const handleAdd = async () => {
    if (!foodName.trim() || !calories.trim()) { Alert.alert('Missing info', 'Name and calories are required.'); return; }
    const cal = parseInt(calories);
    if (isNaN(cal) || cal < 0) { Alert.alert('Invalid', 'Enter a valid calorie number.'); return; }
    const entry: FoodEntry = {
      id: Date.now().toString(), name: foodName.trim(), calories: cal,
      protein: protein ? parseFloat(protein) : undefined,
      carbs: carbs ? parseFloat(carbs) : undefined,
      fat: fat ? parseFloat(fat) : undefined,
      timestamp: Date.now(), date: currentDate,
    };
    await addFoodEntry(entry);
    setAddModal(false);
    loadData();
  };

  const handleDelete = async (id: string) => { await removeFoodEntry(currentDate, id); loadData(); };

  const handleSaveGoals = async () => {
    const t = parseInt(newTrainingGoal);
    const r = parseInt(newRestGoal);
    if (isNaN(t) || t < 100 || isNaN(r) || r < 100) { Alert.alert('Invalid', 'Enter valid goals (min 100 kcal each).'); return; }
    const newGoals = { training: t, rest: r };
    await setCalorieGoals(newGoals);
    setGoalsState(newGoals);
    setGoalModal(false);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <TouchableOpacity onPress={() => { setNewTrainingGoal(goals.training.toString()); setNewRestGoal(goals.rest.toString()); setGoalModal(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={22} color={SUB} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Streaks */}
        {(streaks.calorie > 0 || streaks.training > 0) && (
          <View style={styles.streakRow}>
            {streaks.calorie > 0 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakVal}>{streaks.calorie}</Text>
                <Text style={styles.streakLabel}>day cal streak</Text>
              </View>
            )}
            {streaks.training > 0 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakEmoji}>💪</Text>
                <Text style={styles.streakVal}>{streaks.training}</Text>
                <Text style={styles.streakLabel}>day training streak</Text>
              </View>
            )}
          </View>
        )}

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

        {/* Calorie Summary */}
        <View style={styles.card}>
          <View style={styles.calRow}>
            <View>
              <Text style={styles.calMain}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.calSub}>of {calorieGoal.toLocaleString()} kcal</Text>
            </View>
            <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
              <Text style={[styles.remainNum, { color: isOver ? '#f87171' : '#4ade80' }]}>
                {isOver ? `+${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()}
              </Text>
              <Text style={styles.calSub}>{isOver ? 'over goal' : 'remaining'}</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
          </View>
          {hasMacros && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MacroChip label="Protein" value={totalProtein} color="#60a5fa" />
              <View style={{ width: 1, height: 28, backgroundColor: '#2a2a2a' }} />
              <MacroChip label="Carbs" value={totalCarbs} color="#fbbf24" />
              <View style={{ width: 1, height: 28, backgroundColor: '#2a2a2a' }} />
              <MacroChip label="Fat" value={totalFat} color="#f87171" />
            </View>
          )}
        </View>

        {/* Quick Add */}
        {recentFoods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {recentFoods.map((food, i) => (
                <TouchableOpacity key={i} style={styles.recentChip} onPress={() => openAddModal(food)} activeOpacity={0.75}>
                  <Text style={styles.recentName} numberOfLines={1}>{food.name}</Text>
                  <Text style={styles.recentCal}>{food.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Food Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Log</Text>
          {entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="restaurant-outline" size={32} color="#333" />
              <Text style={styles.emptyTxt}>No entries yet</Text>
              <Text style={styles.emptySub}>Tap + to log food</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  {(entry.protein || entry.carbs || entry.fat) ? (
                    <Text style={styles.entryMacros}>
                      {[entry.protein != null ? `P ${entry.protein}g` : null, entry.carbs != null ? `C ${entry.carbs}g` : null, entry.fat != null ? `F ${entry.fat}g` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.entryCal}>{entry.calories}</Text>
                  <Text style={styles.entryCalUnit}>kcal</Text>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={17} color="#3a3a3a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => openAddModal()} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <Modal visible={addModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Log Food</Text>
                <TextInput style={styles.input} placeholder="Food name *" placeholderTextColor={SUB} value={foodName} onChangeText={setFoodName} />
                <TextInput style={styles.input} placeholder="Calories (kcal) *" placeholderTextColor={SUB} value={calories} onChangeText={setCalories} keyboardType="numeric" />
                <Text style={{ fontSize: 12, color: SUB, marginBottom: 8, marginTop: -2 }}>Macros (optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein g" placeholderTextColor={SUB} value={protein} onChangeText={setProtein} keyboardType="numeric" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs g" placeholderTextColor={SUB} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fat g" placeholderTextColor={SUB} value={fat} onChangeText={setFat} keyboardType="numeric" />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}><Text style={styles.confirmTxt}>Add</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goals Modal */}
      <Modal visible={goalModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Calorie Goals</Text>
                <Text style={{ color: SUB, fontSize: 13, marginBottom: 14, marginTop: -8 }}>
                  The app picks the right goal automatically based on whether you have a workout scheduled that day.
                </Text>
                <Text style={styles.goalLabel}>🏋️ Training day</Text>
                <TextInput style={styles.input} placeholder="e.g. 2500" placeholderTextColor={SUB} value={newTrainingGoal} onChangeText={setNewTrainingGoal} keyboardType="numeric" />
                <Text style={styles.goalLabel}>💤 Rest day</Text>
                <TextInput style={styles.input} placeholder="e.g. 2000" placeholderTextColor={SUB} value={newRestGoal} onChangeText={setNewRestGoal} keyboardType="numeric" />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModal(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveGoals}><Text style={styles.confirmTxt}>Save</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4, marginTop: 6 },
  streakChip: { flex: 1, backgroundColor: CARD, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakEmoji: { fontSize: 18 },
  streakVal: { fontSize: 20, fontWeight: '800', color: ACCENT },
  streakLabel: { fontSize: 11, color: SUB, flex: 1 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 },
  dateBtn: { padding: 4 },
  dateLabel: { fontSize: 15, color: TEXT, fontWeight: '600', minWidth: 110, textAlign: 'center' },
  card: { backgroundColor: CARD, borderRadius: 18, marginHorizontal: 16, marginBottom: 20, padding: 18 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  calMain: { fontSize: 46, fontWeight: '800', color: TEXT, letterSpacing: -1 },
  calSub: { fontSize: 13, color: SUB, marginTop: 2 },
  remainNum: { fontSize: 26, fontWeight: '700' },
  progressBg: { height: 7, backgroundColor: '#252525', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 4 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 12 },
  recentChip: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 90, maxWidth: 130 },
  recentName: { fontSize: 13, color: TEXT, fontWeight: '600', marginBottom: 3 },
  recentCal: { fontSize: 11, color: ACCENT },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTxt: { color: '#444', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#333', fontSize: 13 },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 13, padding: 14, marginBottom: 8 },
  entryName: { fontSize: 15, color: TEXT, fontWeight: '500' },
  entryMacros: { fontSize: 12, color: SUB, marginTop: 3 },
  entryCal: { fontSize: 17, fontWeight: '700', color: ACCENT },
  entryCalUnit: { fontSize: 11, color: SUB, marginRight: 4 },
  fab: { position: 'absolute', bottom: 26, right: 22, backgroundColor: ACCENT, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#181818', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 18 },
  goalLabel: { fontSize: 14, color: TEXT, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#222', borderRadius: 11, padding: 14, color: TEXT, fontSize: 15, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, backgroundColor: '#222', borderRadius: 11, padding: 15, alignItems: 'center' },
  cancelTxt: { color: SUB, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 11, padding: 15, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
