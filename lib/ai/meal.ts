export type ParsedFood = { name: string; grams: number | null };
export type ParsedMeal = {
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
  time: string | null;
  foods: ParsedFood[];
};

export type NutritionCandidate = {
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: string;
  basis: "per 100 g";
};

const mealKinds = new Set(["breakfast", "lunch", "dinner", "snack"]);
const nutrient = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" || typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function validateParsedMeal(value: unknown): ParsedMeal {
  if (!value || typeof value !== "object") throw new Error("Invalid AI response.");
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.foods) || raw.foods.length > 10) throw new Error("Invalid food list.");
  const foods = raw.foods.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid ingredient.");
    const f = item as Record<string, unknown>;
    const name = typeof f.name === "string" ? f.name.trim().slice(0, 120) : "";
    const grams = f.grams === null ? null : nutrient(f.grams);
    if (!name || grams === null && f.grams !== null || grams !== null && (grams <= 0 || grams > 10000))
      throw new Error("Invalid ingredient quantity.");
    return { name, grams };
  });
  if (!foods.length) throw new Error("No ingredients identified.");
  const meal = typeof raw.meal === "string" && mealKinds.has(raw.meal) ? raw.meal as ParsedMeal["meal"] : null;
  const time = typeof raw.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time) ? raw.time : null;
  return { meal, time, foods };
}

export async function searchNutrition(name: string): Promise<NutritionCandidate[]> {
  const url = "https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=5" +
    "&fields=product_name,brands,nutriments&search_terms=" + encodeURIComponent(name);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AETHR/0.1 (personal food logging; contact via GitHub)" },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      products?: { product_name?: string; brands?: string; nutriments?: Record<string, unknown> }[];
    };
    return (data.products ?? []).flatMap((p) => {
      const kcal = nutrient(p.nutriments?.["energy-kcal_100g"]);
      if (!p.product_name?.trim() || kcal === null) return [];
      const brand = p.brands?.split(",")[0]?.trim();
      return [{
        name: (brand ? `${p.product_name} (${brand})` : p.product_name).slice(0, 120),
        kcal,
        protein: nutrient(p.nutriments?.["proteins_100g"]),
        carbs: nutrient(p.nutriments?.["carbohydrates_100g"]),
        fat: nutrient(p.nutriments?.["fat_100g"]),
        source: "Open Food Facts",
        basis: "per 100 g" as const,
      }];
    });
  } catch { return []; }
}
