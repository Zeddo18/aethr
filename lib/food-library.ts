export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };
export type SavedFood = { id: string; name: string; source: string; barcode: string | null; calories_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number };
export type RecipeIngredient = { name: string; grams: number; food_id: string; calories_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number };
export const idValid = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
export const nameValid = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0 && x.trim().length <= 120;
export function validNumber(x: unknown, max: number, min = 0): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
}
export const barcodeValid = (x: string) => /^[0-9]{8,14}$/.test(x);
export function validateFood(raw: unknown): { name: string; source: string; barcode: string | null; calories_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string,unknown>;
  if (!nameValid(r.name) || !validNumber(r.calories_100g,9999) || !validNumber(r.protein_100g,999) ||
      !validNumber(r.carbs_100g,999) || !validNumber(r.fat_100g,999)) return null;
  if (r.barcode !== null && r.barcode !== undefined && (typeof r.barcode !== "string" || !barcodeValid(r.barcode))) return null;
  return { name:r.name.trim(), source: typeof r.source === "string" && r.source.length <= 120 && r.source.length ? r.source : "user-entered",
    barcode: typeof r.barcode === "string" ? r.barcode : null,
    calories_100g:r.calories_100g, protein_100g:r.protein_100g, carbs_100g:r.carbs_100g, fat_100g:r.fat_100g };
}
export function totalNutrition(ingredients: RecipeIngredient[]): Nutrients & { grams: number } {
  return ingredients.reduce((a,x) => ({
    grams:a.grams+x.grams,
    calories:a.calories+x.calories_100g*x.grams/100,
    protein:a.protein+x.protein_100g*x.grams/100,
    carbs:a.carbs+x.carbs_100g*x.grams/100,
    fat:a.fat+x.fat_100g*x.grams/100,
  }),{ grams:0,calories:0,protein:0,carbs:0,fat:0 });
}
export function portion(n: Nutrients, grams: number, baseGrams: number): Nutrients {
  if (!validNumber(grams,10000,0.1) || !validNumber(baseGrams,200000,0.1)) throw new Error("Invalid portion.");
  const ratio=grams/baseGrams;
  const round=(x:number)=>Math.round(x*10)/10;
  return { calories:round(n.calories*ratio), protein:round(n.protein*ratio), carbs:round(n.carbs*ratio), fat:round(n.fat*ratio) };
}
