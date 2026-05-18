import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { callAI, extractJSON, buildContext } from "@/lib/ai";
import { calcTargets } from "@/lib/calc";

export const maxDuration = 60;

interface GenItem {
  food: string;
  g: number;
  med: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
}
interface GenMeal {
  name: string;
  time: string;
  items: GenItem[];
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const extra: string = body.extra || "";

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

    const t = calcTargets(profile);
    const ctx = buildContext(profile, routine);
    const mealHint =
      routine?.meal_times && routine.meal_times.length
        ? `Use exatamente estas refeicoes e horarios da rotina do paciente: ${routine.meal_times
            .map((m: { label: string; time: string }) => `${m.label} (${m.time})`)
            .join(", ")}.`
        : "Use 5 refeicoes: Cafe da manha, Lanche da manha, Almoco, Lanche da tarde, Jantar.";

    const sys =
      "Voce e um nutricionista esportivo brasileiro registrado. Responda SEMPRE apenas com JSON valido e compacto, sem markdown e sem texto fora do JSON.";
    const msg =
      `Monte um plano alimentar profissional de 1 dia para: ${ctx} ${mealHint} ` +
      `REGRAS: (1) os totais do dia devem ficar a no maximo 5% das metas de calorias e proteina; ` +
      `(2) CADA alimento DEVE ter o peso exato em GRAMAS da porcao pronta no campo "g" (inteiro) e uma medida caseira no campo "med"; ` +
      `(3) alimentos comuns e acessiveis no Brasil; (4) 2 a 4 alimentos por refeicao. ` +
      (extra ? `Ajuste solicitado: ${extra}. ` : "") +
      `Formato JSON: {"meals":[{"name":"Cafe da manha","time":"07:00","items":[{"food":"Ovo inteiro","g":100,"med":"2 unidades grandes","kcal":143,"p":13,"c":1,"f":10}]}],"tips":["orientacao 1","orientacao 2","orientacao 3"]}`;

    const raw = await callAI([{ role: "user", content: msg }], sys);
    const j = extractJSON<{ meals: GenMeal[]; tips: string[] }>(raw);
    const meals = j.meals || [];
    if (!meals.length) throw new Error("vazio");

    // desativa dietas anteriores
    await supabase
      .from("diets")
      .update({ is_active: false })
      .eq("user_id", user.id);

    const { data: diet } = await supabase
      .from("diets")
      .insert({
        user_id: user.id,
        target_kcal: t.kcal,
        target_protein: t.protein,
        target_carbs: t.carbs,
        target_fat: t.fat,
        tips: j.tips || [],
        is_active: true,
      })
      .select("id")
      .single();
    if (!diet) throw new Error("diet");

    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      const { data: meal } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          diet_id: diet.id,
          name: m.name,
          time: m.time || "",
          position: i,
        })
        .select("id")
        .single();
      if (!meal) continue;
      const items = (m.items || []).map((it, idx) => ({
        user_id: user.id,
        meal_id: meal.id,
        food: it.food,
        grams: Math.round(Number(it.g) || 0),
        measure: it.med || "",
        kcal: Math.round(Number(it.kcal) || 0),
        protein: Number(it.p) || 0,
        carbs: Number(it.c) || 0,
        fat: Number(it.f) || 0,
        position: idx,
      }));
      if (items.length) await supabase.from("meal_items").insert(items);
    }

    return NextResponse.json({ ok: true, diet_id: diet.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Falha ao gerar a dieta" },
      { status: 500 }
    );
  }
}
