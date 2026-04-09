export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  sport_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
  daily_calorie_goal: number | null;
  daily_protein_g: number | null;
  training_level: string | null;
  dietary_restrictions: string[] | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  source: string;
  activity_type: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  elevation_gain_m: number | null;
  sweat_rate_ml_hr: number | null;
  raw_data: Json | null;
  started_at: string | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  workout_id: string | null;
  meal_type: string | null;
  description: string | null;
  source: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  magnesium_mg: number | null;
  logged_at: string | null;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  user_id: string;
  workout_id: string | null;
  trigger_type: string | null;
  recommendation: string;
  context_snapshot: Json;
  was_helpful: boolean | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: string;
  target_value: number | null;
  unit: string | null;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Relationships: [];
        Insert: {
          id?: string;
          auth_user_id: string;
          display_name?: string | null;
          sport_type?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          age?: number | null;
          sex?: string | null;
          daily_calorie_goal?: number | null;
          daily_protein_g?: number | null;
          training_level?: string | null;
          dietary_restrictions?: string[] | null;
          created_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      workouts: {
        Row: Workout;
        Relationships: [];
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          activity_type?: string | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          calories_burned?: number | null;
          avg_heart_rate?: number | null;
          elevation_gain_m?: number | null;
          sweat_rate_ml_hr?: number | null;
          raw_data?: Json | null;
          started_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Workout, "id" | "created_at">>;
      };
      food_logs: {
        Row: FoodLog;
        Relationships: [];
        Insert: {
          id?: string;
          user_id: string;
          workout_id?: string | null;
          meal_type?: string | null;
          description?: string | null;
          source: string;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          sodium_mg?: number | null;
          potassium_mg?: number | null;
          magnesium_mg?: number | null;
          logged_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<FoodLog, "id" | "created_at">>;
      };
      ai_recommendations: {
        Row: AiRecommendation;
        Relationships: [];
        Insert: {
          id?: string;
          user_id: string;
          workout_id?: string | null;
          trigger_type?: string | null;
          recommendation: string;
          context_snapshot?: Json;
          was_helpful?: boolean | null;
          created_at?: string;
        };
        Update: Partial<Omit<AiRecommendation, "id" | "created_at">>;
      };
      goals: {
        Row: Goal;
        Relationships: [];
        Insert: {
          id?: string;
          user_id: string;
          goal_type: string;
          target_value?: number | null;
          unit?: string | null;
          target_date?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<Goal, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
