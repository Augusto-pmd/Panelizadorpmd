import React from "react";
import { C } from "./lib/engine";

// ============================================================
// Sistema de componentes UI — lenguaje visual del Panelizador PMD
// Presentacionales puros (sin lógica de dominio).
// ============================================================

const SHADOW = "0 1px 2px rgba(16,32,43,.04), 0 2px 8px rgba(16,32,43,.05)";

// ---- Tarjeta ----
export function Card({ className = "", style, children, ...rest }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: SHADOW, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- Botón con variantes ----
const BTN_VARIANTS = {
  primary: { background: C.blue, color: "#fff", border: `1px solid ${C.blue}` },
  dark: { background: C.chrome, color: "#fff", border: `1px solid ${C.chrome}` },
  success: { background: C.green, color: "#fff", border: `1px solid ${C.green}` },
  ghost: { background: "#fff", color: C.ink, border: `1px solid ${C.line}` },
  soft: { background: C.blueSoft, color: C.blueDark, border: `1px solid transparent` },
  danger: { background: "#fff", color: C.red, border: `1px solid ${C.red}` },
};

export function Btn({ variant = "ghost", size = "md", className = "", style, children, ...rest }) {
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.ghost;
  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : size === "lg" ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-sm";
  return (
    <button
      className={`rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 ${pad} ${className}`}
      style={{ ...v, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- Botón de herramienta (icono + etiqueta, con estado activo) ----
export function ToolButton({ icon, label, active, color = C.blue, hint, className = "", ...rest }) {
  return (
    <button
      data-tip={hint}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold select-none ${className}`}
      style={{
        background: active ? color : "#fff",
        color: active ? "#fff" : C.ink,
        border: `1px solid ${active ? color : C.line}`,
        boxShadow: active ? "0 2px 10px rgba(16,32,43,.14)" : "none",
      }}
      {...rest}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ---- Botón ícono compacto (controles flotantes del canvas) ----
export function IconBtn({ icon, hint, active, className = "", style, ...rest }) {
  return (
    <button
      data-tip={hint}
      className={`grid place-items-center rounded-lg ${className}`}
      style={{
        width: 36, height: 36,
        background: active ? C.blue : "#fff",
        color: active ? "#fff" : C.ink,
        border: `1px solid ${active ? C.blue : C.line}`,
        boxShadow: SHADOW, fontSize: 16,
        ...style,
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}

// ---- Estadística (número grande + etiqueta) ----
export function Stat({ value, label, accent }) {
  return (
    <Card className="px-3 py-2.5 text-center">
      <div className="text-xl font-extrabold font-mono" style={{ color: accent || C.ink, letterSpacing: "-0.01em" }}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: C.gray }}>{label}</div>
    </Card>
  );
}

// ---- Título de sección ----
export function SectionTitle({ children, count, right }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-sm font-bold" style={{ color: C.ink }}>{children}</h3>
      {count != null && (
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.blueSoft, color: C.blueDark }}>{count}</span>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

// ---- Chip / badge ----
export function Chip({ children, color = C.gray, soft = true, className = "", style }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}
      style={soft
        ? { background: `${color}1A`, color, ...style }
        : { background: color, color: "#fff", ...style }}
    >
      {children}
    </span>
  );
}

// ---- Campo con etiqueta (label arriba) ----
export function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium" style={{ color: C.gray }}>{label}</span>
      {children}
    </label>
  );
}

// ---- Input numérico estilizado ----
export function NumInput({ className = "", style, ...rest }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`px-2 py-1.5 rounded-lg text-sm font-mono ${className}`}
      style={{ border: `1px solid ${C.line}`, color: C.ink, ...style }}
      {...rest}
    />
  );
}
