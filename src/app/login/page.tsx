"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    if (!email.includes("@") || pass.length < 6) {
      setMsg("Informe um e-mail válido e senha de ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        const { error: e2 } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (e2) {
          setMsg("Conta criada! Confirme seu e-mail e faça login.");
          setMode("login");
          setLoading(false);
          return;
        }
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        router.push("/inicio");
      }
      router.refresh();
    } catch (e) {
      setMsg(
        e instanceof Error && e.message.includes("Invalid")
          ? "E-mail ou senha incorretos."
          : "Não foi possível concluir. Tente novamente."
      );
      setLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 70, paddingBottom: 40 }}>
      <div className="kicker" style={{ color: "var(--acc)" }}>
        Treino & Nutrição com IA
      </div>
      <div className="dsp" style={{ fontSize: 52, lineHeight: 1, marginTop: 6 }}>
        FORJA
      </div>
      <p style={{ color: "var(--mut)", marginTop: 10, fontSize: 14 }}>
        {mode === "login"
          ? "Entre para continuar treinando."
          : "Crie sua conta e monte seu plano completo."}
      </p>

      <div className="card pad" style={{ marginTop: 26 }}>
        <span className="lab">E-mail</span>
        <input
          className="inp"
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <span className="lab" style={{ marginTop: 14 }}>
          Senha
        </span>
        <input
          className="inp"
          type="password"
          placeholder="••••••••"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {msg && (
          <p style={{ color: "var(--carb)", fontSize: 13, marginTop: 10 }}>{msg}</p>
        )}
        <button
          className="btn btn-acc"
          style={{ marginTop: 16 }}
          onClick={submit}
          disabled={loading}
        >
          {loading && <Loader2 size={16} className="spin" />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 18,
          fontSize: 13,
          color: "var(--mut)",
        }}
      >
        {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMsg("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--acc)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {mode === "login" ? "Criar conta" : "Entrar"}
        </button>
      </p>
    </div>
  );
}
