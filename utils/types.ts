export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  timestamp: number;
  date: string;
}

export interface RecentFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: Exercise[];
}

export type DaySchedule = {
  [day: string]: string | null;
};

export interface LoggedSet {
  reps: string;
  weight: string;
}

export interface LoggedExercise {
  exerciseName: string;
  sets: LoggedSet[];
}

export interface JournalEntry {
  date: string;
  wentToGym: boolean;
  exercises: LoggedExercise[];
  notes: string;
}

export interface WeightEntry {
  date: string;
  weight: number; // kg
}

export interface CalorieGoals {
  training: number;
  rest: number;
}
