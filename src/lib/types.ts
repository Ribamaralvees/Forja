export type Sex = "M" | "F";
export type Biotype = "ecto" | "meso" | "endo";
export type Goal = "cutting" | "manutencao" | "hipertrofia";
export type Experience = "iniciante" | "intermediario" | "avancado";
export type Activity = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";

export interface Profile {
  id: string;
  name: string | null;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  biotype: Biotype | null;
  goal: Goal | null;
  experience: Experience | null;
  activity: Activity | null;
  days_per_week: number;
  restrictions: string;
}

export interface MealTime {
  label: string;
  time: string;
}

export interface Routine {
  user_id: string;
  works: boolean;
  work_start: string | null;
  work_end: string | null;
  work_days: number[];
  wake_time: string;
  sleep_time: string;
  training_time: string;
  training_duration: number;
  meal_times: MealTime[];
  notes: string;
}

export interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  target_load: number | null;
  position: number;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  focus: string;
  position: number;
  exercises?: Exercise[];
}

export interface Session {
  id: string;
  workout_name: string;
  date: string;
  duration_sec: number;
  sets_done: number;
  total_volume: number;
}

export interface WeightLog {
  id: string;
  date: string;
  weight_kg: number;
}

export interface MealItem {
  id?: string;
  food: string;
  grams: number;
  measure: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  position: number;
}

export interface Recipe {
  id?: string;
  meal_id: string;
  emoji: string;
  title: string;
  prep_time: string;
  difficulty: string;
  portions: string;
  ingredients: string[];
  steps: string[];
  tip: string;
  video_id: string | null;
  video_title: string | null;
  video_url: string | null;
}

export interface Meal {
  id: string;
  diet_id: string;
  name: string;
  time: string;
  position: number;
  done: boolean;
  meal_items: MealItem[];
  recipes: Recipe[];
}

export interface Diet {
  id: string;
  generated_at: string;
  target_kcal: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  tips: string[];
  is_active: boolean;
  meals: Meal[];
}

export interface CoachMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}
