import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { callAI, extractJSON, buildContext } from "@/lib/ai";
import { EXP } from "@/lib/calc";

export const maxDuration = 60;

interface GenExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
}
interface GenPlan {
  name: string;
  focus: string;
  exercises: GenExercise[];
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const { data: routine } = await supabase
      .from("routine")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "perfil" }, { status: 400 });

    const ctx = buildContext(profile, routine);
    const sys =
      "Voce e um personal trainer brasileiro experiente. Responda SEMPRE apenas com JSON valido e compacto, sem markdown e sem texto fora do JSON.";
    const msg =
      `Crie uma divisao de treino de academia com exatamente ${profile.days_per_week} dia(s) para: ${ctx} ` +
      `Considere o tempo disponivel de treino informado na rotina. ` +
      `Cada dia: nome curto, foco muscular e 5 a 7 exercicios adequados ao nivel ${EXP[profile.experience] || ""}. ` +
      `Formato JSON: {"plans":[{"name":"Treino A","focus":"Peito e Triceps","exercises":[{"name":"Supino reto com barra","sets":4,"reps":"8-12","rest":"90s"}]}]}`;

    const raw = await callAI([{ role: "user", content: msg }], sys);
    const j = extractJSON<{ plans: GenPlan[] }>(raw);
    const plans = j.plans || [];
    if (!plans.length) throw new Error("vazio");

    // substitui os treinos atuais
    await supabase.from("workouts").delete().eq("user_id", user.id);

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const { data: w } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          name: p.name,
          focus: p.focus || "",
          position: i,
        })
        .select("id")
        .single();
      if (!w) continue;
      const exercises = (p.exercises || []).map((e, idx) => ({
        user_id: user.id,
        workout_id: w.id,
        name: e.name,
        sets: Number(e.sets) || 3,
        reps: e.reps || "10-12",
        rest: e.rest || "60s",
        position: idx,
      }));
      if (exercises.length) await supabase.from("exercises").insert(exercises);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Falha ao gerar o treino" },
      { status: 500 }
    );
  }
}
