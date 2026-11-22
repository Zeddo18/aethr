import Link from "next/link";
import { Apple, Dumbbell, Footprints, ChartNoAxesCombined, Moon, Settings2 } from "lucide-react";
import { OrbitLine } from "@/components/orbit-line";
import { todayStr } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Today · AETHR" };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();
  const { data: entries } = await supabase.from("meal_entries").select("calories").eq("user_id", user!.id).eq("eaten_on", todayStr());

  const first = (profile?.display_name ?? "").split(" ")[0];
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(new Date());
  const kcal = Math.round((entries ?? []).reduce((s, e) => s + Number(e.calories), 0));

  const cards = [
    { icon: Apple, title: "Food", href: "/nutrition", text: entries?.length ? `${kcal} kcal logged today.` : "No meals logged yet." },
    { icon: Dumbbell, title: "Gym", href: "/gym", text: "No workout today." },
    { icon: Footprints, title: "Run", href: "/run", text: "No runs this week." },
  ];

  return (
    <>
      <p className="text-sm text-muted">{date}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">{first ? `Hi, ${first}` : "Today"}</h1>
      <OrbitLine className="my-6 h-8 w-full" />
      <Link href="/settings" className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm hover:border-accent"><Settings2 size={20} className="text-accent" aria-hidden /> App preferences & installation</Link>
      <Link href="/recovery" className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm hover:border-accent"><Moon size={20} className="text-accent" aria-hidden /> Recovery & wellness journal</Link>
      <Link href="/progress" className="mb-5 flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-medium hover:border-accent"><span className="flex items-center gap-2"><ChartNoAxesCombined size={20} className="text-accent" aria-hidden /> Your 28-day progress</span><span className="text-muted">View history</span></Link>
      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link href={href} className="block rounded-2xl border border-line bg-surface p-5">
              <Icon size={22} className="text-accent" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
