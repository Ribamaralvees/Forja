"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { FullSpinner } from "@/components/ui";
import type { CoachMessage } from "@/lib/types";

const SUGESTOES = [
  "Como acelerar meu ganho de massa?",
  "Posso treinar em jejum?",
  "Sugira um lanche pré-treino prático",
  "Estou estagnado no peso, o que fazer?",
];

export default function CoachPage() {
  const supabase = createClient();
  const [msgs, setMsgs] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("coach_messages")
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        setMsgs((data as CoachMessage[]) || []);
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content:
            j.reply ||
            "Desculpe, não consegui responder agora. Tente novamente em instantes.",
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: "Erro de conexão. Verifique sua internet e tente de novo.",
        },
      ]);
    }
    setSending(false);
  }

  if (!ready) return <FullSpinner />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          className="center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "var(--surf3)",
            color: "var(--acc)",
            flex: "0 0 auto",
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <div className="dsp" style={{ fontSize: 22 }}>
            Coach IA
          </div>
          <div className="kicker" style={{ marginTop: 1 }}>
            Personal & nutricionista
          </div>
        </div>
      </div>

      {msgs.length === 0 && !sending && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.55 }}>
            Olá! Sou seu Coach FORJA. Conheço seu perfil, sua rotina e seus
            treinos — pergunte o que quiser sobre treino, dieta e recuperação.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 13,
            }}
          >
            {SUGESTOES.map((s) => (
              <button
                key={s}
                className="card2 pad"
                onClick={() => send(s)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13.5,
                  padding: "11px 13px",
                  color: "var(--tx)",
                }}
              >
                <Sparkles
                  size={13}
                  style={{
                    color: "var(--acc)",
                    display: "inline",
                    marginRight: 7,
                    verticalAlign: "-1px",
                  }}
                />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} className={"bub " + (m.role === "user" ? "u" : "a")}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="bub a" style={{ color: "var(--mut)" }}>
            <Loader2
              size={14}
              className="spin"
              style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }}
            />
            Coach está digitando...
          </div>
        )}
      </div>
      <div ref={endRef} style={{ height: 92 }} />

      {/* composer fixo acima da navegação */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 68,
          zIndex: 45,
          background: "rgba(13,15,9,.97)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--bd)",
        }}
      >
        <div
          className="wrap"
          style={{ display: "flex", gap: 8, padding: "12px 18px" }}
        >
          <input
            className="inp"
            placeholder="Pergunte ao seu coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-acc"
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            style={{ width: 50, height: 50, flex: "0 0 auto", padding: 0 }}
          >
            {sending ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
