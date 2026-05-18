"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Sparkles, RefreshCw, Utensils, Zap, ChefHat, Check, Play,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { Header, FullSpinner, Empty, Sheet } from "@/components/ui";
import { calcTargets, BIO, GOAL, fmtDate } from "@/lib/calc";
import type { Diet, Meal, Profile, Recipe } from "@/lib/types";

function Macro({
  lbl,
  v,
  max,
  color,
}: {
  lbl: string;
  v: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 5,
        }}
      >
        <span style={{ color: "var(--mut)", fontWeight: 600 }}>{lbl}</span>
        <span style={{ fontWeight: 600 }}>
          {v} / {max}g
        </span>
      </div>
      <div className="bar">
        <i
          style={{
            width: Math.min(100, (v / (max || 1)) * 100) + "%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

const MetBox = ({ v, lbl, hi }: { v: number; lbl: string; hi?: boolean }) => (
  <div
    className="card2 pad"
    style={{
      flex: 1,
      textAlign: "center",
      borderColor: hi ? "var(--accd)" : "var(--bd)",
    }}
  >
    <div className="dsp" style={{ fontSize: 18, color: hi ? "var(--acc)" : "var(--tx)" }}>
      {v}
    </div>
    <div style={{ fontSize: 10, color: "var(--mut)", marginTop: 3, fontWeight: 600 }}>
      {lbl}
    </div>
  </div>
);

function sumItems(items: Meal["meal_items"]) {
  return items.reduce(
    (a, i) => {
      a.kcal += i.kcal;
      a.p += i.protein;
      a.c += i.carbs;
      a.f += i.fat;
      return a;
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

export default function NutricaoPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [recipeMeal, setRecipeMeal] = useState<Meal | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(prof);
    const { data: d } = await supabase
      .from("diets")
      .select("*, meals(*, meal_items(*), recipes(*))")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (d) {
      d.meals = (d.meals || []).sort(
        (a: Meal, b: Meal) => a.position - b.position
      );
      d.meals.forEach((m: Meal) => {
        m.meal_items = (m.meal_items || []).sort(
          (a, b) => a.position - b.position
        );
      });
    }
    setDiet(d as Diet | null);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const t = useMemo(
    () => (profile ? calcTargets(profile) : null),
    [profile]
  );

  if (!loaded || !profile || !t) return <FullSpinner />;

  const dist = (() => {
    const kp = t.protein * 4,
      kc = t.carbs * 4,
      kf = t.fat * 9,
      tot = kp + kc + kf || 1;
    return {
      p: Math.round((kp / tot) * 100),
      c: Math.round((kc / tot) * 100),
      f: Math.round((kf / tot) * 100),
    };
  })();
  const water = (Number(profile.weight_kg) * 0.035).toFixed(1);

  async function gerar(extra: string) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/ai/dieta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra }),
      });
      if (!res.ok) throw new Error();
      await load();
      setAjuste("");
    } catch {
      setErr("Não consegui montar a dieta agora. Tente de novo.");
    }
    setBusy(false);
  }

  async function toggleMeal(m: Meal) {
    if (!diet) return;
    const done = !m.done;
    setDiet({
      ...diet,
      meals: diet.meals.map((x) => (x.id === m.id ? { ...x, done } : x)),
    });
    await supabase.from("meals").update({ done }).eq("id", m.id);
  }

  async function openRecipe(m: Meal) {
    if (m.recipes && m.recipes.length) {
      setRecipeMeal(m);
      return;
    }
    setRecipeMeal(m);
    setRecipeLoading(true);
    try {
      const res = await fetch("/api/ai/receita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_id: m.id }),
      });
      if (!res.ok) throw new Error();
      const { recipe } = await res.json();
      const updated = { ...m, recipes: [recipe as Recipe] };
      setDiet((d) =>
        d
          ? { ...d, meals: d.meals.map((x) => (x.id === m.id ? updated : x)) }
          : d
      );
      setRecipeMeal(updated);
    } catch {
      setRecipeMeal(null);
      setErr("Não consegui gerar a receita. Tente de novo.");
    }
    setRecipeLoading(false);
  }

  const dayTot = diet
    ? sumItems(diet.meals.flatMap((m) => m.meal_items))
    : null;
  const accuracy =
    dayTot && t.kcal ? Math.round((dayTot.kcal / t.kcal) * 100) : 0;

  return (
    <>
      <Header
        title="Nutrição"
        sub={`${BIO[profile.biotype || ""]} · ${GOAL[profile.goal || ""]}`}
      />

      {/* metabolismo */}
      <div className="card pad">
        <span className="kicker">Avaliação metabólica</span>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <MetBox v={t.bmr} lbl="Metab. basal" />
          <MetBox v={t.tdee} lbl="Gasto total/dia" />
          <MetBox v={t.kcal} lbl="Meta calórica" hi />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[
            ["Proteína", t.protein, dist.p, "var(--prot)"],
            ["Carboidrato", t.carbs, dist.c, "var(--carb)"],
            ["Gordura", t.fat, dist.f, "var(--fat)"],
          ].map(([lbl, g, pc, color]) => (
            <div
              key={lbl as string}
              className="card2"
              style={{ flex: 1, padding: "10px 6px", textAlign: "center" }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: color as string,
                  margin: "0 auto 4px",
                }}
              />
              <div className="dsp" style={{ fontSize: 16 }}>
                {g as number}g
              </div>
              <div style={{ fontSize: 9.5, color: "var(--mut)", fontWeight: 600 }}>
                {lbl as string}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--dim)",
                  fontWeight: 700,
                  marginTop: 1,
                }}
              >
                {pc as number}% das kcal
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 11, lineHeight: 1.5 }}>
          Equação Mifflin-St Jeor · proteína{" "}
          {(t.protein / Number(profile.weight_kg)).toFixed(1)} g/kg · hidratação ~
          {water} L/dia.
        </p>
      </div>

      {!diet ? (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-acc" onClick={() => gerar("")} disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Gerar plano alimentar com IA
          </button>
          {err && (
            <p style={{ color: "var(--fat)", fontSize: 13, marginTop: 8 }}>{err}</p>
          )}
          {!busy && (
            <Empty
              icon={<Utensils size={26} />}
              text="A IA monta um plano profissional, com o peso exato de cada alimento e receitas com vídeo. Tudo nos horários da sua rotina."
            />
          )}
        </div>
      ) : (
        <>
          <div className="card pad" style={{ marginTop: 14 }}>
            <div className="row">
              <span className="kicker" style={{ color: "var(--acc)" }}>
                Plano alimentar
              </span>
              <span className="tag">{fmtDate(diet.generated_at)}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--mut)" }}>
              {profile.name} · {profile.weight_kg} kg · {GOAL[profile.goal || ""]}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 12,
              }}
            >
              <span className="dsp" style={{ fontSize: 36, color: "var(--acc)" }}>
                {dayTot!.kcal}
              </span>
              <span style={{ color: "var(--mut)", fontSize: 13 }}>
                kcal · meta {t.kcal}
              </span>
              <span className="tag acc" style={{ marginLeft: "auto" }}>
                {accuracy}% da meta
              </span>
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              <Macro
                lbl="Proteína"
                v={Math.round(dayTot!.p)}
                max={t.protein}
                color="var(--prot)"
              />
              <Macro
                lbl="Carboidrato"
                v={Math.round(dayTot!.c)}
                max={t.carbs}
                color="var(--carb)"
              />
              <Macro
                lbl="Gordura"
                v={Math.round(dayTot!.f)}
                max={t.fat}
                color="var(--fat)"
              />
            </div>
          </div>

          {diet.meals.map((m, mi) => {
            const mt = sumItems(m.meal_items);
            const hasRecipe = m.recipes && m.recipes.length > 0;
            return (
              <div
                key={m.id}
                className="card pad"
                style={{ marginTop: 12, opacity: m.done ? 0.6 : 1 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div className="mealnum">{mi + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dsp" style={{ fontSize: 16, lineHeight: 1.1 }}>
                      {m.name}
                    </div>
                    {m.time && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--mut)",
                          marginTop: 2,
                        }}
                      >
                        Horário sugerido · {m.time}
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={m.done}
                    onChange={() => toggleMeal(m)}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  {m.meal_items.map((i, k) => (
                    <div key={k} className="food">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              lineHeight: 1.25,
                            }}
                          >
                            {i.food}
                          </div>
                          {i.measure && (
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--dim)",
                                marginTop: 2,
                              }}
                            >
                              ≈ {i.measure}
                            </div>
                          )}
                        </div>
                        <span className="gram">
                          {i.grams ? i.grams + " g" : i.measure || "—"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "3px 12px",
                          marginTop: 7,
                          fontSize: 11,
                          color: "var(--mut)",
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ color: "var(--acc)" }}>{i.kcal} kcal</span>
                        <span>
                          <span
                            className="mdot"
                            style={{ background: "var(--prot)" }}
                          />
                          P {i.protein} g
                        </span>
                        <span>
                          <span
                            className="mdot"
                            style={{ background: "var(--carb)" }}
                          />
                          C {i.carbs} g
                        </span>
                        <span>
                          <span
                            className="mdot"
                            style={{ background: "var(--fat)" }}
                          />
                          G {i.fat} g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mtot">
                  <span className="kicker">Total da refeição</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'Archivo',sans-serif",
                    }}
                  >
                    <span style={{ color: "var(--acc)" }}>{mt.kcal} kcal</span>
                    <span style={{ color: "var(--mut)" }}>
                      {"  ·  "}P {Math.round(mt.p)} C {Math.round(mt.c)} G{" "}
                      {Math.round(mt.f)}
                    </span>
                  </span>
                </div>

                <button
                  className="btn btn-out btn-sm"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => openRecipe(m)}
                >
                  <ChefHat size={15} />{" "}
                  {hasRecipe ? "Ver receita" : "Gerar receita com IA"}
                </button>
              </div>
            );
          })}

          <div
            className="card2 pad"
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 22 }}>💧</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Hidratação diária
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 1 }}>
                ~35 ml por kg de peso corporal
              </div>
            </div>
            <span className="tag acc">{water} L</span>
          </div>

          {diet.tips && diet.tips.length > 0 && (
            <div className="card2 pad" style={{ marginTop: 12 }}>
              <span className="kicker">Orientações do nutricionista IA</span>
              <div
                style={{
                  marginTop: 9,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {diet.tips.map((tp, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--mut)",
                      lineHeight: 1.45,
                    }}
                  >
                    <Zap
                      size={14}
                      style={{
                        color: "var(--acc)",
                        flex: "0 0 auto",
                        marginTop: 2,
                      }}
                    />{" "}
                    {tp}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card pad" style={{ marginTop: 12 }}>
            <span className="kicker">Ajustar plano com IA</span>
            <input
              className="inp"
              style={{ marginTop: 8 }}
              placeholder="Ex: mais barato, sem frango, mais opções de café..."
              value={ajuste}
              onChange={(e) => setAjuste(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-acc btn-sm"
                style={{ flex: 1 }}
                onClick={() => gerar(ajuste)}
                disabled={busy || !ajuste.trim()}
              >
                {busy ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Sparkles size={14} />
                )}{" "}
                Ajustar
              </button>
              <button
                className="btn btn-out btn-sm"
                onClick={() => gerar("")}
                disabled={busy}
              >
                <RefreshCw size={14} /> Novo plano
              </button>
            </div>
            {err && (
              <p style={{ color: "var(--fat)", fontSize: 13, marginTop: 8 }}>
                {err}
              </p>
            )}
          </div>

          {recipeMeal && (
            <RecipeSheet
              meal={recipeMeal}
              loading={recipeLoading}
              onClose={() => setRecipeMeal(null)}
            />
          )}
        </>
      )}
    </>
  );
}

function RecipeSheet({
  meal,
  loading,
  onClose,
}: {
  meal: Meal;
  loading: boolean;
  onClose: () => void;
}) {
  const r = meal.recipes && meal.recipes[0];
  const m = sumItems(meal.meal_items);

  return (
    <Sheet title="Receita do nutricionista" onClose={onClose}>
      {loading || !r ? (
        <div style={{ textAlign: "center", padding: "44px 20px", color: "var(--mut)" }}>
          <Loader2 size={26} className="spin" style={{ color: "var(--acc)" }} />
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Criando uma receita para {meal.name.toLowerCase()}...
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{r.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="kicker" style={{ color: "var(--acc)" }}>
                {meal.name}
              </div>
              <div
                className="dsp"
                style={{ fontSize: 21, lineHeight: 1.1, marginTop: 3 }}
              >
                {r.title}
              </div>
            </div>
          </div>

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}
          >
            {r.prep_time && <span className="pill2">⏱ {r.prep_time}</span>}
            {r.difficulty && <span className="pill2">📊 {r.difficulty}</span>}
            {r.portions && <span className="pill2">🍽 {r.portions}</span>}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div className="mc">
              <span className="mcv" style={{ color: "var(--acc)" }}>
                {m.kcal}
              </span>
              <span className="mcl">🔥 kcal</span>
            </div>
            <div className="mc">
              <span className="mcv">{Math.round(m.p)}g</span>
              <span className="mcl">💪 proteína</span>
            </div>
            <div className="mc">
              <span className="mcv">{Math.round(m.c)}g</span>
              <span className="mcl">🌾 carbo.</span>
            </div>
            <div className="mc">
              <span className="mcv">{Math.round(m.f)}g</span>
              <span className="mcl">🥑 gordura</span>
            </div>
          </div>

          {/* video */}
          {r.video_id ? (
            <div style={{ marginTop: 16 }}>
              <span className="kicker">📺 Vídeo da receita</span>
              <div
                style={{
                  marginTop: 8,
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                  borderRadius: 13,
                  overflow: "hidden",
                  border: "1px solid var(--bd)",
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${r.video_id}`}
                  title={r.video_title || r.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                />
              </div>
            </div>
          ) : r.video_url ? (
            <a
              href={r.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-out btn-sm"
              style={{ width: "100%", marginTop: 14 }}
            >
              <Play size={15} /> Buscar vídeo no YouTube
            </a>
          ) : null}

          <div className="divd" />
          <span className="kicker">📋 Ingredientes</span>
          <div style={{ marginTop: 6 }}>
            {r.ingredients.map((ing, i) => (
              <div key={i} className="ing">
                <Check
                  size={15}
                  style={{ color: "var(--acc)", flex: "0 0 auto", marginTop: 1 }}
                />
                <span>{ing}</span>
              </div>
            ))}
          </div>

          <div className="divd" />
          <span className="kicker">👨‍🍳 Modo de preparo</span>
          <div style={{ marginTop: 6 }}>
            {r.steps.map((st, i) => (
              <div key={i} className="step">
                <span className="stepn">{i + 1}</span>
                <span>{st}</span>
              </div>
            ))}
          </div>

          {r.tip && (
            <div className="dica" style={{ marginTop: 16 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <p>
                <b style={{ color: "var(--tx)" }}>Dica do chef:</b> {r.tip}
              </p>
            </div>
          )}

          <button
            className="btn btn-acc"
            style={{ marginTop: 16 }}
            onClick={onClose}
          >
            <Check size={17} /> Entendi, fechar
          </button>
        </>
      )}
    </Sheet>
  );
}
