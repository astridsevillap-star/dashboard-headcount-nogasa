"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import type { EmployeeRow } from "@/lib/types";
import { fmtDate, num, parsePeriod, periodLabel } from "@/lib/format";
import { Skeleton, TextInput } from "./ui";
import { useAdmin } from "@/lib/use-admin";

/** Filtro del detalle: cada dimensión acepta varios valores originales
 *  (los nombres históricos agrupados por las reglas de homologación). */
export type DrawerFilter = {
  period: string;
  label: string;
  dotacion?: string[];
  categoria?: string[];
  cargo?: string[];
};

export function DetailDrawer({
  filter,
  empresa,
  onClose,
}: {
  filter: DrawerFilter | null;
  empresa: string | null;
  onClose: () => void;
}) {
  const isAdmin = useAdmin();
  const [rows, setRows] = useState<EmployeeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!filter || !isAdmin) return;
    setRows(null);
    setError(null);
    setQ("");
    let cancelled = false;

    (async () => {
      let query = supabase
        .from("headcount_records")
        .select(
          "id, period, empresa, dni, nombre, cargo, area, division, categoria, dotacion, gerencia, fecha_ingreso, fecha_cese"
        )
        .eq("period", filter.period)
        .order("nombre")
        .limit(1000);
      if (filter.dotacion !== undefined)
        query =
          filter.dotacion.length === 1
            ? query.eq("dotacion", filter.dotacion[0])
            : query.in("dotacion", filter.dotacion);
      if (filter.categoria !== undefined)
        query =
          filter.categoria.length === 1
            ? query.eq("categoria", filter.categoria[0])
            : query.in("categoria", filter.categoria);
      if (filter.cargo !== undefined)
        query =
          filter.cargo.length === 1
            ? query.eq("cargo", filter.cargo[0])
            : query.in("cargo", filter.cargo);
      if (empresa) query = query.eq("empresa", empresa);
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) setError(err.message);
      else setRows((data ?? []) as EmployeeRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, empresa, isAdmin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    if (!q.trim()) return rows;
    const needle = q.trim().toLocaleLowerCase("es");
    return rows.filter(
      (r) =>
        r.nombre.toLocaleLowerCase("es").includes(needle) ||
        r.dni.includes(needle) ||
        r.cargo.toLocaleLowerCase("es").includes(needle) ||
        r.area.toLocaleLowerCase("es").includes(needle)
    );
  }, [rows, q]);

  if (!filter || !isAdmin || typeof document === "undefined") return null;

  const { y, m } = parsePeriod(filter.period);
  const endOfMonth = new Date(Date.UTC(m === 12 ? y + 1 : y, m % 12, 1))
    .toISOString()
    .slice(0, 10);
  const activos = rows?.filter((r) => !r.fecha_cese || r.fecha_cese >= endOfMonth).length ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Cerrar detalle"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/25"
      />
      <aside className="fade-rise absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line bg-surface shadow-[0_0_60px_rgba(23,23,26,0.18)]">
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                {periodLabel(filter.period)}
              </p>
              <h2 className="mt-0.5 text-[16px] font-semibold leading-snug text-ink-900">
                {filter.label}
              </h2>
              {rows && (
                <p className="mt-1 text-[12.5px] text-ink-500">
                  {num(activos)} activos · {num(rows.length - activos)} con cese ·{" "}
                  {num(rows.length)} registros
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-[8px] p-1.5 text-ink-400 transition-colors hover:bg-line-soft hover:text-ink-900"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative mt-3">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, DNI, cargo o área"
              className="w-full pl-9"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="px-5 py-6 text-sm text-danger-600">
              No se pudo cargar el detalle: {error}
            </p>
          )}
          {!rows && !error && (
            <div className="flex flex-col gap-3 px-5 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {filtered && filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-500">
              Sin personas para este filtro.
            </p>
          )}
          {filtered && filtered.length > 0 && (
            <ul>
              {filtered.map((r) => {
                const cesado = r.fecha_cese && r.fecha_cese < endOfMonth;
                return (
                  <li
                    key={r.id}
                    className="border-b border-line-soft px-5 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[13px] font-medium text-ink-900">
                        {r.nombre}
                      </p>
                      {r.fecha_cese ? (
                        <p
                          className={`shrink-0 text-[11.5px] font-medium ${
                            cesado ? "text-danger-600" : "text-warn-600"
                          }`}
                        >
                          Cese {fmtDate(r.fecha_cese)}
                        </p>
                      ) : (
                        <p className="shrink-0 text-[11.5px] text-ink-400">
                          Activo
                        </p>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-500">
                      <span className="tnum font-mono">{r.dni}</span> · {r.cargo}
                      {r.area ? ` · ${r.area}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-400">
                      {r.empresa}
                      {r.dotacion ? ` · ${r.dotacion}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
