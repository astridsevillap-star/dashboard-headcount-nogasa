"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";

/* ---------- Botones ---------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium transition-all active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-45";
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-9.5 px-4 text-sm",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary:
      "border border-line bg-surface text-ink-700 hover:border-ink-300 hover:text-ink-900",
    ghost: "text-ink-500 hover:bg-line-soft hover:text-ink-900",
    danger: "border border-danger-600/30 bg-surface text-danger-600 hover:bg-danger-50",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

/* ---------- Campos ---------- */

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9.5 rounded-[8px] border border-line bg-surface px-3 pr-8 text-sm text-ink-900 transition-colors hover:border-ink-300 ${className}`}
      {...props}
    />
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9.5 rounded-[8px] border border-line bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-600 ${className}`}
      {...props}
    />
  );
}

/* ---------- Control segmentado ---------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex h-9.5 items-center gap-0.5 rounded-[8px] border border-line bg-line-soft p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`h-full rounded-[6px] px-3 text-[13px] font-medium transition-all ${
            value === o.value
              ? "bg-surface text-ink-900 shadow-[0_1px_2px_rgba(23,23,26,0.08)]"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Estados ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-ink-300 bg-surface px-6 py-16 text-center">
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Toast ---------- */

export type ToastMsg = {
  id: number;
  kind: "ok" | "error";
  text: string;
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const push = useCallback((kind: "ok" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  return { toasts, push, dismiss };
}

export function ToastStack({
  toasts,
  dismiss,
}: {
  toasts: ToastMsg[];
  dismiss: (id: number) => void;
}) {
  if (toasts.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
}

function Toast({
  toast,
  dismiss,
}: {
  toast: ToastMsg;
  dismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div className="fade-rise pointer-events-auto flex items-start gap-2.5 rounded-[12px] border border-line bg-surface p-3.5 shadow-[0_8px_24px_rgba(23,23,26,0.10)]">
      {toast.kind === "ok" ? (
        <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-ok-600" />
      ) : (
        <WarningCircle size={18} weight="fill" className="mt-px shrink-0 text-danger-600" />
      )}
      <p className="flex-1 text-[13px] leading-snug text-ink-700">{toast.text}</p>
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-ink-400 hover:text-ink-700"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
