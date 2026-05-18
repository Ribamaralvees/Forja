"use client";
import { useEffect, useState } from "react";
import { Loader2, Plus, X, Check, Briefcase, Moon, Dumbbell, Utensils } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { Header, FullSpinner } from "@/components/ui";
import type { Routine, MealTime } from "@/lib/types";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"]; // 1=Dom..7=Sab

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className="lab">{label}</span>
      {children}
    </div>
  );
}

export default function RotinaPage() {
  const supabase = createClient();
  const [r, setR] = useState<Routine | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("routine")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data)
        setR({ ...data, meal_times: data.meal_times || [] } as Routine);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!r) return <FullSpinner />;

  const up = (k: keyof Routine, v: unknown) => {
    setR({ ...r, [k]: v } as Routine);
    setSaved(false);
  };
  const toggleDay = (d: number) => {
    const days = r.work_days.includes(d)
      ? r.work_days.filter((x) => x !== d)
      : [...r.work_days, d].sort();
    up("work_days", days);
  };
  const addMeal = () =>
    up("meal_times", [
      ...r.meal_times,
      { label: "Refeição", time: "12:00" } as MealTime,
    ]);
  const updMeal = (i: number, k: keyof MealTime, v: string) => {
    const m = r.meal_times.map((x, j) => (j === i ? { ...x, [k]: v } : x));
    up("meal_times", m);
  };
  const delMeal = (i: number) =>
    up("meal_times", r.meal_times.filter((_, j) => j !== i));

  async function save() {
    if (!r) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("routine")
      .update({
        works: r.works,
        work_start: r.work_start,
        work_end: r.work_end,
        work_days: r.work_days,
        wake_time: r.wake_time,
        sleep_time: r.sleep_time,
        training_time: r.training_time,
        training_duration: r.training_duration,
        meal_times: r.meal_times,
        notes: r.notes,
      })
      .eq("user_id", user.id);
    setSaving(false);
    setSaved(true);
  }

  return (
    <>
      <Header
        title="Sua rotina"
        sub="Tudo se adapta ao seu tempo"
      />
      <p style={{ color: "var(--mut)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        A IA usa estes horários para encaixar treinos e refeições na sua agenda.
      </p>

      {/* sono */}
      <div className="card pad">
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <Moon size={17} style={{ color: "var(--acc)" }} />
          <span className="kicker">Sono</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <Field label="Acorda">
            <input
              className="inp"
              type="time"
              value={r.wake_time?.slice(0, 5)}
              onChange={(e) => up("wake_time", e.target.value)}
            />
          </Field>
          <Field label="Dorme">
            <input
              className="inp"
              type="time"
              value={r.sleep_time?.slice(0, 5)}
              onChange={(e) => up("sleep_time", e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* trabalho */}
      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="row">
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <Briefcase size={17} style={{ color: "var(--acc)" }} />
            <span className="kicker">Trabalho</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mut)" }}>
            Trabalho fixo
            <input
              type="checkbox"
              checked={r.works}
              onChange={(e) => up("works", e.target.checked)}
            />
          </label>
        </div>
        {r.works && (
          <>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <Field label="Início">
                <input
                  className="inp"
                  type="time"
                  value={r.work_start?.slice(0, 5) || ""}
                  onChange={(e) => up("work_start", e.target.value)}
                />
              </Field>
              <Field label="Fim">
                <input
                  className="inp"
                  type="time"
                  value={r.work_end?.slice(0, 5) || ""}
                  onChange={(e) => up("work_end", e.target.value)}
                />
              </Field>
            </div>
            <span className="lab">Dias de trabalho</span>
            <div style={{ display: "flex", gap: 6 }}>
              {DAYS.map((d, i) => {
                const day = i + 1;
                const on = r.work_days.includes(day);
                return (
                  <button
                    key={i}
                    onClick={() => toggleDay(day)}
                    className={"chip" + (on ? " on" : "")}
                    style={{ flex: 1, padding: "10px 0" }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* treino */}
      <div className="card pad" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <Dumbbell size={17} style={{ color: "var(--acc)" }} />
          <span className="kicker">Treino</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <Field label="Horário do treino">
            <input
              className="inp"
              type="time"
              value={r.training_time?.slice(0, 5)}
              onChange={(e) => up("training_time", e.target.value)}
            />
          </Field>
          <Field label="Duração (min)">
            <input
              className="inp"
              inputMode="numeric"
              value={r.training_duration}
              onChange={(e) =>
                up("training_duration", +e.target.value.replace(/\D/g, "") || 0)
              }
            />
          </Field>
        </div>
      </div>

      {/* refeicoes */}
      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="row">
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <Utensils size={17} style={{ color: "var(--acc)" }} />
            <span className="kicker">Horários de refeição</span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>
          Quando você consegue se alimentar no dia. A dieta será montada nesses horários.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {r.meal_times.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="inp"
                style={{ flex: 2 }}
                placeholder="Ex: Almoço"
                value={m.label}
                onChange={(e) => updMeal(i, "label", e.target.value)}
              />
              <input
                className="inp"
                style={{ flex: 1 }}
                type="time"
                value={m.time}
                onChange={(e) => updMeal(i, "time", e.target.value)}
              />
              <button className="btn btn-out btn-ico" onClick={() => delMeal(i)}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn btn-out btn-sm"
          style={{ width: "100%", marginTop: 10 }}
          onClick={addMeal}
        >
          <Plus size={15} /> Adicionar horário de refeição
        </button>
      </div>

      {/* observacoes */}
      <div className="card pad" style={{ marginTop: 12 }}>
        <span className="kicker">Observações</span>
        <textarea
          className="inp"
          style={{ marginTop: 8, minHeight: 70, resize: "vertical" }}
          placeholder="Ex: faço dieta com a família no jantar, treino pela manhã às quartas..."
          value={r.notes}
          onChange={(e) => up("notes", e.target.value)}
        />
      </div>

      <button
        className="btn btn-acc"
        style={{ marginTop: 16 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <Check size={17} />
        )}
        {saved ? "Rotina salva!" : "Salvar rotina"}
      </button>
    </>
  );
}
