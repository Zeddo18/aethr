import { DEFAULT_TIME_ZONE, shiftDate, todayStr } from "./dates";

export type MealRow = { eaten_on: string; meal: string; name: string };
export type WorkoutRow = { id: string; started_at: string; finished_at: string | null };
export type MovementRow = { id: string; started_at: string; activity_type: string; duration_seconds: number; distance_km: number };
export type DailyProgress = { date: string; meals: number; workouts: number; activities: number; movementMinutes: number };
export type ProgressSummary = {
  days: DailyProgress[];
  mealDays: number;
  loggedMeals: number;
  variety: number;
  completedWorkouts: number;
  activitySessions: number;
  movementMinutes: number;
  movementKm: number;
  activeDays: number;
};

export function dateInZone(value: string, zone = DEFAULT_TIME_ZONE): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : todayStr(date, zone);
}

export function progressDates(endDate: string, count = 28): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 365) throw new Error("Invalid date range");
  return Array.from({ length: count }, (_, i) => shiftDate(endDate, i - count + 1));
}

export function summarizeProgress(
  dates: string[],
  meals: MealRow[],
  workouts: WorkoutRow[],
  movement: MovementRow[],
  zone = DEFAULT_TIME_ZONE
): ProgressSummary {
  const dayMap = new Map(dates.map(date => [date, { date, meals: 0, workouts: 0, activities: 0, movementMinutes: 0 }]));
  const uniqueFoods = new Set<string>();
  const dedupeWorkouts = new Set<string>();
  const dedupeActivities = new Set<string>();
  let loggedMeals = 0, completedWorkouts = 0, movementMinutes = 0, movementKm = 0, activitySessions = 0;

  for (const meal of meals) {
    const day = dayMap.get(meal.eaten_on);
    if (!day) continue;
    day.meals++;
    loggedMeals++;
    const name = meal.name.trim().toLocaleLowerCase();
    if (name) uniqueFoods.add(name);
  }

  for (const workout of workouts) {
    if (!workout.finished_at || dedupeWorkouts.has(workout.id)) continue;
    const day = dateInZone(workout.started_at, zone);
    if (!day) continue;
    const bucket = dayMap.get(day);
    if (!bucket) continue;
    dedupeWorkouts.add(workout.id);
    bucket.workouts++;
    completedWorkouts++;
  }

  for (const session of movement) {
    if (dedupeActivities.has(session.id)) continue;
    const day = dateInZone(session.started_at, zone);
    if (!day) continue;
    const bucket = dayMap.get(day);
    if (!bucket) continue;
    const seconds = Number(session.duration_seconds);
    const kilometers = Number(session.distance_km);
    if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(kilometers) || kilometers < 0) continue;
    dedupeActivities.add(session.id);
    bucket.activities++;
    bucket.movementMinutes += seconds / 60;
    movementMinutes += seconds / 60;
    movementKm += kilometers;
    activitySessions++;
  }

  const days = Array.from(dayMap.values()).map(row => ({ ...row, movementMinutes: Math.round(row.movementMinutes) }));
  return {
    days,
    mealDays: days.filter(d => d.meals > 0).length,
    loggedMeals,
    variety: uniqueFoods.size,
    completedWorkouts,
    activitySessions,
    movementMinutes: Math.round(movementMinutes),
    movementKm: Math.round(movementKm * 10) / 10,
    activeDays: days.filter(d => d.workouts > 0 || d.activities > 0).length,
  };
}
