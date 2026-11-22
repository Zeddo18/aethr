import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { idValid, nameValid, validNumber, validateFood, type RecipeIngredient } from "@/lib/food-library";

export async function GET() {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const [foods,recipes]=await Promise.all([
    db.from("saved_foods").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(150),
    db.from("saved_recipes").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(80),
  ]);
  if(foods.error||recipes.error) return NextResponse.json({error:"Food library is unavailable. Apply supabase/phase6.sql."},{status:500});
  return NextResponse.json({foods:foods.data,recipes:recipes.data});
}

export async function POST(request:Request) {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  let body:Record<string,unknown>;
  try {body=await request.json();} catch {return NextResponse.json({error:"Invalid request."},{status:400});}
  if(!body || typeof body!=="object") return NextResponse.json({error:"Invalid request."},{status:400});
  if(body.kind==="food"){
    const food=validateFood(body.food);
    if(!food) return NextResponse.json({error:"Enter a food name and complete nutrition per 100g. Missing values must not be entered as zero unless verified."},{status:400});
    const {data,error}=await db.from("saved_foods").insert({...food,user_id:user.id}).select("id").single();
    return error?NextResponse.json({error:"Could not save food."},{status:500}):NextResponse.json({id:data.id});
  }
  if(body.kind==="recipe"){
    if(!nameValid(body.name)||!Array.isArray(body.ingredients)||body.ingredients.length<1||body.ingredients.length>20)
      return NextResponse.json({error:"Enter a recipe name and 1–20 ingredients."},{status:400});
    const inputs: {id:string;grams:number}[]=[];
    for (const x of body.ingredients){
      if(!x || typeof x!=="object"||!idValid(x.id)||!validNumber(x.grams,10000,0.1))
        return NextResponse.json({error:"Select a saved food and measured gram amount for every ingredient."},{status:400});
      inputs.push({id:x.id,grams:x.grams});
    }
    const ids=Array.from(new Set(inputs.map(x=>x.id)));
    const {data:foods,error:lookupError}=await db.from("saved_foods").select("*").eq("user_id",user.id).in("id",ids);
    if(lookupError || foods?.length!==ids.length) return NextResponse.json({error:"Some foods are unavailable or not owned by you."},{status:400});
    const items:RecipeIngredient[]=inputs.map(x=>{
      const f=foods!.find(f=>f.id===x.id)!;
      return {name:f.name,food_id:f.id,grams:x.grams,calories_100g:Number(f.calories_100g),
        protein_100g:Number(f.protein_100g),carbs_100g:Number(f.carbs_100g),fat_100g:Number(f.fat_100g)};
    });
    const {data,error}=await db.from("saved_recipes").insert({user_id:user.id,name:body.name.trim(),ingredients:items}).select("id").single();
    return error?NextResponse.json({error:"Could not save recipe."},{status:500}):NextResponse.json({id:data.id});
  }
  return NextResponse.json({error:"Unsupported library action."},{status:400});
}

export async function DELETE(request:Request) {
  const db=await createClient();const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
  let body:Record<string,unknown>;
  try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  if(!body || !idValid(body.id) || (body.kind!=="food"&&body.kind!=="recipe"))
    return NextResponse.json({error:"Invalid item."},{status:400});
  const table=body.kind==="food"?"saved_foods":"saved_recipes";
  const {error}=await db.from(table).delete().eq("id",body.id).eq("user_id",user.id);
  return error?NextResponse.json({error:"Unable to delete."},{status:500}):NextResponse.json({ok:true});
}
