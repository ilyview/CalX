import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, SafeAreaView, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, FlatList,
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

const foodsData: { n: string; c: number; p: number; cb: number; f: number }[] = require('../../assets/foods_small.json');

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

function searchFoods(query: string) {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  const exact: typeof foodsData = [];
  const starts: typeof foodsData = [];
  const includes: typeof foodsData = [];
  for (const food of foodsData) {
    const n = food.n.toLowerCase();
    if (n === q) exact.push(food);
    else if (n.startsWith(q)) starts.push(food);
    else if (n.includes(q)) includes.push(food);
    if (exact.length + starts.length + includes.length >= 40) break;
  }
  return [...exact, ...starts, ...includes].slice(0, 20);
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
  const [modalTab, setModalTab] = useState<'search' | 'manual'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof foodsData>([]);
  const [selectedFood, setSelectedFood] = useState<typeof foodsData[0] | null>(null);
  const [servingSize, setServingSize] = useState('100');

  // Manual entry state
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [newTrainingGoal, setNewTrainingGoal] = useState('');
  const [newRestGoal, setNewRestGoal] = useState('');

  const currentDate = getDateStr(dateOffset);

  const loadData = useCallback(async () => {
    const g = await getCalorieGoals(); setGoalsState(g);
    const goal = await getGoalForDate(currentDate); setCalorieGoal(goal);
    const log = await getFoodLog(); setEntries(log[currentDate] || []);
    const recents = await getRecentFoods(); setRecentFoods(recents);
    const s = await getStreaks(); setStreaks(s);
  }, [currentDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const results = searchFoods(searchQuery);
    setSearchResults(results);
  }, [searchQuery]);

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
      setModalTab('manual');
      setFoodName(prefill.name); setCalories(prefill.calories.toString());
      setProtein(prefill.protein?.toString() || ''); setCarbs(prefill.carbs?.toString() || ''); setFat(prefill.fat?.toString() || '');
    } else {
      setModalTab('search');
      setSearchQuery(''); setSearchResults([]); setSelectedFood(null); setServingSize('100');
      setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    }
    setAddModal(true);
  };

  const closeAddModal = () => {
    setAddModal(false);
    setSearchQuery(''); setSearchResults([]); setSelectedFood(null); setServingSize('100');
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
  };

  const selectSearchResult = (food: typeof foodsData[0]) => {
    setSelectedFood(food);
    setServingSize('100');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  // Computed macros from selected food + serving size
  const serving = parseFloat(servingSize) || 100;
  const ratio = serving / 100;
  const computedCal = selectedFood ? Math.round(selectedFood.c * ratio) : 0;
  const computedP = selectedFood ? Math.round(selectedFood.p * ratio * 10) / 10 : 0;
  const computedCb = selectedFood ? Math.round(selectedFood.cb * ratio * 10) / 10 : 0;
  const computedF = selectedFood ? Math.round(selectedFood.f * ratio * 10) / 10 : 0;

  const handleAddFromSearch = async () => {
    if (!selectedFood) { Alert.alert('Select a food first'); return; }
    if (!servingSize || parseFloat(servingSize) <= 0) { Alert.alert('Enter a valid serving size'); return; }
    const entry: FoodEntry = {
      id: Date.now().toString(),
      name: `${selectedFood.n} (${serving}g)`,
      calories: computedCal,
      protein: computedP,
      carbs: computedCb,
      fat: computedF,
      timestamp: Date.now(),
      date: currentDate,
    };
    await addFoodEntry(entry);
    closeAddModal();
    loadData();
  };

  const handleAddManual = async () => {
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
    closeAddModal();
    loadData();
  };

  const handleDelete = async (id: string) => { await removeFoodEntry(currentDate, id); loadData(); };

  const handleSaveGoals = async () => {
    const t = parseInt(newTrainingGoal); const r = parseInt(newRestGoal);
    if (isNaN(t) || t < 100 || isNaN(r) || r < 100) { Alert.alert('Invalid', 'Enter valid goals (min 100 kcal each).'); return; }
    const newGoals = { training: t, rest: r };
    await setCalorieGoals(newGoals); setGoalsState(newGoals); setGoalModal(false); loadData();
  };

  const inputStyle = { backgroundColor: T.inputBg, borderRadius: T.radius, padding: 14, color: T.text, fontSize: 15, marginBottom: 10, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const confirmBtnStyle = { flex: 1, backgroundColor: T.accent, borderRadius: T.radius, padding: 15, alignItems: 'center' as const };
  const cancelBtnStyle = { flex: 1, backgroundColor: T.inputBg, borderRadius: T.radius, padding: 15, alignItems: 'center' as const, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) };
  const modalCardStyle = { backgroundColor: T.modalBg, borderTopLeftRadius: T.name === 'minecraft' ? 4 : 26, borderTopRightRadius: T.name === 'minecraft' ? 4 : 26, padding: 24, paddingBottom: 44, ...(T.cardBorder ? { borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: T.cardBorder } : {}) };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
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
        style={{ position: 'absolute', bottom: 26, right: 22, backgroundColor: T.accent, width: 58, height: 58, borderRadius: T.name === 'minecraft' ? 4 : 29, alignItems: 'center', justifyContent: 'center', shadowColor: T.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 10 }}
        onPress={() => openAddModal()} activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={T.accentText} />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <Modal visible={addModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
              <View style={[modalCardStyle, { maxHeight: '90%' }]}>
                {/* Modal header */}
                <Text style={{ fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 16 }}>
                  {T.name === 'minecraft' ? '🌾 Log Food' : 'Log Food'}
                </Text>

                {/* Tab switcher */}
                <View style={{ flexDirection: 'row', backgroundColor: T.inputBg, borderRadius: T.radius, padding: 3, marginBottom: 16, ...(T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}) }}>
                  {(['search', 'manual'] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[{ flex: 1, paddingVertical: 9, borderRadius: T.radius - 2, alignItems: 'center' }, modalTab === tab ? { backgroundColor: T.accent } : {}]}
                      onPress={() => setModalTab(tab)}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 13, color: modalTab === tab ? T.accentText : T.sub }}>
                        {tab === 'search' ? '🔍 Search' : '✏️ Manual'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Search tab */}
                {modalTab === 'search' && (
                  <View>
                    <TextInput
                      style={[inputStyle, { marginBottom: searchResults.length > 0 ? 0 : 10 }]}
                      placeholder="Search food database…"
                      placeholderTextColor={T.sub}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus={modalTab === 'search'}
                    />

                    {/* Search results */}
                    {searchResults.length > 0 && !selectedFood && (
                      <View style={{ maxHeight: 200, marginBottom: 10 }}>
                        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                          {searchResults.map((food, i) => (
                            <TouchableOpacity
                              key={i}
                              style={[{ padding: 12, borderBottomWidth: 1, borderBottomColor: T.progressBg }, i === 0 ? { borderTopWidth: 1, borderTopColor: T.progressBg } : {}]}
                              onPress={() => selectSearchResult(food)}
                            >
                              <Text style={{ color: T.text, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>{food.n}</Text>
                              <Text style={{ color: T.sub, fontSize: 11, marginTop: 2 }}>
                                {food.c} kcal · P {food.p}g · C {food.cb}g · F {food.f}g per 100g
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Selected food + serving size */}
                    {selectedFood && (
                      <View>
                        <View style={[{ backgroundColor: T.accent + '18', borderRadius: T.radius, padding: 12, marginBottom: 12 }, T.cardBorder ? { borderWidth: 1, borderColor: T.accent } : {}]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: T.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>{selectedFood.n}</Text>
                            <TouchableOpacity onPress={() => { setSelectedFood(null); setSearchQuery(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="close-circle" size={18} color={T.sub} />
                            </TouchableOpacity>
                          </View>
                          <Text style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>per 100g: {selectedFood.c} kcal · P {selectedFood.p}g · C {selectedFood.cb}g · F {selectedFood.f}g</Text>
                        </View>

                        <Text style={{ color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Serving size (g)</Text>
                        <TextInput
                          style={inputStyle}
                          placeholder="100"
                          placeholderTextColor={T.sub}
                          value={servingSize}
                          onChangeText={setServingSize}
                          keyboardType="numeric"
                        />

                        {/* Computed macros preview */}
                        <View style={[{ backgroundColor: T.inputBg, borderRadius: T.radius, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-around' }, T.cardBorder ? { borderWidth: 1, borderColor: T.cardBorder } : {}]}>
                          {[['Kcal', computedCal, T.accent], ['Protein', computedP + 'g', T.protein], ['Carbs', computedCb + 'g', T.carbs], ['Fat', computedF + 'g', T.fat]].map(([label, val, color]) => (
                            <View key={label as string} style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: color as string }}>{val}</Text>
                              <Text style={{ fontSize: 10, color: T.sub, marginTop: 2 }}>{label}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity style={cancelBtnStyle} onPress={closeAddModal}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                          <TouchableOpacity style={confirmBtnStyle} onPress={handleAddFromSearch}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Add</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {!selectedFood && searchQuery.length < 2 && (
                      <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                        <Ionicons name="search" size={32} color={T.sub} />
                        <Text style={{ color: T.sub, fontSize: 13 }}>Type to search {foodsData.length.toLocaleString()} foods</Text>
                      </View>
                    )}

                    {!selectedFood && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                        <Text style={{ color: T.sub, fontSize: 13 }}>No results — try Manual entry</Text>
                      </View>
                    )}

                    {!selectedFood && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                        <TouchableOpacity style={cancelBtnStyle} onPress={closeAddModal}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Manual tab */}
                {modalTab === 'manual' && (
                  <View>
                    <TextInput style={inputStyle} placeholder="Food name *" placeholderTextColor={T.sub} value={foodName} onChangeText={setFoodName} />
                    <TextInput style={inputStyle} placeholder="Calories (kcal) *" placeholderTextColor={T.sub} value={calories} onChangeText={setCalories} keyboardType="numeric" />
                    <Text style={{ fontSize: 12, color: T.sub, marginBottom: 8, marginTop: -2 }}>Macros (optional)</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Protein g" placeholderTextColor={T.sub} value={protein} onChangeText={setProtein} keyboardType="numeric" />
                      <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Carbs g" placeholderTextColor={T.sub} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
                      <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Fat g" placeholderTextColor={T.sub} value={fat} onChangeText={setFat} keyboardType="numeric" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                      <TouchableOpacity style={cancelBtnStyle} onPress={closeAddModal}><Text style={{ color: T.sub, fontWeight: '600', fontSize: 15 }}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={confirmBtnStyle} onPress={handleAddManual}><Text style={{ color: T.accentText, fontWeight: '700', fontSize: 15 }}>Add</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
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
              <View style={modalCardStyle}>
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
