import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Product = { product_name?: string; brands?: string; nutriments?: Record<string, unknown> };

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return NextResponse.json({ results: [] });

  try {
    const url =
      "https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10" +
      `&fields=product_name,brands,nutriments&search_terms=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AETHR/0.1 (personal project)" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { products?: Product[] };

    const results = (data.products ?? [])
      .map((p) => {
        const n = p.nutriments ?? {};
        const brand = p.brands?.split(",")[0]?.trim();
        return {
          name: p.product_name ? (brand ? `${p.product_name} (${brand})` : p.product_name) : "",
          kcal: Number(n["energy-kcal_100g"]),
          protein: Number(n["proteins_100g"] ?? 0),
          carbs: Number(n["carbohydrates_100g"] ?? 0),
          fat: Number(n["fat_100g"] ?? 0),
        };
      })
      .filter((r) => r.name && Number.isFinite(r.kcal));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Food search is unavailable. Enter the food manually." });
  }
}
