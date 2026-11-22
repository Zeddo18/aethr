import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NutritionLibrary } from "@/components/nutrition-library";
import { isDate, todayStr } from "@/lib/dates";
export const metadata = {title:"Nutrition Library · AETHR"};
export default async function LibraryPage({searchParams}:{searchParams:Promise<{date?:string}>}){
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect("/login");
  const {date}=await searchParams;
  return <NutritionLibrary date={isDate(date)?date:todayStr()}/>;
}
