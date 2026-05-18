"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, TrendingDown, TrendingUp, Minus, Check, Loader2,
  Dumbbell, Timer, Layers, Flame,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase-browser";
import { FullSpinner, Empty } from "@/components/ui";
import { fmtDate, GOAL } from "@/lib/calc";
import type { Profile, WeightLog, Session } from "@/lib/types";

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

export default function ProgressoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [p, wl, ss] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true }),
      supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    setProfile(p.data);
    const wlogs = (wl.data as WeightLog[]) || [];
    setLogs(wlogs);
    setSessions((ss.data as Session[]) || []);
    setWeight(
      String(
        wlogs.length ? wlogs[wlogs.length - 1].weight_kg : p.data?.weight_kg || ""
      )
    );
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveWeight() {
    const w = parseFloat(weight.replace(",", "."));
    if (!w || w < 25 || w > 350) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("weight_logs").upsert(
        {
          user_id: user.id,
          date: new Date().toISOString().slice(0, 10),
          weight_kg: w,
        },
        { onConflict: "user_id,date" }
      );
      await supabase.from("profiles").update({ weight_kg: w }).eq("id", user.id);
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (!ready) return <FullSpinner />;

  const first = Number(logs[0]?.weight_kg ?? profile?.weight_kg ?? 0);
  const current = Number(
    logs.length ? logs[logs.length - 1].weight_kg : profile?.weight_kg ?? 0
  );
  const delta = +(current - first).toFixed(1);
  const goal = profile?.goal || "manutencao";
  const good =
    goal === "cutting"
      ? delta < 0
      : goal === "hipertrofia"
      ? delta > 0
      : Math.abs(delta) <= 1;
  const DeltaIcon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const deltaColor = delta === 0 ? "var(--mut)" : good ? "var(--acc)" : "var(--fat)";

  const chartData = logs.map((l) => ({
    d: fmtDate(l.date),
    peso: Number(l.weight_kg),
  }));
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const week = sessions.filter((s) => s.date >= weekAgo);
  const totalVol = week.reduce((a, s) => a + Number(s.total_volume || 0), 0);

  return (
    <>
      <button
        onClick={() => router.push("/inicio")}
        style={{
          background: "none",
          border: "none",
          color: "var(--mut)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        <ChevronLeft size={16} /> Início
      </button>

      <div className="dsp" style={{ fontSize: 28 }}>
        Meu progresso
      </div>
      <div className="kicker" style={{ marginTop: 2 }}>
        Evolução de peso e treinos
      </div>

      {/* registrar peso */}
      <div className="card pad" style={{ marginTop: 16 }}>
        <span className="kicker">Registrar peso de hoje</span>
        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
          <input
            className="inp"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-acc"
            style={{ width: "auto", padding: "0 20px" }}
            onClick={saveWeight}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={16} className="spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              "Salvar"
            )}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>
          Pese-se sempre no mesmo horário, de preferência em jejum.
        </p>
      </div>

      {/* resumo */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div className="card2 pad" style={{ flex: 1 }}>
          <div className="kicker">Peso atual</div>
          <div className="dsp" style={{ fontSize: 26, marginTop: 5 }}>
            {current || "—"}
            <span style={{ fontSize: 13, color: "var(--mut)" }}> kg</span>
          </div>
        </div>
        <div className="card2 pad" style={{ flex: 1 }}>
          <div className="kicker">Desde o início</div>
          <div
            className="dsp"
            style={{
              fontSize: 26,
              marginTop: 5,
              color: deltaColor,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <DeltaIcon size={20} />
            {delta > 0 ? "+" : ""}
            {delta}
            <span style={{ fontSize: 13, color: "var(--mut)" }}> kg</span>
          </div>
        </div>
      </div>

      {/* grafico */}
      <div className="card pad" style={{ marginTop: 12 }}>
        <span className="kicker">Evolução de peso</span>
        {chartData.length >= 2 ? (
          <div style={{ height: 210, marginTop: 12, marginLeft: -10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2c2e1f" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fill: "#8e9079", fontSize: 11 }}
                  axisLine={{ stroke: "#2c2e1f" }}
                  tickLine={false}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fill: "#8e9079", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1d1f13",
                    border: "1px solid #3c3f2a",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8e9079" }}
                  formatter={(v: number) => [`${v} kg`, "Peso"]}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="#cdf73c"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#cdf73c" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            icon={<TrendingUp size={26} />}
            text="Registre seu peso por alguns dias para ver o gráfico de evolução."
          />
        )}
      </div>

      {/* treinos da semana */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div className="card2 pad" style={{ flex: 1 }}>
          <Flame size={17} style={{ color: "var(--fat)" }} />
          <div className="dsp" style={{ fontSize: 22, marginTop: 5 }}>
            {week.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
            treinos esta semana
          </div>
        </div>
        <div className="card2 pad" style={{ flex: 1 }}>
          <Layers size={17} style={{ color: "var(--acc)" }} />
          <div className="dsp" style={{ fontSize: 22, marginTop: 5 }}>
            {(totalVol / 1000).toFixed(1)}t
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
            volume movido na semana
          </div>
        </div>
      </div>

      {/* historico */}
      <div style={{ marginTop: 18 }}>
        <span className="kicker">Histórico de treinos</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
        {sessions.length === 0 && (
          <div className="card">
            <Empty
              icon={<Dumbbell size={26} />}
              text="Nenhum treino concluído ainda. Finalize uma sessão para registrar aqui."
            />
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className="card pad"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <div
              className="center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "var(--surf3)",
                color: "var(--acc)",
                flex: "0 0 auto",
              }}
            >
              <Dumbbell size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dsp" style={{ fontSize: 14.5 }}>
                {s.workout_name || "Treino"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                {fmtDate(s.date)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <span className="pill2">
                <Timer size={11} /> {fmtDur(s.duration_sec)}
              </span>
              <span className="pill2">
                <Layers size={11} /> {s.sets_done} séries
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
