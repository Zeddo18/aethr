import { ProfileForm, type Profile } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile · AETHR" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
  const profile: Profile = data ?? {
    display_name: null, sex: null, birth_date: null, height_cm: null,
    weight_kg: null, activity_level: null, goal: null, units: "metric",
  };

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mb-6 mt-1 text-sm text-muted">{user!.email}</p>
      <ProfileForm profile={profile} />
    </>
  );
}
