import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { callAI, buildContext } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

    const { content } = await req.json();
    if (!content || !content.trim())
      return NextResponse.json({ error: "mensagem" }, { status: 400 });

    const [{ data: profile }, { data: routine }, { data: workouts }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("routine").select("*").eq("user_id", user.id).single(),
        supabase.from("workouts").select("name, focus").eq("user_id", user.id),
      ]);
    if (!profile) return NextResponse.json({ error: "perfil" }, { status: 400 });

    // salva a mensagem do usuario
    await supabase
      .from("coach_messages")
      .insert({ user_id: user.id, role: "user", content: content.trim() });

    // historico recente
    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    const msgs = (history || [])
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const ctx = buildContext(profile, routine);
    const wk =
      workouts && workouts.length
        ? workouts.map((w) => `${w.name} (${w.focus})`).join("; ")
        : "nenhum treino montado";
    const sys =
      `Voce e o Coach FORJA: personal trainer e nutricionista esportivo brasileiro, ` +
      `motivador, direto e tecnico. Respostas curtas e praticas (no maximo 6 frases), ` +
      `em portugues do Brasil. Use o perfil e a rotina do aluno. ` +
      `PERFIL: ${ctx} TREINOS ATUAIS: ${wk}. ` +
      `Se perguntarem algo medico serio, recomende procurar um profissional de saude.`;

    const reply = await callAI(msgs, sys);

    await supabase
      .from("coach_messages")
      .insert({ user_id: user.id, role: "assistant", content: reply });

    return NextResponse.json({ reply });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Falha ao responder" },
      { status: 500 }
    );
  }
}
