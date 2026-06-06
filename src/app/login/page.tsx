"use client";

import { useEffect, useState } from "react";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      setMsg("Não foi possível entrar com Google. Tente novamente.");
    }
  }, []);

  async function submit() {
    setMsg("");

    if (!email.includes("@") || pass.length < 6) {
      setMsg("Informe um e-mail válido e senha de ao menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });

        if (error) throw error;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (signInError) {
          setMsg("Conta criada! Confirme seu e-mail e depois faça login.");
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
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      setMsg(
        message.includes("invalid") || message.includes("credentials")
          ? "E-mail ou senha incorretos."
          : message.includes("already") || message.includes("registered")
          ? "Esse e-mail já está cadastrado. Tente entrar."
          : "Não foi possível concluir. Tente novamente."
      );
      setLoading(false);
    }
  }

  async function entrarComGoogle() {
    setMsg("");
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/inicio`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setMsg("Não foi possível abrir o login com Google. Verifique a configuração no Supabase.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 52, paddingBottom: 40 }}>
      <div style={{ textAlign: "center" }}>
        <img src="/icone.png" alt="Forja Fit" className="brand-icon" />
        <div className="kicker" style={{ color: "var(--acc)" }}>
          Treino & Nutrição com IA
        </div>
        <div className="dsp" style={{ fontSize: 52, lineHeight: 1, marginTop: 6 }}>
          FORJA FIT
        </div>
        <p style={{ color: "var(--mut)", marginTop: 10, fontSize: 14 }}>
          {mode === "login"
            ? "Entre para continuar treinando."
            : "Crie sua conta e monte seu plano completo."}
        </p>
      </div>

      <div className="card pad" style={{ marginTop: 26 }}>
        <button
          className="btn btn-out"
          onClick={entrarComGoogle}
          disabled={googleLoading || loading}
          type="button"
        >
          {googleLoading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.8-3.4-11.4-8.1L6.1 33C9.4 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
          )}
          Continuar com Google
        </button>

        <div className="auth-divider">ou</div>

        <span className="lab">E-mail</span>
        <input
          className="inp"
          type="email"
          placeholder="voce@email.com"
          value={email}
          autoComplete="email"
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
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {msg && (
          <p style={{ color: "var(--carb)", fontSize: 13, marginTop: 10, lineHeight: 1.45 }}>
            {msg}
          </p>
        )}

        <button
          className="btn btn-acc"
          style={{ marginTop: 16 }}
          onClick={submit}
          disabled={loading || googleLoading}
          type="button"
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
          type="button"
        >
          {mode === "login" ? "Criar conta" : "Entrar"}
        </button>
      </p>
    </div>
  );
}
