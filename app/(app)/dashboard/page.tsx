import { Apple, Dumbbell, Footprints } from "lucide-react";
import { OrbitLine } from "@/components/orbit-line";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Today · AETHR" };

const CARDS = [
  { icon: Apple, title: "Food", text: "No meals logged yet." },
  { icon: Dumbbell, title: "Gym", text: "No workout today." },
  { icon: Footprints, title: "Run", text: "No runs this week." },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();
  const first = (profile?.display_name ?? "").split(" ")[0];
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <>
      <p className="text-sm text-muted">{date}</p>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">
        {first ? `Hi, ${first}` : "Today"}
      </h1>
      <OrbitLine className="my-6 h-8 w-full" />
      <ul className="grid gap-3 sm:grid-cols-3">
        {CARDS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl border border-line bg-surface p-5">
            <Icon size={22} className="text-accent" aria-hidden />
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
