import { redirect } from "next/navigation";
import { ReminderSettings } from "@/components/reminder-settings";
import { AccountPrivacySettings } from "@/components/account-privacy-settings";
import type { ReminderPreferences } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "App Settings · AETHR" };
export const dynamic = "force-dynamic";
const defaults: ReminderPreferences = { enabled: false, reminder_time: "20:00", reminder_kind: "check_in" };

export default async function SettingsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await db.from("reminder_preferences")
    .select("enabled,reminder_time,reminder_kind").eq("user_id", user.id).maybeSingle();
  const prefs = data && (data.reminder_kind === "rest" || data.reminder_kind === "check_in") ? {
    enabled: Boolean(data.enabled),
    reminder_time: String(data.reminder_time).slice(0,5),
    reminder_kind: data.reminder_kind,
  } as ReminderPreferences : defaults;
  return <div className="space-y-8">
    {error && <p role="status" className="mb-4 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
      Reminder preferences aren't available yet. Apply supabase/phase9.sql to enable saving.
    </p>}
    <ReminderSettings initial={prefs}/>
    <AccountPrivacySettings/>
  </div>;
}
