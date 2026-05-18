"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell, Apple, Flame, TrendingUp, ChevronRight, CalendarClock, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { FullSpinner } from "@/components/ui";
import { calcTargets, GOAL } from "@/lib/calc";
import type { Profile } from "@/lib/types";

export default function InicioPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    workouts: 0,
    sessions7: 0,
    hasDiet: false,
    lastWeight: 0,
  });

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const weekAgo = new Date(Date.now() - 7 * 864e5)
        .toISOString()
        .slice(0, 10);
      const [p, w, s, d, wl] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("workouts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("date", weekAgo),
        supabase
          .from("diets")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1),
        supabase
          .from("weight_logs")
          .select("weight_kg")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1),
      ]);
      setProfile(p.data);
      setStats({
        workouts: w.count || 0,
        sessions7: s.count || 0,
        hasDiet: !!(d.data && d.data.length),
        lastWeight: wl.data?.[0]?.weight_kg || p.data?.weight_kg || 0,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return <FullSpinner />;
  const t = calcTargets(profile);
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const first = (profile.name || "").split(" ")[0];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div className="kicker" style={{ color: "var(--acc)" }}>
          {greet}
        </div>
        <div className="dsp" style={{ fontSize: 30, marginTop: 4 }}>
          {first}, bora treinar?
        </div>
      </div>

      {/* meta do dia */}
      <div
        className="card pad"
        style={{
          background:
            "linear-gradient(150deg, var(--surf), var(--surf2))",
        }}
      >
        <span className="kicker">Meta calórica de hoje</span>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginTop: 6,
          }}
        >
          <span className="dsp" style={{ fontSize: 44, color: "var(--acc)" }}>
            {t.kcal}
          </span>
          <span style={{ color: "var(--mut)", fontSize: 13 }}>kcal / dia</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 12,
            fontSize: 12,
            color: "var(--mut)",
          }}
        >
          <span>
            <b style={{ color: "var(--prot)" }}>{t.protein}g</b> proteína
          </span>
          <span>·</span>
          <span>
            <b style={{ color: "var(--carb)" }}>{t.carbs}g</b> carbo
          </span>
          <span>·</span>
          <span>
            <b style={{ color: "var(--fat)" }}>{t.fat}g</b> gordura
          </span>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div className="card2 pad" style={{ flex: 1 }}>
          <Flame size={18} style={{ color: "var(--fat)" }} />
          <div className="dsp" style={{ fontSize: 22, marginTop: 6 }}>
            {stats.sessions7}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
            treinos nos últimos 7 dias
          </div>
        </div>
        <div className="card2 pad" style={{ flex: 1 }}>
          <TrendingUp size={18} style={{ color: "var(--acc)" }} />
          <div className="dsp" style={{ fontSize: 22, marginTop: 6 }}>
            {stats.lastWeight} kg
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
            peso atual · {GOAL[profile.goal || ""]}
          </div>
        </div>
      </div>

      {/* atalhos */}
      <div style={{ marginTop: 18 }}>
        <span className="kicker">Continuar</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        <Shortcut
          icon={<Dumbbell size={20} />}
          title={stats.workouts ? "Seus treinos" : "Montar treino com IA"}
          sub={
            stats.workouts
              ? `${stats.workouts} treino(s) no seu plano`
              : "Crie sua divisão personalizada"
          }
          onClick={() => router.push("/treinos")}
        />
        <Shortcut
          icon={<Apple size={20} />}
          title={stats.hasDiet ? "Sua dieta de hoje" : "Montar dieta com IA"}
          sub={
            stats.hasDiet
              ? "Refeições, gramas e receitas com vídeo"
              : "Plano alimentar nos seus horários"
          }
          onClick={() => router.push("/nutricao")}
        />
        <Shortcut
          icon={<CalendarClock size={20} />}
          title="Ajustar minha rotina"
          sub="Trabalho, treino e horários de refeição"
          onClick={() => router.push("/rotina")}
        />
        <Shortcut
          icon={<Sparkles size={20} />}
          title="Falar com o Coach IA"
          sub="Tire dúvidas de treino e dieta"
          onClick={() => router.push("/coach")}
        />
        <Shortcut
          icon={<TrendingUp size={20} />}
          title="Registrar progresso"
          sub="Atualize seu peso e veja a evolução"
          onClick={() => router.push("/progresso")}
        />
      </div>
    </>
  );
}

function Shortcut({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      className="card pad"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        className="center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--surf3)",
          color: "var(--acc)",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="dsp" style={{ fontSize: 15 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <ChevronRight size={18} style={{ color: "var(--dim)" }} />
    </button>
  );
}
