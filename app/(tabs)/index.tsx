import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../utils/ThemeContext';
import {
  getCalorieGoals, setCalorieGoals, getFoodLog,
  addFoodEntry, removeFoodEntry, getRecentFoods,
  getGoalForDate, getStreaks,
} from '../../utils/storage';
import { FoodEntry, RecentFood, CalorieGoals } from '../../utils/types';

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

export default function NutritionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const T = theme;

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

  const cardStyle = [
    { backgroundColor: T.card, borderRadius: T.radius, padding: 18, marginHorizontal: 16, marginBottom: 20 },
    T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {},
    { shadowColor: T.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  ];

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

  const inputStyle = { backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const confirmBtnStyle = { flex: 1, backgroundColor: T.accent, borderRadius: T.radius, padding: 15, alignItems: 'center' as const };
  const cancelBtnStyle = { flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 15, alignItems: 'center' as const, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5, fontFamily: T.name === 'minecraft' ? 'monospace' : undefined }}>
          {T.name === 'minecraft' ? '🌿 Nutrition' : 'Nutrition'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={22} color={T.sub} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Streaks */}
        {(streaks.calorie > 0 || streaks.training > 0) && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4, marginTop: 6 }}>
            {streaks.calorie > 0 && (
              <View style={[{ flex: 1, borderRadius: T.radius, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.card }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}>
                <Text style={{ fontSize: 18 }}>🔥</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: T.accent }}>{streaks.calorie}</Text>
                <Text style={{ fontSize: 11, color: T.sub, flex: 1 }}>day cal streak</Text>
              </View>
            )}
            {streaks.training > 0 && (
              <View style={[{ flex: 1, borderRadius: T.radius, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.card }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}>
                <Text style={{ fontSize: 18 }}>💪</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: T.accent }}>{streaks.training}</Text>
                <Text style={{ fontSize: 11, color: T.sub, flex: 1 }}>day training streak</Text>
              </View>
            )}
          </View>
        )}

        {/* Date Nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 }}>
          <TouchableOpacity onPress={() => setDateOffset((d) => d - 1)} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={20} color={T.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: T.text, fontWeight: '600', minWidth: 110, textAlign: 'center' }}>{formatDateLabel(currentDate)}</Text>
          <TouchableOpacity onPress={() => setDateOffset((d) => d + 1)} disabled={dateOffset >= 0} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={20} color={dateOffset >= 0 ? T.progressBg : T.text} />
          </TouchableOpacity>
        </View>

        {/* Calorie Card */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 46, fontWeight: '800', color: T.text, letterSpacing: -1 }}>{totalCalories.toLocaleString()}</Text>
              <Text style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>of {calorieGoal.toLocaleString()} kcal</Text>
            </View>
            <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: isOver ? T.dangerText : T.successText }}>
                {isOver ? `+${Math.abs(remaining).toLocaleString()}` : remaining.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 13, color: T.sub }}>{isOver ? 'over goal' : 'remaining'}</Text>
            </View>
          </View>
          <View style={{ height: 7, backgroundColor: T.progressBg, borderRadius: T.radius, overflow: 'hidden', marginBottom: 14 }}>
            <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: isOver ? T.dangerText : T.accent, borderRadius: T.radius }} />
          </View>
          {hasMacros && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {[['Protein', totalProtein, T.protein], ['Carbs', totalCarbs, T.carbs], ['Fat', totalFat, T.fat]].map(([label, val, color], i) => (
                <React.Fragment key={label as string}>
                  {i > 0 && <View style={{ width: 1, height: 28, backgroundColor: T.progressBg }} />}
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: color as string }}>{Math.round(val as number)}g</Text>
                    <Text style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{label as string}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* Quick Add */}
        {recentFoods.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Quick Add</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {recentFoods.map((food, i) => (
                <TouchableOpacity key={i} style={[{ borderRadius: T.radius, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 90, maxWidth: 130, backgroundColor: T.card }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]} onPress={() => openAddModal(food)} activeOpacity={0.75}>
                  <Text style={{ fontSize: 13, color: T.text, fontWeight: '600', marginBottom: 3 }} numberOfLines={1}>{food.name}</Text>
                  <Text style={{ fontSize: 11, color: T.accent }}>{food.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Food Log */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 }}>Food Log</Text>
          {entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 6 }}>
              <Ionicons name="restaurant-outline" size={32} color={T.sub} />
              <Text style={{ color: T.sub, fontSize: 15, fontWeight: '600' }}>No entries yet</Text>
              <Text style={{ color: T.sub, fontSize: 13, opacity: 0.6 }}>Tap + to log food</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: T.radius, padding: 14, marginBottom: 8, backgroundColor: T.card }, T.cardBorder ? { borderWidth: 2, borderColor: T.cardBorder } : {}]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: T.text, fontWeight: '500' }}>{entry.name}</Text>
                  {(entry.protein || entry.carbs || entry.fat) ? (
                    <Text style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>
                      {[entry.protein != null ? `P ${entry.protein}g` : null, entry.carbs != null ? `C ${entry.carbs}g` : null, entry.fat != null ? `F ${entry.fat}g` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: T.accent }}>{entry.calories}</Text>
                  <Text style={{ fontSize: 11, color: T.sub, marginRight: 4 }}>kcal</Text>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={17} color={T.sub} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 26, right: 22, backgroundColor: T.accent, width: 58, height: 58, borderRadius: T.name === 'minecraft' ? 4 : 29, alignItems: 'center', justifyContent: 'center', shadowColor: T.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 10 }}
        onPress={() => openAddModal()} activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={T.accentText} />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <Modal visible={addModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44, ...(T.cardBorder ? { borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: T.cardBorder } : {}) }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>
                  {T.name === 'minecraft' ? '🌾 Log Food' : 'Log Food'}
                </Text>
                <TextInput style={inputStyle} placeholder="Food name *" placeholderTextColor={T.sub} value={foodName} onChangeText={setFoodName} />
                <TextInput style={inputStyle} placeholder="Calories (kcal) *" placeholderTextColor={T.sub} value={calories} onChangeText={setCalories} keyboardType="numeric" />
                <Text style={{ fontSize: 12, color: T.sub, marginBottom: 8, marginTop: -2 }}>Macros (optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Protein g" placeholderTextColor={T.sub} value={protein} onChangeText={setProtein} keyboardType="numeric" />
                  <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Carbs g" placeholderTextColor={T.sub} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
                  <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Fat g" placeholderTextColor={T.sub} value={fat} onChangeText={setFat} keyboardType="numeric" />
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={cancelBtnStyle} onPress={() => setAddModal(false)}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={confirmBtnStyle} onPress={handleAdd}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Add</Text></TouchableOpacity>
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
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 18 }}>Calorie Goals</Text>
                <Text style={{ fontSize: 14, color: T.text, fontWeight: '600', marginBottom: 8 }}>🏋️ Training day</Text>
                <TextInput style={inputStyle} placeholder="e.g. 2500" placeholderTextColor={T.sub} value={newTrainingGoal} onChangeText={setNewTrainingGoal} keyboardType="numeric" />
                <Text style={{ fontSize: 14, color: T.text, fontWeight: '600', marginBottom: 8 }}>💤 Rest day</Text>
                <TextInput style={inputStyle} placeholder="e.g. 2000" placeholderTextColor={T.sub} value={newRestGoal} onChangeText={setNewRestGoal} keyboardType="numeric" />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={cancelBtnStyle} onPress={() => setGoalModal(false)}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={confirmBtnStyle} onPress={handleSaveGoals}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
