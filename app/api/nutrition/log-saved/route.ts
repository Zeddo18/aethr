import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { idValid, totalNutrition, portion, validNumber, type RecipeIngredient } from "@/lib/food-library";
import { isDate, todayStr } from "@/lib/dates";
const meals=["breakfast","lunch","dinner","snack"];
export async function POST(request:Request) {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  let body:Record<string,unknown>;
  try {body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  if(!body || !idValid(body.id) || (body.kind!=="food"&&body.kind!=="recipe") ||
    !validNumber(body.grams,10000,0.1) || !meals.includes(String(body.meal)) ||
    (body.date!==undefined && (typeof body.date!=="string" || !isDate(body.date))))
    return NextResponse.json({error:"Check portion, meal, and date."},{status:400});
  const date=typeof body.date==="string"?body.date:todayStr();
  const table=body.kind==="food"?"saved_foods":"saved_recipes";
  const {data,error:readError}=await db.from(table).select("*").eq("id",body.id).eq("user_id",user.id).maybeSingle();
  if(readError||!data) return NextResponse.json({error:"Saved food or recipe unavailable."},{status:404});
  let total:{grams:number;calories:number;protein:number;carbs:number;fat:number};
  if(body.kind==="food"){
    total={grams:100,calories:Number(data.calories_100g),protein:Number(data.protein_100g),
      carbs:Number(data.carbs_100g),fat:Number(data.fat_100g)};
  } else {
    const ingredients=data.ingredients as RecipeIngredient[];
    if(!Array.isArray(ingredients)||!ingredients.length||ingredients.length>20 ||
      ingredients.some(x=>!validNumber(x.grams,10000,0.1) ||
        ![x.calories_100g,x.protein_100g,x.carbs_100g,x.fat_100g].every(n=>validNumber(n,9999))))
      return NextResponse.json({error:"Recipe ingredients are invalid."},{status:400});
    total=totalNutrition(ingredients);
  }
  if(total.grams<=0)return NextResponse.json({error:"Recipe has no measured weight."},{status:400});
  const scaled=portion(total,body.grams,total.grams);
  if(scaled.calories>=10000 || [scaled.protein,scaled.carbs,scaled.fat].some(x=>x>999))
    return NextResponse.json({error:"Portion exceeds nutrition entry limits."},{status:400});
  const {error}=await db.from("meal_entries").insert({
    user_id:user.id,eaten_on:date,meal:body.meal,name:data.name,
    amount_g:body.grams,calories:scaled.calories,
    protein_g:scaled.protein,carbs_g:scaled.carbs,fat_g:scaled.fat,
  });
  return error?NextResponse.json({error:"Could not save meal. Ensure Phase 2 schema is installed."},{status:500})
    :NextResponse.json({ok:true});
}
