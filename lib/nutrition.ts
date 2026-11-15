export type TargetInput = {
  sex: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
};

export type Targets = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

const ACTIVITY: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
const GOAL: Record<string, number> = { lose: 0.8, maintain: 1, gain: 1.1 };
const SEX_OFFSET: Record<string, number> = { male: 5, female: -161, other: -78 };

/** Mifflin-St Jeor estimate. Returns null until the profile has enough data. */
export function calculateTargets(p: TargetInput, now = new Date()): Targets | null {
  if (!p.sex || !p.birth_date || !p.height_cm || !p.weight_kg || !p.activity_level || !p.goal) return null;
  const birth = new Date(p.birth_date);
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  if (age < 15 || age > 100) return null;

  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * age + SEX_OFFSET[p.sex];
  const calories = Math.max(1200, Math.round(bmr * ACTIVITY[p.activity_level] * GOAL[p.goal]));
  const protein_g = Math.round(1.8 * p.weight_kg);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { calories, protein_g, carbs_g, fat_g };
}
