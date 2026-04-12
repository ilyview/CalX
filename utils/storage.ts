import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEntry, WorkoutPlan, DaySchedule, RecentFood, JournalEntry, WeightEntry, CalorieGoals } from './types';

const KEYS = {
  CALORIE_GOALS: 'calorie_goals',
  FOOD_LOG: 'food_log',
  WORKOUT_PLANS: 'workout_plans',
  SCHEDULE: 'schedule',
  RECENT_FOODS: 'recent_foods',
  JOURNAL: 'journal',
  WEIGHT_LOG: 'weight_log',
  REST_TIMER: 'rest_timer_duration',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayKey(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return DAYS[idx];
}

function getDateStr(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// ── Calorie goals ─────────────────────────────────────────────────
export async function getCalorieGoals(): Promise<CalorieGoals> {
  const val = await AsyncStorage.getItem(KEYS.CALORIE_GOALS);
  return val ? JSON.parse(val) : { training: 2500, rest: 2000 };
}
export async function setCalorieGoals(goals: CalorieGoals): Promise<void> {
  await AsyncStorage.setItem(KEYS.CALORIE_GOALS, JSON.stringify(goals));
}

// Helper: get the right goal for a specific date
export async function getGoalForDate(date: string): Promise<number> {
  const goals = await getCalorieGoals();
  const schedule = await getSchedule();
  const dayKey = getDayKey(date);
  const hasWorkout = !!schedule[dayKey];
  return hasWorkout ? goals.training : goals.rest;
}

// ── Food log ──────────────────────────────────────────────────────
export async function getFoodLog(): Promise<{ [date: string]: FoodEntry[] }> {
  const val = await AsyncStorage.getItem(KEYS.FOOD_LOG);
  return val ? JSON.parse(val) : {};
}
export async function addFoodEntry(entry: FoodEntry): Promise<void> {
  const log = await getFoodLog();
  if (!log[entry.date]) log[entry.date] = [];
  log[entry.date].push(entry);
  await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(log));
  await addRecentFood({ name: entry.name, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
}
export async function removeFoodEntry(date: string, id: string): Promise<void> {
  const log = await getFoodLog();
  if (log[date]) {
    log[date] = log[date].filter((e) => e.id !== id);
    await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(log));
  }
}

// ── Recent foods ──────────────────────────────────────────────────
export async function getRecentFoods(): Promise<RecentFood[]> {
  const val = await AsyncStorage.getItem(KEYS.RECENT_FOODS);
  return val ? JSON.parse(val) : [];
}
export async function addRecentFood(food: RecentFood): Promise<void> {
  const recents = await getRecentFoods();
  const filtered = recents.filter((r) => r.name.toLowerCase() !== food.name.toLowerCase());
  const updated = [food, ...filtered].slice(0, 12);
  await AsyncStorage.setItem(KEYS.RECENT_FOODS, JSON.stringify(updated));
}

// ── Workout plans ─────────────────────────────────────────────────
export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  const val = await AsyncStorage.getItem(KEYS.WORKOUT_PLANS);
  return val ? JSON.parse(val) : [];
}
export async function saveWorkoutPlans(plans: WorkoutPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.WORKOUT_PLANS, JSON.stringify(plans));
}

// ── Schedule ──────────────────────────────────────────────────────
export async function getSchedule(): Promise<DaySchedule> {
  const val = await AsyncStorage.getItem(KEYS.SCHEDULE);
  return val ? JSON.parse(val) : {};
}
export async function saveSchedule(schedule: DaySchedule): Promise<void> {
  await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
}

// ── Journal ───────────────────────────────────────────────────────
export async function getJournal(): Promise<{ [date: string]: JournalEntry }> {
  const val = await AsyncStorage.getItem(KEYS.JOURNAL);
  return val ? JSON.parse(val) : {};
}
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const journal = await getJournal();
  journal[entry.date] = entry;
  await AsyncStorage.setItem(KEYS.JOURNAL, JSON.stringify(journal));
}

// ── Weight log ────────────────────────────────────────────────────
export async function getWeightLog(): Promise<WeightEntry[]> {
  const val = await AsyncStorage.getItem(KEYS.WEIGHT_LOG);
  return val ? JSON.parse(val) : [];
}
export async function addWeightEntry(entry: WeightEntry): Promise<void> {
  const log = await getWeightLog();
  const filtered = log.filter((e) => e.date !== entry.date);
  const updated = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify(updated));
}

// ── Streaks ───────────────────────────────────────────────────────
export async function getStreaks(): Promise<{ calorie: number; training: number }> {
  const foodLog = await getFoodLog();
  const journal = await getJournal();
  const goals = await getCalorieGoals();
  const schedule = await getSchedule();

  let calorieStreak = 0;
  let trainingStreak = 0;
  let offset = 0;

  // Calorie streak: consecutive days hitting goal
  while (true) {
    const date = getDateStr(-offset);
    const dayEntries = foodLog[date] || [];
    if (dayEntries.length === 0 && offset > 0) break;
    const total = dayEntries.reduce((s, e) => s + e.calories, 0);
    const dayKey = getDayKey(date);
    const hasWorkout = !!schedule[dayKey];
    const goal = hasWorkout ? goals.training : goals.rest;
    if (total > 0 && total <= goal) { calorieStreak++; offset++; }
    else break;
  }

  // Training streak: consecutive weeks with enough training days
  offset = 0;
  while (true) {
    const date = getDateStr(-offset);
    const entry = journal[date];
    if (!entry && offset > 0) break;
    if (entry?.wentToGym) { trainingStreak++; offset++; }
    else if (offset === 0) { offset++; } // skip today if not yet logged
    else break;
  }

  return { calorie: calorieStreak, training: trainingStreak };
}

// ── Rest timer setting ───────────────────────────────────────────
export async function getRestTimerDuration(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.REST_TIMER);
  return val ? parseInt(val) : 90;
}
export async function setRestTimerDuration(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.REST_TIMER, seconds.toString());
}

// ── Nutrition history ─────────────────────────────────────────────
export async function getNutritionHistory(days: number): Promise<{
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}[]> {
  const log = await getFoodLog();
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    const entries = log[date] || [];
    results.push({
      date,
      calories: entries.reduce((s, e) => s + e.calories, 0),
      protein: entries.reduce((s, e) => s + (e.protein || 0), 0),
      carbs: entries.reduce((s, e) => s + (e.carbs || 0), 0),
      fat: entries.reduce((s, e) => s + (e.fat || 0), 0),
    });
  }
  return results;
}

// ── Volume history for an exercise ───────────────────────────────
export async function getVolumeHistory(exerciseName: string): Promise<{ date: string; volume: number }[]> {
  const journal = await getJournal();
  const results: { date: string; volume: number }[] = [];

  for (const [date, entry] of Object.entries(journal)) {
    if (!entry.wentToGym) continue;
    const ex = entry.exercises.find((e) => e.exerciseName.toLowerCase() === exerciseName.toLowerCase());
    if (!ex) continue;
    let vol = 0;
    for (const set of ex.sets) {
      const reps = parseFloat(set.reps);
      const weight = parseFloat(set.weight);
      if (!isNaN(reps) && !isNaN(weight)) vol += reps * weight;
    }
    if (vol > 0) results.push({ date, volume: vol });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
}
