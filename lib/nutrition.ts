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
const SEX_OFFSET: Record<string, number> = { male: 5, female: -161 };

/**
 * Optional adult maintenance estimate, not a prescription.
 * Do not calculate targets for minors or automatically create calorie deficits/surpluses.
 * People with other needs should use individualized professional guidance.
 */
export function calculateTargets(p: TargetInput, now = new Date()): Targets | null {
  if (!p.sex || !p.birth_date || !p.height_cm || !p.weight_kg || !p.activity_level || p.goal !== "maintain") return null;
  if (!(p.sex in SEX_OFFSET) || !(p.activity_level in ACTIVITY)) return null;
  const birth = new Date(p.birth_date);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  if (age < 18 || age > 100) return null;

  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * age + SEX_OFFSET[p.sex];
  const calories = Math.round(bmr * ACTIVITY[p.activity_level]);
  const protein_g = Math.round(1.2 * p.weight_kg);
  const fat_g = Math.round((calories * 0.3) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { calories, protein_g, carbs_g, fat_g };
}
