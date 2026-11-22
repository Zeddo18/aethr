"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Dumbbell, Footprints, Home, UserRound, LogOut, Sparkles, ChartNoAxesCombined, Moon } from "lucide-react";
import { signOut } from "@/app/actions";
import { Brand } from "@/components/brand";

const ITEMS = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/nutrition", label: "Food", icon: Apple },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/run", label: "Run", icon: Footprints },
  { href: "/assistant", label: "AI", icon: Sparkles },
];

export function Nav({ name }: { name: string }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-paper p-5 md:flex">
        <Brand />
        <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`btn-ghost ${active(href) ? "!bg-surface !text-accent" : ""}`}>
              <Icon size={20} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-4">
          <Link href="/recovery" aria-current={active("/recovery") ? "page" : undefined} className="btn-ghost w-full"><Moon size={20} aria-hidden /> Recovery</Link>
          <Link href="/progress" aria-current={active("/progress") ? "page" : undefined} className="btn-ghost w-full"><ChartNoAxesCombined size={20} aria-hidden /> Progress</Link>
          <Link href="/profile" className="btn-ghost w-full"><UserRound size={20} aria-hidden /> Profile</Link>
          <p className="truncate px-3 pb-2 text-sm text-muted">{name}</p>
          <form action={signOut}>
            <button className="btn-ghost w-full"><LogOut size={20} aria-hidden /> Sign out</button>
          </form>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-paper/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active(href) ? "font-semibold text-accent" : "text-muted"}`}>
            <Icon size={22} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
