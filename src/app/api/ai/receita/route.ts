import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { callAI, extractJSON } from "@/lib/ai";
import { searchYouTube } from "@/lib/youtube";

export const maxDuration = 60;

interface GenRecipe {
  emoji: string;
  title: string;
  time: string;
  difficulty: string;
  portions: string;
  ingredients: string[];
  steps: string[];
  tip: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

    const { meal_id } = await req.json();
    if (!meal_id)
      return NextResponse.json({ error: "meal_id" }, { status: 400 });

    const { data: meal } = await supabase
      .from("meals")
      .select("id, name, meal_items(food, grams)")
      .eq("id", meal_id)
      .single();
    if (!meal) return NextResponse.json({ error: "refeicao" }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("restrictions")
      .eq("id", user.id)
      .single();

    const itens = (meal.meal_items || [])
      .map((i: { food: string; grams: number }) =>
        i.grams ? `${i.food} (${i.grams} g)` : i.food
      )
      .join(", ");

    const sys =
      "Voce e um chef de cozinha fitness brasileiro. Responda SEMPRE apenas com JSON valido e compacto, sem markdown e sem texto fora do JSON.";
    const msg =
      `Crie uma receita pratica, saborosa e fitness para a refeicao "${meal.name}", ` +
      `usando como base estes alimentos e pesos: ${itens}. ` +
      `Restricoes do paciente: ${profile?.restrictions || "nenhuma"}. ` +
      `Receita facil, rapida, ingredientes acessiveis no Brasil, com quantidades claras. ` +
      `Formato JSON: {"emoji":"🍳","title":"Nome apetitoso","time":"10 min","difficulty":"Facil","portions":"1 porcao","ingredients":["3 ovos inteiros"],"steps":["Passo 1"],"tip":"dica curta"}`;

    const raw = await callAI([{ role: "user", content: msg }], sys);
    const r = extractJSON<GenRecipe>(raw);

    const video = await searchYouTube(r.title || meal.name);

    const recipe = {
      user_id: user.id,
      meal_id: meal.id,
      emoji: r.emoji || "🍽️",
      title: r.title || meal.name,
      prep_time: r.time || "",
      difficulty: r.difficulty || "",
      portions: r.portions || "1 porção",
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
      tip: r.tip || "",
      video_id: video.video_id,
      video_title: video.video_title,
      video_url: video.video_url,
    };

    const { data: saved } = await supabase
      .from("recipes")
      .upsert(recipe, { onConflict: "meal_id" })
      .select("*")
      .single();

    return NextResponse.json({ recipe: saved });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Falha ao gerar a receita" },
      { status: 500 }
    );
  }
}
