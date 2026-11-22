import { redirect } from "next/navigation";
import { RecoveryJournal } from "@/components/recovery-journal";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/dates";
import type { WellnessLog } from "@/lib/wellness";

export const metadata = { title: "Recovery · AETHR" };
export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await db.from("wellness_logs")
    .select("id,log_date,sleep_start,sleep_end,energy,rest_feeling,activity_feeling,notes,created_at")
    .eq("user_id", user.id).order("log_date", { ascending: false }).limit(60);
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-xl border border-line bg-surface p-4 text-sm text-red-400">
      Recovery logs are unavailable. Apply supabase/phase8.sql in your Supabase SQL editor before using this feature.
    </p>}
    <RecoveryJournal today={todayStr()} entries={(data ?? []) as WellnessLog[]} />
  </div>;
}
