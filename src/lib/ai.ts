import type { Profile, Routine } from "./types";
import { calcTargets, BIO, GOAL, EXP, ACTIVITY } from "./calc";

// Groq usa a API compativel com OpenAI. Modelos: console.groq.com/docs/models
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Chama a API da Groq (gratuita). A chave fica somente no servidor. */
export async function callAI(messages: Msg[], system: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY ausente");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Groq API: " + res.status + " " + txt);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Extrai o primeiro objeto/array JSON valido de um texto. */
export function extractJSON<T = unknown>(text: string): T {
  const t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  const s = starts.length ? Math.min(...starts) : -1;
  const e = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (s < 0 || e < 0) throw new Error("Resposta da IA sem JSON valido");
  return JSON.parse(t.slice(s, e + 1)) as T;
}

/** Resumo textual do perfil + rotina, injetado nos prompts da IA. */
export function buildContext(p: Profile, r: Routine | null): string {
  const t = calcTargets(p);
  let ctx =
    `Paciente: ${p.name}. Sexo: ${p.sex === "F" ? "feminino" : "masculino"}. ` +
    `Idade: ${p.age}. Altura: ${p.height_cm}cm. Peso: ${p.weight_kg}kg. ` +
    `Biotipo: ${BIO[p.biotype || ""]}. Objetivo: ${GOAL[p.goal || ""]}. ` +
    `Experiencia de treino: ${EXP[p.experience || ""]}. ` +
    `Nivel de atividade: ${ACTIVITY[p.activity || ""]}. ` +
    `Treina ${p.days_per_week}x/semana. ` +
    `Restricoes alimentares: ${p.restrictions || "nenhuma"}. ` +
    `Metas diarias: ${t.kcal}kcal, ${t.protein}g proteina, ${t.carbs}g carboidrato, ${t.fat}g gordura.`;

  if (r) {
    ctx += ` ROTINA: acorda ${r.wake_time}, dorme ${r.sleep_time}.`;
    if (r.works && r.work_start && r.work_end) {
      ctx += ` Trabalha das ${r.work_start} as ${r.work_end}.`;
    } else {
      ctx += " Nao tem horario fixo de trabalho.";
    }
    ctx +=
      ` Treina por volta das ${r.training_time}, ` +
      `com cerca de ${r.training_duration} minutos disponiveis.`;
    if (Array.isArray(r.meal_times) && r.meal_times.length) {
      ctx +=
        " Horarios disponiveis para refeicoes: " +
        r.meal_times.map((m) => `${m.label} ${m.time}`).join(", ") +
        ".";
    }
    if (r.notes) ctx += ` Observacoes da rotina: ${r.notes}.`;
  }
  return ctx;
}
