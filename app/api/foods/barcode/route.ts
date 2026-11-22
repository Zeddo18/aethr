import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { barcodeValid } from "@/lib/food-library";

type Product = { product_name?: string; brands?: string; nutriments?: Record<string,unknown> };
const n = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
};
export async function GET(request: Request) {
  const db=await createClient();
  const { data: { user } }=await db.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const code=new URL(request.url).searchParams.get("code") || "";
  if(!barcodeValid(code)) return NextResponse.json({error:"Enter an 8–14 digit barcode."},{status:400});
  try {
    const response=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments`,{
      headers:{"User-Agent":"AETHR/0.1 (personal nutrition tracker)"},signal:AbortSignal.timeout(8000),
    });
    if(!response.ok) throw new Error("Lookup failed");
    const data=await response.json() as { status?:number; product?:Product };
    if(data.status!==1 || !data.product?.product_name) return NextResponse.json({result:null});
    const p=data.product, nut=p.nutriments || {};
    return NextResponse.json({result:{
      name:[p.product_name,p.brands?.split(",")[0]].filter(Boolean).join(" · ").slice(0,120),
      barcode:code, source:"Open Food Facts",
      calories_100g:n(nut["energy-kcal_100g"]), protein_100g:n(nut["proteins_100g"]),
      carbs_100g:n(nut["carbohydrates_100g"]), fat_100g:n(nut["fat_100g"]),
    }});
  } catch {return NextResponse.json({error:"Barcode lookup unavailable. You can enter the food manually."},{status:502});}
}
