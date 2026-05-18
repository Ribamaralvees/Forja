"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Sparkles, Play, Pencil, Trash2, Plus, X, Dumbbell, Check, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { Header, FullSpinner, Empty, Sheet, ConfirmModal } from "@/components/ui";
import type { Workout, Exercise } from "@/lib/types";

const LETTERS = "ABCDEFGH";

export default function TreinosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Workout | null>(null);
  const [confirmDel, setConfirmDel] = useState<Workout | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("workouts")
      .select("*, exercises(*)")
      .eq("user_id", user.id)
      .order("position");
    const list = (data || []).map((w) => ({
      ...w,
      exercises: (w.exercises || []).sort(
        (a: Exercise, b: Exercise) => a.position - b.position
      ),
    })) as Workout[];
    setWorkouts(list);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return <FullSpinner />;

  async function gerar() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/ai/treino", { method: "POST" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setErr("Não consegui montar os treinos. Tente de novo.");
    }
    setBusy(false);
  }

  async function deleteWorkout(w: Workout) {
    setConfirmDel(null);
    await supabase.from("workouts").delete().eq("id", w.id);
    load();
  }

  return (
    <>
      <Header title="Treinos" sub="Sua divisão personalizada" />

      {workouts.length === 0 ? (
        <>
          <button className="btn btn-acc" onClick={gerar} disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Montar treinos com IA
          </button>
          {err && (
            <p style={{ color: "var(--fat)", fontSize: 13, marginTop: 8 }}>
              {err}
            </p>
          )}
          {!busy && (
            <Empty
              icon={<Dumbbell size={26} />}
              text="A IA cria sua divisão de treino completa, adaptada ao seu nível, objetivo e tempo disponível na rotina."
            />
          )}
        </>
      ) : (
        <>
          {workouts.map((w, i) => (
            <div key={w.id} className="card pad" style={{ marginTop: i ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="letter">{LETTERS[i]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dsp" style={{ fontSize: 17, lineHeight: 1.1 }}>
                    {w.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--mut)",
                      marginTop: 2,
                    }}
                  >
                    {w.focus} · {w.exercises?.length || 0} exercícios
                  </div>
                </div>
                <button
                  className="btn btn-out btn-ico"
                  onClick={() => setEditing(w)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="btn btn-danger btn-ico"
                  onClick={() => setConfirmDel(w)}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                {(w.exercises || []).map((ex, k) => (
                  <div key={ex.id} className="exrow">
                    <span className="exnum">{k + 1}</span>
                    <span className="exname">{ex.name}</span>
                    <span className="exmeta">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-acc btn-sm"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => router.push(`/treinos/sessao/${w.id}`)}
              >
                <Play size={15} /> Iniciar treino
              </button>
            </div>
          ))}

          <button
            className="btn btn-out"
            style={{ marginTop: 14 }}
            onClick={gerar}
            disabled={busy}
          >
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Gerar nova divisão com IA
          </button>
          {err && (
            <p style={{ color: "var(--fat)", fontSize: 13, marginTop: 8 }}>
              {err}
            </p>
          )}
        </>
      )}

      {editing && (
        <WorkoutEditor
          workout={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          icon={<Trash2 size={20} />}
          title="Excluir treino?"
          msg={`O treino "${confirmDel.name}" e seus exercícios serão removidos.`}
          actions={[
            {
              label: "Excluir",
              kind: "danger",
              onClick: () => deleteWorkout(confirmDel),
            },
            { label: "Cancelar", onClick: () => setConfirmDel(null) },
          ]}
        />
      )}
    </>
  );
}

interface DraftEx {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}

function WorkoutEditor({
  workout,
  onClose,
  onSaved,
}: {
  workout: Workout;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(workout.name);
  const [focus, setFocus] = useState(workout.focus);
  const [exs, setExs] = useState<DraftEx[]>(
    (workout.exercises || []).map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      rest: e.rest,
    }))
  );
  const [saving, setSaving] = useState(false);

  const updEx = (i: number, k: keyof DraftEx, v: string | number) =>
    setExs((p) => p.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const addEx = () =>
    setExs((p) => [
      ...p,
      { name: "", sets: 3, reps: "10-12", rest: "60s" },
    ]);
  const delEx = (i: number) => setExs((p) => p.filter((_, j) => j !== i));

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("workouts")
      .update({ name, focus })
      .eq("id", workout.id);
    await supabase.from("exercises").delete().eq("workout_id", workout.id);
    const rows = exs
      .filter((e) => e.name.trim())
      .map((e, idx) => ({
        user_id: user.id,
        workout_id: workout.id,
        name: e.name.trim(),
        sets: e.sets,
        reps: e.reps,
        rest: e.rest,
        position: idx,
      }));
    if (rows.length) await supabase.from("exercises").insert(rows);
    setSaving(false);
    onSaved();
  }

  return (
    <Sheet title="Editar treino" onClose={onClose}>
      <span className="lab">Nome do treino</span>
      <input
        className="inp"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <span className="lab" style={{ marginTop: 12 }}>
        Foco muscular
      </span>
      <input
        className="inp"
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
      />

      <div className="divd" />
      <span className="kicker">Exercícios</span>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {exs.map((ex, i) => (
          <div key={i} className="card2 pad">
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="inp"
                style={{ flex: 1 }}
                placeholder="Nome do exercício"
                value={ex.name}
                onChange={(e) => updEx(i, "name", e.target.value)}
              />
              <button
                className="btn btn-out btn-ico"
                onClick={() => delEx(i)}
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <span className="lab">Séries</span>
                <input
                  className="inp"
                  inputMode="numeric"
                  value={ex.sets}
                  onChange={(e) =>
                    updEx(i, "sets", +e.target.value.replace(/\D/g, "") || 0)
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="lab">Reps</span>
                <input
                  className="inp"
                  value={ex.reps}
                  onChange={(e) => updEx(i, "reps", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span className="lab">Descanso</span>
                <input
                  className="inp"
                  value={ex.rest}
                  onChange={(e) => updEx(i, "rest", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn btn-out btn-sm"
        style={{ width: "100%", marginTop: 10 }}
        onClick={addEx}
      >
        <Plus size={15} /> Adicionar exercício
      </button>

      <button
        className="btn btn-acc"
        style={{ marginTop: 16 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? <Loader2 size={16} className="spin" /> : <Check size={17} />}
        Salvar treino
      </button>
    </Sheet>
  );
}
