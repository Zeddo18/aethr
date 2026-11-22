"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Camera, BookOpen, Plus, Trash2 } from "lucide-react";
import { totalNutrition, type RecipeIngredient } from "@/lib/food-library";

type Food = { id:string; name:string; source:string; barcode:string|null;
  calories_100g:number;protein_100g:number;carbs_100g:number;fat_100g:number };
type Recipe = { id:string;name:string;ingredients:RecipeIngredient[] };
type FoodForm = { name:string;source:string;barcode:string;
  calories_100g:string;protein_100g:string;carbs_100g:string;fat_100g:string };
const empty:FoodForm={name:"",source:"user-entered",barcode:"",
  calories_100g:"",protein_100g:"",carbs_100g:"",fat_100g:""};
const keys=["calories_100g","protein_100g","carbs_100g","fat_100g"] as const;
const round=(n:number)=>Math.round(n*10)/10;

async function jsonRequest(url:string,method:string,body?:unknown){
  const res=await fetch(url,{method,headers:{"Content-Type":"application/json"},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Request failed.");
  return data;
}
export function NutritionLibrary({date}:{date:string}){
  const router=useRouter();
  const [foods,setFoods]=useState<Food[]>([]);
  const [recipes,setRecipes]=useState<Recipe[]>([]);
  const [form,setForm]=useState<FoodForm>(empty);
  const [barcode,setBarcode]=useState("");
  const [recipeName,setRecipeName]=useState("");
  const [parts,setParts]=useState<{id:string;grams:string}[]>([{id:"",grams:""}]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [meal,setMeal]=useState("lunch");
  const [portionG,setPortionG]=useState("100");
  const [selected,setSelected]=useState("");
  const [scan,setScan]=useState(false);
  const camera=useRef<HTMLVideoElement>(null);
  const stream=useRef<MediaStream|null>(null);

  async function refresh(){
    const data=await jsonRequest("/api/nutrition/library","GET");
    setFoods(data.foods||[]);setRecipes(data.recipes||[]);
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);

  async function action(task:()=>Promise<void>){
    setBusy(true);setError("");setMessage("");
    try{await task();}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}
    finally{setBusy(false);}
  }
  function update(key:keyof FoodForm,value:string){setForm(prev=>({...prev,[key]:value}));}

  function lookup(){
    return action(async()=>{
      const res=await jsonRequest("/api/foods/barcode?code="+encodeURIComponent(barcode.trim()),"GET");
      if(!res.result){setMessage("No matching product. Enter nutrition from the label manually.");return;}
      const p=res.result as Record<string,unknown>;
      setForm({
        name:String(p.name||""),source:"Open Food Facts",barcode:String(p.barcode||""),
        calories_100g:p.calories_100g==null?"":String(p.calories_100g),
        protein_100g:p.protein_100g==null?"":String(p.protein_100g),
        carbs_100g:p.carbs_100g==null?"":String(p.carbs_100g),
        fat_100g:p.fat_100g==null?"":String(p.fat_100g),
      });
      setMessage("Review the exact product, serving basis, and all values before saving. Empty nutrients need verification.");
    });
  }
  async function saveFood(){
    await action(async()=>{
      if(!form.name.trim() || keys.some(k=>form[k].trim()===""))throw new Error("Enter the food name and every nutrition value. Do not interpret missing values as zero.");
      const food=Object.fromEntries(keys.map(k=>[k,Number(form[k])]));
      await jsonRequest("/api/nutrition/library","POST",{kind:"food",food:{
        ...food,name:form.name,source:form.source,barcode:form.barcode||null,
      }});
      setForm(empty);setBarcode("");await refresh();setMessage("Food saved privately.");
    });
  }
  async function saveRecipe(){
    await action(async()=>{
      if(!recipeName.trim() || parts.some(p=>!p.id||!p.grams||Number(p.grams)<=0))throw new Error("Select each ingredient and enter its weight in grams.");
      await jsonRequest("/api/nutrition/library","POST",{kind:"recipe",name:recipeName,
        ingredients:parts.map(p=>({id:p.id,grams:Number(p.grams)}))});
      setRecipeName("");setParts([{id:"",grams:""}]);await refresh();setMessage("Recipe saved.");
    });
  }
  async function saveLog(){
    await action(async()=>{
      const [kind,id]=selected.split(":");
      if(!kind||!id)throw new Error("Choose a food or recipe.");
      await jsonRequest("/api/nutrition/log-saved","POST",{
        kind,id,grams:Number(portionG),date,meal,
      });
      router.refresh();setMessage("Meal added to your food diary.");
    });
  }
  async function remove(kind:"food"|"recipe",id:string){
    if(!window.confirm("Delete this saved item? Existing meal logs will remain."))return;
    await action(async()=>{
      await jsonRequest("/api/nutrition/library","DELETE",{kind,id});
      if(selected===kind+":"+id)setSelected("");
      await refresh();setMessage("Saved item deleted.");
    });
  }

  useEffect(()=>{
    if(!scan)return;
    let closed=false;let frame=0;let detector:{detect:(element:HTMLVideoElement)=>Promise<{rawValue:string}[]>}|null=null;
    const API=(window as unknown as {BarcodeDetector?:new(options:{formats:string[]})=>typeof detector}).BarcodeDetector;
    if(!API){setError("Camera barcode scanning isn't supported here. Type the barcode instead.");setScan(false);return;}
    try{detector=new API({formats:["ean_13","ean_8","upc_a","upc_e"]}) as NonNullable<typeof detector>;}catch{setError("Camera scanner is unavailable.");setScan(false);return;}
    async function init(){
      try{
        const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
        if(closed){media.getTracks().forEach(t=>t.stop());return;}
        stream.current=media;
        if(camera.current){camera.current.srcObject=media;await camera.current.play();}
        async function check(){
          if(closed)return;
          try{
            if(camera.current&&detector){
              const results=await detector.detect(camera.current);
              const code=results.find(r=>/^[0-9]{8,14}$/.test(r.rawValue));
              if(code){setBarcode(code.rawValue);setScan(false);return;}
            }
          }catch{}
          frame=window.setTimeout(check,450);
        }
        check();
      }catch{setError("Camera permission denied. Enter a barcode manually.");setScan(false);}
    }
    init();
    return()=>{closed=true;clearTimeout(frame);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
  },[scan]);

  const recipePreview=parts.map(p=>{
    const f=foods.find(f=>f.id===p.id);const g=Number(p.grams);
    return f&&Number.isFinite(g)&&g>0?{food_id:f.id,name:f.name,grams:g,
      calories_100g:Number(f.calories_100g),protein_100g:Number(f.protein_100g),
      carbs_100g:Number(f.carbs_100g),fat_100g:Number(f.fat_100g)}:null;
  });
  const total=recipePreview.every(Boolean)&&recipePreview.length?
    totalNutrition(recipePreview as RecipeIngredient[]):null;

  return <div className="space-y-6">
    <header><div className="flex items-center gap-2 text-accent"><BookOpen size={21}/><span className="text-sm">Personal food library</span></div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Saved foods & recipes</h1>
      <p className="mt-2 text-sm text-muted">Store food-label nutrition, build meals from measured ingredients, and reuse them in your diary. No daily targets required.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-line p-3 text-sm text-red-400">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-line p-3 text-sm">{message}</p>}

    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <h2 className="font-display text-xl font-semibold">Barcode lookup</h2>
      <label htmlFor="barcode" className="label">Product barcode (8–14 digits)</label>
      <input id="barcode" className="field" inputMode="numeric" value={barcode}
        onChange={e=>setBarcode(e.target.value.replace(/[^0-9]/g,"").slice(0,14))} placeholder="Type barcode number"/>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1 gap-2" disabled={busy} onClick={lookup}><Barcode size={18}/>Look up</button>
        <button type="button" className="btn-ghost border border-line gap-2" onClick={()=>setScan(x=>!x)}><Camera size={18}/>{scan?"Stop camera":"Scan"}</button>
      </div>
      {scan&&<video ref={camera} autoPlay playsInline muted className="w-full rounded-xl bg-black" aria-label="Live barcode camera preview"/>}
      <p className="text-xs text-muted">Camera scanning depends on browser support and permission. Manual barcode entry always works. Product data comes from Open Food Facts and should be checked against the package label.</p>
    </section>

    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <h2 className="font-display text-xl font-semibold">Save a food</h2>
      <label htmlFor="food-name" className="label">Food / product name</label>
      <input id="food-name" value={form.name} onChange={e=>update("name",e.target.value)} className="field" maxLength={120}/>
      <div className="grid grid-cols-2 gap-3">
        {keys.map(k=><div key={k}><label htmlFor={k} className="label">{k.replace("_100g","").replace("_"," ")} / 100g</label>
          <input id={k} className="field" type="number" inputMode="decimal" step="any" min={0}
            value={form[k]} onChange={e=>update(k,e.target.value)} placeholder="Verify"/>
        </div>)}
      </div>
      <p className="text-xs text-muted">Source: {form.source}. All nutrition fields must be verified. Values are per 100g, not per serving.</p>
      <button type="button" disabled={busy} onClick={saveFood} className="btn w-full"><Plus size={18}/>Save food</button>
    </section>

    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <h2 className="font-display text-xl font-semibold">Create recipe</h2>
      <label htmlFor="recipe-name" className="label">Recipe name</label>
      <input id="recipe-name" className="field" maxLength={120} value={recipeName}
        onChange={e=>setRecipeName(e.target.value)} placeholder="Home-cooked adobo"/>
      {parts.map((p,i)=><div key={i} className="grid grid-cols-[1fr_100px] gap-2">
        <div><label className="label" htmlFor={`ingredient-${i}`}>Ingredient {i+1}</label>
          <select id={`ingredient-${i}`} className="field" value={p.id}
            onChange={e=>setParts(old=>old.map((v,j)=>j===i?{...v,id:e.target.value}:v))}>
            <option value="">Select saved food</option>
            {foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div><label className="label" htmlFor={`grams-${i}`}>Grams</label>
          <input id={`grams-${i}`} type="number" step="any" min="0.1" className="field"
            value={p.grams} onChange={e=>setParts(old=>old.map((v,j)=>j===i?{...v,grams:e.target.value}:v))}/></div>
      </div>)}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost border border-line" disabled={parts.length>=20}
          onClick={()=>setParts(old=>[...old,{id:"",grams:""}])}>Add ingredient</button>
        {parts.length>1&&<button type="button" className="btn-ghost border border-line"
          onClick={()=>setParts(old=>old.slice(0,-1))}>Remove last</button>}
      </div>
      {total&&<p className="text-sm text-muted">Whole recipe: {round(total.grams)}g · {round(total.calories)} kcal · Protein {round(total.protein)}g · Carbs {round(total.carbs)}g · Fat {round(total.fat)}g</p>}
      <p className="text-xs text-muted">Recipe values use saved ingredient data and measured grams. Cooking, evaporation and yield can change the final portion weight. Verify the actual finished weight.</p>
      <button type="button" className="btn w-full" disabled={busy||foods.length===0} onClick={saveRecipe}>Save recipe</button>
    </section>

    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <h2 className="font-display text-xl font-semibold">Add saved item to diary</h2>
      <label className="label" htmlFor="saved-choice">Food or recipe</label>
      <select id="saved-choice" className="field" value={selected} onChange={e=>setSelected(e.target.value)}>
        <option value="">Choose an item</option>
        {foods.map(f=><option key={f.id} value={"food:"+f.id}>{f.name} (food)</option>)}
        {recipes.map(r=><option key={r.id} value={"recipe:"+r.id}>{r.name} (recipe)</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3"><div>
        <label className="label" htmlFor="saved-portion">Portion (g)</label>
        <input id="saved-portion" className="field" type="number" inputMode="decimal" step="any"
          min="0.1" max="10000" value={portionG} onChange={e=>setPortionG(e.target.value)}/>
      </div><div><label className="label" htmlFor="saved-meal">Meal</label>
        <select id="saved-meal" className="field" value={meal} onChange={e=>setMeal(e.target.value)}>
          {["breakfast","lunch","dinner","snack"].map(m=><option value={m} key={m}>{m}</option>)}
        </select></div></div>
      <button type="button" className="btn w-full" disabled={busy||!selected} onClick={saveLog}>Confirm and log portion</button>
    </section>

    <section className="space-y-3"><h2 className="font-display text-xl font-semibold">Your saved foods</h2>
      {!foods.length&&<p className="text-sm text-muted">No saved foods yet.</p>}
      {foods.map(f=><div key={f.id} className="flex justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <div className="min-w-0"><p className="font-semibold">{f.name}</p><p className="text-xs text-muted">{f.source} · {f.calories_100g} kcal / 100g</p></div>
        <button type="button" className="btn-ghost" aria-label={"Delete "+f.name} disabled={busy} onClick={()=>remove("food",f.id)}><Trash2 size={17}/></button>
      </div>)}
      <h2 className="font-display text-xl font-semibold">Your recipes</h2>
      {!recipes.length&&<p className="text-sm text-muted">No saved recipes yet.</p>}
      {recipes.map(r=><div key={r.id} className="flex justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <div className="min-w-0"><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.ingredients.length} ingredients</p></div>
        <button type="button" className="btn-ghost" aria-label={"Delete "+r.name} disabled={busy} onClick={()=>remove("recipe",r.id)}><Trash2 size={17}/></button>
      </div>)}
    </section>
  </div>;
}
