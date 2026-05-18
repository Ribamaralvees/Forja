"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pause, Play, X, Check, Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { FullSpinner, ConfirmModal } from "@/components/ui";
import type { Workout, Exercise } from "@/lib/types";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function SessaoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // chave: `${exIdx}-${setIdx}` -> { done, weight }
  const [sets, setSets] = useState<Record<string, { done: boolean; weight: string }>>(
    {}
  );
  const [exitAsk, setExitAsk] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState<null | {
    duration: number;
    setsDone: number;
    volume: number;
  }>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workouts")
        .select("*, exercises(*)")
        .eq("id", params.id)
        .single();
      if (!data) {
        router.push("/treinos");
        return;
      }
      data.exercises = (data.exercises || []).sort(
        (a: Exercise, b: Exercise) => a.position - b.position
      );
      setWorkout(data as Workout);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (paused || done) return;
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, done]);

  const finish = useCallback(async () => {
    if (!workout) return;
    setFinishing(true);
    let setsDone = 0;
    let volume = 0;
    const details = (workout.exercises || []).map((ex, ei) => {
      const exSets: { weight: number }[] = [];
      for (let si = 0; si < ex.sets; si++) {
        const s = sets[`${ei}-${si}`];
        if (s?.done) {
          setsDone++;
          const w = parseFloat(s.weight) || 0;
          volume += w;
          exSets.push({ weight: w });
        }
      }
      return { name: ex.name, sets_done: exSets.length, sets: exSets };
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("sessions").insert({
        user_id: user.id,
        workout_id: workout.id,
        workout_name: workout.name,
        duration_sec: elapsed,
        sets_done: setsDone,
        total_volume: volume,
        details,
      });
    }
    setDone({ duration: elapsed, setsDone, volume });
    setFinishing(false);
  }, [workout, sets, elapsed, supabase]);

  if (!workout) return <FullSpinner />;

  // resumo final
  if (done) {
    return (
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div className="center" style={{ marginBottom: 18 }}>
          <div
            className="center"
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: "var(--acc)",
              color: "#15170e",
            }}
          >
            <Trophy size={36} />
          </div>
        </div>
        <div
          className="dsp"
          style={{ fontSize: 28, textAlign: "center" }}
        >
          Treino concluído!
        </div>
        <p
          style={{
            textAlign: "center",
            color: "var(--mut)",
            fontSize: 14,
            marginTop: 6,
          }}
        >
          {workout.name} · mandou bem.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <div className="card2 pad" style={{ flex: 1, textAlign: "center" }}>
            <div className="dsp" style={{ fontSize: 22, color: "var(--acc)" }}>
              {fmtTime(done.duration)}
            </div>
            <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
              duração
            </div>
          </div>
          <div className="card2 pad" style={{ flex: 1, textAlign: "center" }}>
            <div className="dsp" style={{ fontSize: 22, color: "var(--acc)" }}>
              {done.setsDone}
            </div>
            <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
              séries feitas
            </div>
          </div>
          <div className="card2 pad" style={{ flex: 1, textAlign: "center" }}>
            <div className="dsp" style={{ fontSize: 22, color: "var(--acc)" }}>
              {Math.round(done.volume)}
            </div>
            <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>
              kg movidos
            </div>
          </div>
        </div>
        <button
          className="btn btn-acc"
          style={{ marginTop: 22 }}
          onClick={() => router.push("/progresso")}
        >
          Ver meu progresso
        </button>
        <button
          className="btn btn-out"
          style={{ marginTop: 10 }}
          onClick={() => router.push("/treinos")}
        >
          Voltar aos treinos
        </button>
      </div>
    );
  }

  const totalSets = (workout.exercises || []).reduce(
    (a, e) => a + e.sets,
    0
  );
  const doneCount = Object.values(sets).filter((s) => s.done).length;

  return (
    <div className="wrap" style={{ paddingTop: 16, paddingBottom: 120 }}>
      {/* cabecalho fixo */}
      <div
        className="card pad"
        style={{
          position: "sticky",
          top: 12,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          className="btn btn-out btn-ico"
          onClick={() => setExitAsk(true)}
        >
          <X size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dsp" style={{ fontSize: 16, lineHeight: 1.1 }}>
            {workout.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--mut)" }}>
            {doneCount}/{totalSets} séries
          </div>
        </div>
        <div
          className="dsp"
          style={{ fontSize: 22, color: paused ? "var(--mut)" : "var(--acc)" }}
        >
          {fmtTime(elapsed)}
        </div>
        <button
          className="btn btn-out btn-ico"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>

      <div className="bar" style={{ marginTop: 12 }}>
        <i
          style={{
            width: (doneCount / (totalSets || 1)) * 100 + "%",
            background: "var(--acc)",
          }}
        />
      </div>

      {(workout.exercises || []).map((ex, ei) => (
        <div key={ex.id} className="card pad" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="exnum">{ei + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="dsp" style={{ fontSize: 15 }}>
                {ex.name}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mut)" }}>
                {ex.sets} séries · {ex.reps} reps · descanso {ex.rest}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {Array.from({ length: ex.sets }).map((_, si) => {
              const key = `${ei}-${si}`;
              const s = sets[key] || { done: false, weight: "" };
              return (
                <div
                  key={si}
                  className="card2"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                  }}
                >
                  <span
                    className="exnum"
                    style={{ background: "transparent" }}
                  >
                    {si + 1}ª
                  </span>
                  <input
                    className="inp"
                    style={{ flex: 1, padding: "8px 10px" }}
                    inputMode="decimal"
                    placeholder="carga (kg)"
                    value={s.weight}
                    onChange={(e) =>
                      setSets((p) => ({
                        ...p,
                        [key]: {
                          done: s.done,
                          weight: e.target.value.replace(/[^\d.]/g, ""),
                        },
                      }))
                    }
                  />
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) =>
                      setSets((p) => ({
                        ...p,
                        [key]: { done: e.target.checked, weight: s.weight },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="btn btn-acc"
        style={{ marginTop: 16 }}
        onClick={finish}
        disabled={finishing}
      >
        {finishing ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <Check size={17} />
        )}
        Finalizar treino
      </button>

      {exitAsk && (
        <ConfirmModal
          icon={<X size={20} />}
          title="Sair do treino?"
          msg="O progresso desta sessão não será salvo."
          actions={[
            {
              label: "Sair sem salvar",
              kind: "danger",
              onClick: () => router.push("/treinos"),
            },
            { label: "Continuar treinando", onClick: () => setExitAsk(false) },
          ]}
        />
      )}
    </div>
  );
}
