import type { Profile } from "./types";

export const BIO: Record<string, string> = {
  ecto: "Ectomorfo",
  meso: "Mesomorfo",
  endo: "Endomorfo",
};
export const GOAL: Record<string, string> = {
  cutting: "Emagrecimento",
  manutencao: "Manutenção",
  hipertrofia: "Hipertrofia",
};
export const EXP: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};
export const ACTIVITY: Record<string, string> = {
  sedentario: "Sedentário",
  leve: "Leve",
  moderado: "Moderado",
  intenso: "Intenso",
  atleta: "Atleta",
};

export interface Targets {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Mifflin-St Jeor ajustado por objetivo e biotipo. */
export function calcTargets(p: Partial<Profile>): Targets {
  const w = Number(p.weight_kg) || 70;
  const h = Number(p.height_cm) || 170;
  const a = Number(p.age) || 30;
  const bmr =
    p.sex === "F"
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;

  const af =
    { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, atleta: 1.9 }[
      p.activity || "moderado"
    ] || 1.55;
  const tdee = bmr * af;

  const gf =
    { cutting: 0.8, manutencao: 1, hipertrofia: 1.12 }[p.goal || "manutencao"] || 1;
  const kcal = Math.round((tdee * gf) / 10) * 10;

  const protKg =
    p.goal === "cutting" ? 2.2 : p.goal === "hipertrofia" ? 2.0 : 1.8;
  const protein = Math.round(w * protKg);
  const fat = Math.round(w * (p.biotype === "endo" ? 0.8 : 1.0));
  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  if (carbs < 0) carbs = 0;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    protein,
    carbs,
    fat,
  };
}

export function fmtDate(d: string): string {
  return new Date(d + "T00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
