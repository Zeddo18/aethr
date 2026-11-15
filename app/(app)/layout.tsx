import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const name = profile?.display_name || user.email || "You";

  return (
    <div className="min-h-dvh md:pl-64">
      <Nav name={name} />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-8 md:pb-12"
        style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
        {children}
      </main>
    </div>
  );
}
