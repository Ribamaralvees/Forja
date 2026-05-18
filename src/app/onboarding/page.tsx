"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

function Field({
  label,
  children,
  flex,
}: {
  label: string;
  children: React.ReactNode;
  flex?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16, flex: flex ? 1 : undefined }}>
      <span className="lab">{label}</span>
      {children}
    </div>
  );
}
function ChipRow({
  value,
  set,
  opts,
}: {
  value: string;
  set: (v: string) => void;
  opts: [string, string][];
}) {
  return (
    <div className="chips">
      {opts.map(([v, l]) => (
        <div
          key={v}
          className={"chip" + (value === v ? " on" : "")}
          onClick={() => set(v)}
        >
          {l}
        </div>
      ))}
    </div>
  );
}
function ChipCol({
  value,
  set,
  opts,
}: {
  value: string;
  set: (v: string) => void;
  opts: [string, string, string][];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {opts.map(([v, l, s]) => (
        <div
          key={v}
          className={"chip" + (value === v ? " on" : "")}
          style={{ textAlign: "left", padding: "12px 14px" }}
          onClick={() => set(v)}
        >
          {l}
          <span className="sub">{s}</span>
        </div>
      ))}
    </div>
  );
}

/** Extrai uma mensagem legível de qualquer formato de erro do Supabase. */
function describeError(e: unknown): string {
  if (!e) return "Erro desconhecido.";
  if (typeof e === "string") return e;
  const o = e as Record<string, unknown>;
  const parts: string[] = [];
  if (o.message) parts.push(String(o.message));
  if (o.details) parts.push(String(o.details));
  if (o.hint) parts.push("Dica: " + String(o.hint));
  if (o.code) parts.push("Código: " + String(o.code));
  if (parts.length) return parts.join(" · ");
  try {
    const s = JSON.stringify(e, Object.getOwnPropertyNames(o));
    if (s && s !== "{}") return s;
  } catch {
    /* ignora */
  }
  return (
    "Não foi possível conectar ao Supabase. Verifique sua internet, se o " +
    "projeto não está pausado e se as variáveis NEXT_PUBLIC_SUPABASE_URL e " +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY estão corretas no .env.local."
  );
}

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [d, setD] = useState({
    name: "",
    sex: "M",
    age: "",
    height: "",
    weight: "",
    biotype: "",
    goal: "",
    experience: "",
    days: 4,
    activity: "moderado",
    restrictions: "",
  });
  const up = (k: string, v: string | number) => setD((p) => ({ ...p, [k]: v }));

  const ok = [
    d.name.trim() !== "" && +d.age >= 12 && +d.age <= 100,
    +d.height >= 120 && +d.weight >= 30 && d.biotype !== "",
    d.goal !== "" && d.experience !== "",
    true,
  ];
  const last = step === 3;

  async function finish() {
    setErr("");

    // 1) Garante que as variaveis do Supabase foram carregadas no navegador.
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setErr(
        "As variáveis do Supabase não foram carregadas. Crie ou edite o " +
          "arquivo .env.local na raiz do projeto e REINICIE o servidor " +
          "(pare e rode npm run dev de novo)."
      );
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2) upsert: cria o perfil se ainda nao existir, ou atualiza.
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          name: d.name.trim(),
          sex: d.sex,
          age: +d.age,
          height_cm: +d.height,
          weight_kg: +d.weight,
          biotype: d.biotype,
          goal: d.goal,
          experience: d.experience,
          activity: d.activity,
          days_per_week: d.days,
          restrictions: d.restrictions,
        },
        { onConflict: "id" }
      );
      if (error) {
        console.warn("Falha ao salvar perfil:", error);
        setErr(describeError(error));
        setSaving(false);
        return;
      }

      // 3) Garante uma linha de rotina (caso o gatilho nao tenha rodado).
      await supabase
        .from("routine")
        .upsert(
          { user_id: user.id },
          { onConflict: "user_id", ignoreDuplicates: true }
        );

      // 4) Registra o peso inicial.
      await supabase.from("weight_logs").upsert(
        { user_id: user.id, weight_kg: +d.weight },
        { onConflict: "user_id,date" }
      );

      router.push("/inicio");
      router.refresh();
    } catch (e) {
      console.warn("Erro inesperado no onboarding:", e);
      setErr(describeError(e));
      setSaving(false);
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ marginBottom: 26 }}>
        <div className="kicker" style={{ color: "var(--acc)" }}>
          Vamos montar seu perfil
        </div>
        <div className="dsp" style={{ fontSize: 30, marginTop: 6 }}>
          Bem-vindo à FORJA
        </div>
        <p style={{ color: "var(--mut)", marginTop: 8, fontSize: 14 }}>
          Esses dados deixam seus treinos e dieta totalmente personalizados.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 3,
              background: i <= step ? "var(--acc)" : "var(--surf3)",
            }}
          />
        ))}
      </div>

      <div className="card pad">
        {step === 0 && (
          <>
            <div className="dsp" style={{ fontSize: 22, marginBottom: 16 }}>
              Quem é você?
            </div>
            <Field label="Nome">
              <input
                className="inp"
                placeholder="Seu nome"
                value={d.name}
                onChange={(e) => up("name", e.target.value)}
              />
            </Field>
            <Field label="Sexo biológico">
              <ChipRow
                value={d.sex}
                set={(v) => up("sex", v)}
                opts={[
                  ["M", "Masculino"],
                  ["F", "Feminino"],
                ]}
              />
            </Field>
            <Field label="Idade">
              <input
                className="inp"
                inputMode="numeric"
                placeholder="anos"
                value={d.age}
                onChange={(e) => up("age", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <div className="dsp" style={{ fontSize: 22, marginBottom: 16 }}>
              Seu corpo
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Field label="Altura (cm)" flex>
                <input
                  className="inp"
                  inputMode="numeric"
                  placeholder="175"
                  value={d.height}
                  onChange={(e) => up("height", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="Peso (kg)" flex>
                <input
                  className="inp"
                  inputMode="decimal"
                  placeholder="74"
                  value={d.weight}
                  onChange={(e) =>
                    up("weight", e.target.value.replace(/[^\d.]/g, ""))
                  }
                />
              </Field>
            </div>
            <Field label="Biotipo">
              <ChipCol
                value={d.biotype}
                set={(v) => up("biotype", v)}
                opts={[
                  ["ecto", "Ectomorfo", "Magro, dificuldade de ganhar peso"],
                  ["meso", "Mesomorfo", "Atlético, ganha massa com facilidade"],
                  ["endo", "Endomorfo", "Acumula gordura com facilidade"],
                ]}
              />
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <div className="dsp" style={{ fontSize: 22, marginBottom: 16 }}>
              Seu objetivo
            </div>
            <Field label="O que você quer?">
              <ChipCol
                value={d.goal}
                set={(v) => up("goal", v)}
                opts={[
                  ["cutting", "Emagrecer", "Perder gordura mantendo músculo"],
                  ["hipertrofia", "Ganhar massa", "Hipertrofia e força"],
                  ["manutencao", "Manter / recompor", "Equilíbrio e saúde"],
                ]}
              />
            </Field>
            <Field label="Experiência de treino">
              <ChipRow
                value={d.experience}
                set={(v) => up("experience", v)}
                opts={[
                  ["iniciante", "Iniciante"],
                  ["intermediario", "Intermediário"],
                  ["avancado", "Avançado"],
                ]}
              />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <div className="dsp" style={{ fontSize: 22, marginBottom: 16 }}>
              Rotina
            </div>
            <Field label={`Dias de treino por semana: ${d.days}`}>
              <input
                type="range"
                min={1}
                max={6}
                value={d.days}
                onChange={(e) => up("days", +e.target.value)}
                style={{ width: "100%", accentColor: "var(--acc)" }}
              />
            </Field>
            <Field label="Nível de atividade no dia a dia">
              <ChipCol
                value={d.activity}
                set={(v) => up("activity", v)}
                opts={[
                  ["sedentario", "Sedentário", "Trabalho parado, pouca caminhada"],
                  ["leve", "Leve", "Caminha um pouco no dia"],
                  ["moderado", "Moderado", "Ativo, em pé boa parte do dia"],
                  ["intenso", "Intenso", "Trabalho físico ou muito ativo"],
                ]}
              />
            </Field>
            <Field label="Restrições alimentares (opcional)">
              <input
                className="inp"
                placeholder="Ex: sem lactose, vegetariano..."
                value={d.restrictions}
                onChange={(e) => up("restrictions", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {step > 0 && (
          <button
            className="btn btn-out"
            style={{ width: "auto" }}
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          className="btn btn-acc"
          disabled={!ok[step] || saving}
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
        >
          {saving && <Loader2 size={16} className="spin" />}
          {last ? "Concluir" : "Continuar"}
          {!last && <ChevronRight size={18} />}
        </button>
      </div>

      {err && (
        <div
          className="card pad"
          style={{
            marginTop: 14,
            borderColor: "rgba(255,125,77,.35)",
            background: "rgba(255,125,77,.08)",
          }}
        >
          <div
            className="kicker"
            style={{ color: "var(--fat)", marginBottom: 6 }}
          >
            Não foi possível salvar
          </div>
          <p style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.5 }}>
            {err}
          </p>
          <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 8, lineHeight: 1.5 }}>
            Verifique se você executou o arquivo <b>supabase/schema.sql</b>{" "}
            completo no SQL Editor do Supabase.
          </p>
        </div>
      )}
    </div>
  );
}
