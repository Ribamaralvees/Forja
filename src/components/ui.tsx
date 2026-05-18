"use client";
import { X, Loader2 } from "lucide-react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "44px 20px", color: "var(--mut)" }}>
      <Loader2 size={26} className="spin" style={{ color: "var(--acc)" }} />
      {label && <p style={{ fontSize: 13, marginTop: 12 }}>{label}</p>}
    </div>
  );
}

export function FullSpinner() {
  return (
    <div className="center" style={{ minHeight: "100vh" }}>
      <Loader2 size={26} className="spin" style={{ color: "var(--acc)" }} />
    </div>
  );
}

export function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="dsp" style={{ fontSize: 28 }}>
        {title}
      </div>
      {sub && (
        <div className="kicker" style={{ marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Empty({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--dim)" }}>
      <div className="center" style={{ marginBottom: 10 }}>
        {icon}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--surf)",
            padding: "16px 18px 12px",
            borderBottom: "1px solid var(--bd)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <span className="dsp" style={{ fontSize: 18 }}>
            {title}
          </span>
          <X
            size={22}
            style={{ color: "var(--mut)", cursor: "pointer" }}
            onClick={onClose}
          />
        </div>
        <div style={{ padding: "16px 18px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

interface Action {
  label: string;
  kind?: "acc" | "out" | "danger";
  onClick: () => void;
}

export function ConfirmModal({
  icon,
  title,
  msg,
  actions,
}: {
  icon?: React.ReactNode;
  title: string;
  msg: string;
  actions: Action[];
}) {
  return (
    <div className="modal-bg">
      <div className="modal">
        {icon && (
          <div
            className="center"
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: "var(--surf3)",
              color: "var(--acc)",
              marginBottom: 14,
            }}
          >
            {icon}
          </div>
        )}
        <div className="dsp" style={{ fontSize: 19 }}>
          {title}
        </div>
        <p
          style={{
            color: "var(--mut)",
            fontSize: 14,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
          {actions.map((a, i) => (
            <button
              key={i}
              className={
                "btn " +
                (a.kind === "acc"
                  ? "btn-acc"
                  : a.kind === "danger"
                  ? "btn-danger"
                  : "btn-out")
              }
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
