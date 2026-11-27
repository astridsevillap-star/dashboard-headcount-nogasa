"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

/** Selector con casillas: sin selección equivale a "todas". */
export function MultiSelect({
  options,
  value,
  onChange,
  allLabel,
  ariaLabel,
  className = "",
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  allLabel: string;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const label =
    value.length === 0 || value.length === options.length
      ? allLabel
      : value.length === 1
        ? value[0]
        : `${value.length} empresas`;

  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="flex h-9.5 w-full items-center justify-between gap-2 rounded-[8px] border border-line bg-surface px-3 text-sm text-ink-900 transition-colors hover:border-ink-300"
      >
        <span className="truncate">{label}</span>
        <CaretDown size={14} className="shrink-0 text-ink-500" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 min-w-[230px] rounded-[8px] border border-line bg-surface p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full rounded px-2 py-1.5 text-left text-[13px] text-ink-700 hover:bg-line-soft"
          >
            {allLabel}
          </button>
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-ink-900 hover:bg-line-soft"
            >
              <input
                type="checkbox"
                checked={value.includes(o)}
                onChange={() => toggle(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
