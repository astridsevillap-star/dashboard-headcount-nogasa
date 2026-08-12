"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  DownloadSimple,
  MagnifyingGlass,
  Minus,
  PencilSimple,
  Plus,
  Trash,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { fetchBudget } from "@/lib/data";
import type { BudgetRow } from "@/lib/types";
import { num } from "@/lib/format";
import {
  Button,
  EmptyState,
  Select,
  Skeleton,
  TextInput,
  ToastStack,
  useToasts,
} from "@/components/ui";
import type { ParsedBudget } from "@/lib/xlsx";
import { useAdmin } from "@/lib/use-admin";

type Draft = {
  empresa: string;
  dotacion: string;
  categoria: string;
  area: string;
  cargo: string;
  cantidad: number;
};

const EMPTY_DRAFT: Draft = {
  empresa: "",
  dotacion: "",
  categoria: "",
  area: "",
  cargo: "",
  cantidad: 1,
};

export default function PresupuestoPage() {
  const isAdmin = useAdmin();
  const [rows, setRows] = useState<BudgetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedBudget | null>(null);
  const [importing, setImporting] = useState(false);
  const [newYearOpen, setNewYearOpen] = useState(false);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);
  const [copyFrom, setCopyFrom] = useState<number | "">("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  const load = useCallback(() => {
    setError(null);
    fetchBudget()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const anios = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.anio))).sort(),
    [rows]
  );
  const year =
    anio ?? (anios.length ? anios[anios.length - 1] : new Date().getFullYear());

  const yearRows = useMemo(
    () => (rows ?? []).filter((r) => r.anio === year),
    [rows, year]
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return yearRows;
    const needle = q.trim().toLocaleLowerCase("es");
    return yearRows.filter((r) =>
      [r.cargo, r.area, r.categoria, r.dotacion, r.empresa].some((f) =>
        f.toLocaleLowerCase("es").includes(needle)
      )
    );
  }, [yearRows, q]);

  const groups = useMemo(() => {
    const map = new Map<string, BudgetRow[]>();
    for (const r of filtered) {
      const d = r.dotacion || "(sin dotación)";
      const list = map.get(d);
      if (list) list.push(r);
      else map.set(d, [r]);
    }
    for (const list of map.values())
      list.sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria, "es") ||
          a.cargo.localeCompare(b.cargo, "es")
      );
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filtered]);

  const total = useMemo(
    () => yearRows.reduce((s, r) => s + r.cantidad, 0),
    [yearRows]
  );
  const totalFiltered = useMemo(
    () => filtered.reduce((s, r) => s + r.cantidad, 0),
    [filtered]
  );

  const suggestions = useMemo(() => {
    const all = rows ?? [];
    return {
      empresas: Array.from(new Set(all.map((r) => r.empresa).filter(Boolean))).sort(),
      dotaciones: Array.from(new Set(all.map((r) => r.dotacion).filter(Boolean))).sort(),
      categorias: Array.from(new Set(all.map((r) => r.categoria).filter(Boolean))).sort(),
      areas: Array.from(new Set(all.map((r) => r.area).filter(Boolean))).sort(),
    };
  }, [rows]);

  /* ---------- operaciones ---------- */

  const patchLocal = useCallback((id: number, patch: Partial<BudgetRow>) => {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev
    );
  }, []);

  const saveCantidad = useCallback(
    async (id: number, cantidad: number) => {
      const safe = Math.max(0, Math.round(cantidad));
      patchLocal(id, { cantidad: safe });
      const { error: err } = await supabase
        .from("budget_positions")
        .update({ cantidad: safe })
        .eq("id", id);
      if (err) {
        push("error", `No se guardó la cantidad: ${err.message}`);
        load();
      }
    },
    [patchLocal, push, load]
  );

  const addRow = useCallback(async () => {
    if (!draft.cargo.trim() || !draft.dotacion.trim()) {
      push("error", "Dotación y cargo son obligatorios.");
      return;
    }
    const payload = {
      anio: year,
      empresa: draft.empresa.trim(),
      dotacion: draft.dotacion.trim().toLocaleUpperCase("es"),
      categoria: draft.categoria.trim().toLocaleUpperCase("es"),
      area: draft.area.trim().toLocaleUpperCase("es"),
      cargo: draft.cargo.trim().toLocaleUpperCase("es"),
      cantidad: Math.max(0, Math.round(draft.cantidad)),
    };
    const { data, error: err } = await supabase
      .from("budget_positions")
      .insert(payload)
      .select()
      .single();
    if (err) {
      push("error", `No se pudo agregar: ${err.message}`);
      return;
    }
    setRows((prev) => (prev ? [...prev, data as BudgetRow] : [data as BudgetRow]));
    setDraft({ ...EMPTY_DRAFT, empresa: draft.empresa, dotacion: draft.dotacion });
    push("ok", "Posición agregada.");
  }, [draft, year, push]);

  const startEdit = useCallback((r: BudgetRow) => {
    setEditingId(r.id);
    setEditDraft({
      empresa: r.empresa,
      dotacion: r.dotacion,
      categoria: r.categoria,
      area: r.area,
      cargo: r.cargo,
      cantidad: r.cantidad,
    });
  }, []);

  const saveEdit = useCallback(async () => {
    if (editingId === null) return;
    if (!editDraft.cargo.trim() || !editDraft.dotacion.trim()) {
      push("error", "Dotación y cargo son obligatorios.");
      return;
    }
    const payload = {
      empresa: editDraft.empresa.trim(),
      dotacion: editDraft.dotacion.trim().toLocaleUpperCase("es"),
      categoria: editDraft.categoria.trim().toLocaleUpperCase("es"),
      area: editDraft.area.trim().toLocaleUpperCase("es"),
      cargo: editDraft.cargo.trim().toLocaleUpperCase("es"),
      cantidad: Math.max(0, Math.round(editDraft.cantidad)),
    };
    const { error: err } = await supabase
      .from("budget_positions")
      .update(payload)
      .eq("id", editingId);
    if (err) {
      push("error", `No se pudo guardar: ${err.message}`);
      return;
    }
    patchLocal(editingId, payload);
    setEditingId(null);
    push("ok", "Posición actualizada.");
  }, [editingId, editDraft, patchLocal, push]);

  const deleteRow = useCallback(
    async (id: number) => {
      setConfirmDelete(null);
      const { error: err } = await supabase
        .from("budget_positions")
        .delete()
        .eq("id", id);
      if (err) push("error", `No se pudo eliminar: ${err.message}`);
      else {
        setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
        push("ok", "Posición eliminada.");
      }
    },
    [push]
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const buf = await file.arrayBuffer();
        const { parseBudgetWorkbook } = await import("@/lib/xlsx");
        setImportPreview(parseBudgetWorkbook(buf, year));
      } catch (e) {
        push("error", e instanceof Error ? e.message : "No se pudo leer el archivo.");
      }
    },
    [year, push]
  );

  const confirmImport = useCallback(async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      for (const y of importPreview.anios) {
        const { error: delErr } = await supabase
          .from("budget_positions")
          .delete()
          .eq("anio", y);
        if (delErr) throw new Error(delErr.message);
      }
      for (let i = 0; i < importPreview.rows.length; i += 500) {
        const { error: insErr } = await supabase
          .from("budget_positions")
          .insert(importPreview.rows.slice(i, i + 500));
        if (insErr) throw new Error(insErr.message);
      }
      push(
        "ok",
        `Presupuesto importado: ${num(
          importPreview.rows.reduce((s, r) => s + r.cantidad, 0)
        )} posiciones.`
      );
      setImportPreview(null);
      setAnio(importPreview.anios[importPreview.anios.length - 1]);
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Error al importar.");
    } finally {
      setImporting(false);
    }
  }, [importPreview, push, load]);

  const createYear = useCallback(async () => {
    if (anios.includes(newYear)) {
      push("error", `El año ${newYear} ya existe.`);
      return;
    }
    if (copyFrom !== "") {
      const source = (rows ?? []).filter((r) => r.anio === copyFrom);
      if (source.length === 0) {
        push("error", "El año de origen no tiene posiciones.");
        return;
      }
      const payload = source.map((r) => ({
        anio: newYear,
        empresa: r.empresa,
        dotacion: r.dotacion,
        categoria: r.categoria,
        area: r.area,
        cargo: r.cargo,
        cantidad: r.cantidad,
      }));
      for (let i = 0; i < payload.length; i += 500) {
        const { error: err } = await supabase
          .from("budget_positions")
          .insert(payload.slice(i, i + 500));
        if (err) {
          push("error", `No se pudo copiar: ${err.message}`);
          return;
        }
      }
      push("ok", `Presupuesto ${newYear} creado a partir de ${copyFrom}.`);
      load();
    } else {
      push("ok", `Año ${newYear} listo: agrega posiciones o importa la plantilla.`);
    }
    setAnio(newYear);
    setNewYearOpen(false);
  }, [anios, newYear, copyFrom, rows, push, load]);

  const onTemplate = useCallback(async () => {
    const { downloadBudgetTemplate } = await import("@/lib/xlsx");
    downloadBudgetTemplate(year);
  }, [year]);

  /* ---------- render ---------- */

  if (error) {
    return (
      <EmptyState
        title="No se pudo cargar el presupuesto"
        body={error}
        action={<Button variant="primary" onClick={load}>Reintentar</Button>}
      />
    );
  }

  if (!rows) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-[90px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
            Presupuesto de posiciones
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Consulta pública de la base contra la que se compara cada mes. La edición requiere acceso autorizado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={year}
            onChange={(e) => setAnio(Number(e.target.value))}
            aria-label="Año de presupuesto"
          >
            {(anios.length ? anios : [year]).map((y) => (
              <option key={y} value={y}>
                Presupuesto {y}
              </option>
            ))}
          </Select>
          {isAdmin && <Button onClick={() => setNewYearOpen((v) => !v)}>
            <Copy size={15} /> Nuevo año
          </Button>}
          <Button onClick={onTemplate}>
            <DownloadSimple size={15} /> Plantilla
          </Button>
          {isAdmin && <Button onClick={() => inputRef.current?.click()}>
            <UploadSimple size={15} /> Importar
          </Button>}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {isAdmin && newYearOpen && (
        <section className="flex flex-wrap items-end gap-3 rounded-[12px] border border-line bg-surface px-5 py-4">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-500">
            Año nuevo
            <TextInput
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="w-28"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-500">
            Copiar posiciones de
            <Select
              value={copyFrom}
              onChange={(e) =>
                setCopyFrom(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">Empezar vacío</option>
              {anios.map((y) => (
                <option key={y} value={y}>
                  Presupuesto {y}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="primary" onClick={createYear}>
            Crear {newYear}
          </Button>
          <Button variant="ghost" onClick={() => setNewYearOpen(false)}>
            Cancelar
          </Button>
        </section>
      )}

      {isAdmin && importPreview && (
        <section className="rounded-[12px] border border-brand-200 bg-brand-25 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">
            Importar presupuesto
          </p>
          <p className="mt-1 text-[13px] text-ink-700">
            {num(importPreview.rows.length)} combinaciones,{" "}
            {num(importPreview.rows.reduce((s, r) => s + r.cantidad, 0))} posiciones, para{" "}
            {importPreview.anios.map((y) => `presupuesto ${y}`).join(", ")}.
            {importPreview.anios.some((y) => anios.includes(y)) &&
              " Los años existentes se reemplazan por completo."}
          </p>
          {importPreview.warnings.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {importPreview.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-[12.5px] text-warn-600">
                  <Warning size={14} className="mt-0.5 shrink-0" /> {w}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" onClick={confirmImport} disabled={importing}>
              {importing ? "Importando…" : "Confirmar importación"}
            </Button>
            <Button onClick={() => setImportPreview(null)} disabled={importing}>
              Cancelar
            </Button>
          </div>
        </section>
      )}

      {/* resumen del año */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2 bg-surface px-5 py-4 sm:col-span-1">
          <p className="text-[12px] font-medium text-ink-500">Total {year}</p>
          <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-ink-900">
            {num(total)}
          </p>
        </div>
        {[...groups]
          .map(([dot, list]) => [dot, list.reduce((s, r) => s + r.cantidad, 0)] as const)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([dot, subtotal]) => (
            <div key={dot} className="bg-surface px-5 py-4">
              <p className="truncate text-[12px] font-medium text-ink-500" title={dot}>
                {dot}
              </p>
              <p className="tnum mt-1 font-mono text-[22px] font-semibold leading-none text-ink-900">
                {num(subtotal)}
              </p>
            </div>
          ))}
      </section>

      {/* tabla editable */}
      <section className="rounded-[12px] border border-line bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-ink-900">
              Posiciones presupuestadas {year}
            </h2>
            <p className="text-[12px] text-ink-500">
              {num(totalFiltered)} posiciones en {num(filtered.length)} filas
              {q ? " (filtradas)" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cargo, área o categoría"
                className="w-60 pl-9"
              />
            </div>
            {isAdmin && <Button variant="primary" size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus size={14} /> Agregar posición
            </Button>}
          </div>
        </header>

        <div className="matrix-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 pl-5 pr-3">Cargo</th>
                <th className="px-3 py-2.5">Categoría</th>
                <th className="px-3 py-2.5">Área</th>
                <th className="px-3 py-2.5">Empresa</th>
                <th className="px-3 py-2.5 text-right">Cantidad</th>
                <th className="py-2.5 pl-3 pr-5 text-right">{isAdmin ? "Acciones" : "Modo"}</th>
              </tr>
            </thead>
            <tbody>
              {isAdmin && adding && (
                <tr className="border-b border-line bg-brand-25/70">
                  <td className="py-2.5 pl-5 pr-3">
                    <div className="flex flex-col gap-1.5">
                      <TextInput
                        autoFocus
                        placeholder="CARGO *"
                        value={draft.cargo}
                        onChange={(e) => setDraft({ ...draft, cargo: e.target.value })}
                        className="h-8 w-full"
                      />
                      <TextInput
                        placeholder="DOTACIÓN *"
                        list="dotaciones"
                        value={draft.dotacion}
                        onChange={(e) => setDraft({ ...draft, dotacion: e.target.value })}
                        className="h-8 w-full"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      placeholder="Categoría"
                      list="categorias"
                      value={draft.categoria}
                      onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
                      className="h-8 w-full"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      placeholder="Área"
                      list="areas"
                      value={draft.area}
                      onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                      className="h-8 w-full"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      placeholder="Empresa"
                      list="empresas"
                      value={draft.empresa}
                      onChange={(e) => setDraft({ ...draft, empresa: e.target.value })}
                      className="h-8 w-full"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Stepper
                      value={draft.cantidad}
                      onChange={(v) => setDraft({ ...draft, cantidad: v })}
                    />
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right">
                    <span className="inline-flex gap-1.5">
                      <Button size="sm" variant="primary" onClick={addRow}>
                        <Check size={14} /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                        <X size={14} />
                      </Button>
                    </span>
                  </td>
                </tr>
              )}

              {groups.length === 0 && !adding && (
                <tr>
                  <td colSpan={6} className="px-5 py-10">
                    <EmptyState
                      title={`Sin presupuesto para ${year}`}
                      body="Agrega posiciones una a una, importa la plantilla o copia la base de otro año."
                      action={isAdmin ?
                        <div className="flex gap-2">
                          <Button variant="primary" onClick={() => setAdding(true)}>
                            <Plus size={15} /> Agregar posición
                          </Button>
                          <Button onClick={() => inputRef.current?.click()}>
                            <UploadSimple size={15} /> Importar plantilla
                          </Button>
                        </div>
                      : undefined}
                    />
                  </td>
                </tr>
              )}

              {groups.map(([dot, list]) => (
                <GroupRows
                  key={dot}
                  dot={dot}
                  list={list}
                  editingId={editingId}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  cancelEdit={() => setEditingId(null)}
                  confirmDelete={confirmDelete}
                  setConfirmDelete={setConfirmDelete}
                  deleteRow={deleteRow}
                  saveCantidad={saveCantidad}
                  isAdmin={isAdmin}
                />
              ))}
            </tbody>
          </table>
        </div>

        <datalist id="empresas">
          {suggestions.empresas.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <datalist id="dotaciones">
          {suggestions.dotaciones.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <datalist id="categorias">
          {suggestions.categorias.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <datalist id="areas">
          {suggestions.areas.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </section>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-900"
        aria-label="Restar"
      >
        <Minus size={12} weight="bold" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="tnum h-7 w-14 rounded-[6px] border border-line bg-surface text-center font-mono text-[13px] text-ink-900"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-900"
        aria-label="Sumar"
      >
        <Plus size={12} weight="bold" />
      </button>
    </span>
  );
}

function GroupRows({
  dot,
  list,
  editingId,
  editDraft,
  setEditDraft,
  startEdit,
  saveEdit,
  cancelEdit,
  confirmDelete,
  setConfirmDelete,
  deleteRow,
  saveCantidad,
  isAdmin,
}: {
  dot: string;
  list: BudgetRow[];
  editingId: number | null;
  editDraft: Draft;
  setEditDraft: (d: Draft) => void;
  startEdit: (r: BudgetRow) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  confirmDelete: number | null;
  setConfirmDelete: (id: number | null) => void;
  deleteRow: (id: number) => void;
  saveCantidad: (id: number, v: number) => void;
  isAdmin: boolean;
}) {
  const subtotal = list.reduce((s, r) => s + r.cantidad, 0);
  return (
    <>
      <tr className="border-b border-line bg-line-soft/50">
        <td colSpan={4} className="py-2 pl-5 pr-3 text-[12.5px] font-semibold text-ink-900">
          {dot}
        </td>
        <td className="tnum px-3 py-2 text-right font-mono text-[12.5px] font-semibold text-ink-900">
          {num(subtotal)}
        </td>
        <td className="py-2 pl-3 pr-5" />
      </tr>
      {list.map((r) =>
        editingId === r.id ? (
          <tr key={r.id} className="border-b border-line bg-brand-25/70">
            <td className="py-2.5 pl-5 pr-3">
              <div className="flex flex-col gap-1.5">
                <TextInput
                  value={editDraft.cargo}
                  onChange={(e) => setEditDraft({ ...editDraft, cargo: e.target.value })}
                  className="h-8 w-full"
                  placeholder="CARGO *"
                />
                <TextInput
                  value={editDraft.dotacion}
                  list="dotaciones"
                  onChange={(e) => setEditDraft({ ...editDraft, dotacion: e.target.value })}
                  className="h-8 w-full"
                  placeholder="DOTACIÓN *"
                />
              </div>
            </td>
            <td className="px-3 py-2.5">
              <TextInput
                value={editDraft.categoria}
                list="categorias"
                onChange={(e) => setEditDraft({ ...editDraft, categoria: e.target.value })}
                className="h-8 w-full"
              />
            </td>
            <td className="px-3 py-2.5">
              <TextInput
                value={editDraft.area}
                list="areas"
                onChange={(e) => setEditDraft({ ...editDraft, area: e.target.value })}
                className="h-8 w-full"
              />
            </td>
            <td className="px-3 py-2.5">
              <TextInput
                value={editDraft.empresa}
                list="empresas"
                onChange={(e) => setEditDraft({ ...editDraft, empresa: e.target.value })}
                className="h-8 w-full"
              />
            </td>
            <td className="px-3 py-2.5 text-right">
              <Stepper
                value={editDraft.cantidad}
                onChange={(v) => setEditDraft({ ...editDraft, cantidad: v })}
              />
            </td>
            <td className="py-2.5 pl-3 pr-5 text-right">
              <span className="inline-flex gap-1.5">
                <Button size="sm" variant="primary" onClick={saveEdit}>
                  <Check size={14} /> Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  <X size={14} />
                </Button>
              </span>
            </td>
          </tr>
        ) : (
          <tr key={r.id} className="group border-b border-line-soft transition-colors hover:bg-brand-25/50">
            <td className="py-2 pl-5 pr-3">
              <p className="font-medium text-ink-900">{r.cargo || "(sin cargo)"}</p>
            </td>
            <td className="px-3 py-2 text-ink-500">{r.categoria || "–"}</td>
            <td className="px-3 py-2 text-ink-500">{r.area || "–"}</td>
            <td className="px-3 py-2 text-ink-500">{r.empresa || "–"}</td>
            <td className="px-3 py-2 text-right">
              {isAdmin ? <Stepper
                value={r.cantidad}
                onChange={(v) => saveCantidad(r.id, v)}
              /> : <span className="tnum font-mono text-ink-700">{num(r.cantidad)}</span>}
            </td>
            <td className="py-2 pl-3 pr-5 text-right">
              {!isAdmin ? <span className="text-xs text-ink-400">Solo lectura</span> : confirmDelete === r.id ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-[12px] text-ink-500">¿Eliminar?</span>
                  <Button size="sm" variant="danger" onClick={() => deleteRow(r.id)}>
                    Sí
                  </Button>
                  <Button size="sm" onClick={() => setConfirmDelete(null)}>
                    No
                  </Button>
                </span>
              ) : (
                <span className="inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)} aria-label="Editar">
                    <PencilSimple size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(r.id)}
                    aria-label="Eliminar"
                  >
                    <Trash size={14} />
                  </Button>
                </span>
              )}
            </td>
          </tr>
        )
      )}
    </>
  );
}
