"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, Apple, TrendingUp, Sparkles, CalendarClock } from "lucide-react";

const ITEMS = [
  { href: "/inicio", icon: Home, label: "Início" },
  { href: "/treinos", icon: Dumbbell, label: "Treinos" },
  { href: "/nutricao", icon: Apple, label: "Nutrição" },
  { href: "/rotina", icon: CalendarClock, label: "Rotina" },
  { href: "/coach", icon: Sparkles, label: "Coach IA" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="nav">
      <div className="navin">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <button
              key={href}
              className={"navit" + (active ? " on" : "")}
              onClick={() => router.push(href)}
            >
              <Icon size={21} strokeWidth={2.4} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
