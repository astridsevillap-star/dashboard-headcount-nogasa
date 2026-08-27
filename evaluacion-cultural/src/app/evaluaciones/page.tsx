"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DownloadSimple, UploadSimple, FloppyDisk, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button, Select, Skeleton, useToasts, ToastStack } from "@/components/ui";
import {
  dimensiones,
  evaluadosView,
  empresas as empresasOf,
  loadStore,
  mutate,
  periodos,
  resetStore,
} from "@/lib/data";
import { exportPeriod, importPeriod } from "@/lib/xlsx";
import { periodLabel, score } from "@/lib/format";
import type { Evaluado } from "@/lib/types";

type Grid = Record<string, Record<string, string>>; // evaluadoId -> dimId -> value

export default function EvaluacionesPage() {
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState<string>(() => periodos.at(-1) ?? periodos[0]);
  const [empresa, setEmpresa] = useState<string>("__all__");
  const [grid, setGrid] = useState<Grid>({});
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    loadStore();
    setReady(true);
  }, []);

  // (re)carga la grilla desde el store cuando cambia el periodo
  useEffect(() => {
    if (!ready) return;
    const s = loadStore();
    const g: Grid = {};
    for (const ev of s.evaluados) {
      g[ev.id] = {};
      for (const d of dimensiones) {
        const row = s.evaluaciones.find(
          (e) => e.evaluadoId === ev.id && e.period === period && e.dimensionId === d.id
        );
        g[ev.id][d.id] = row ? String(row.score) : "";
      }
    }
    setGrid(g);
    setDirty(false);
  }, [ready, period]);

  const evaluados = useMemo(() => {
    if (!ready) return [] as Evaluado[];
    const view = evaluadosView(loadStore());
    return view.filter((e) => empresa === "__all__" || e.empresa === empresa);
  }, [ready, empresa, period]);

  if (!ready) return <Skeleton className="h-[420px] w-full" />;

  const empresaOptions = empresasOf(loadStore());

  function setCell(evId: string, dimId: string, value: string) {
    setGrid((prev) => ({ ...prev, [evId]: { ...prev[evId], [dimId]: value } }));
    setDirty(true);
  }

  function rowIndex(evId: string): number | null {
    const vals = dimensiones
      .map((d) => Number(grid[evId]?.[d.id]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  function save() {
    mutate((s) => {
      // reemplaza las calificaciones del periodo para los evaluados de la grilla
      const ids = new Set(Object.keys(grid));
      s.evaluaciones = s.evaluaciones.filter(
        (e) => !(e.period === period && ids.has(e.evaluadoId))
      );
      for (const [evId, dims] of Object.entries(grid)) {
        for (const [dimId, raw] of Object.entries(dims)) {
          const n = Number(raw);
          if (!Number.isFinite(n) || n <= 0) continue;
          s.evaluaciones.push({
            evaluadoId: evId,
            period,
            dimensionId: dimId,
            score: Math.max(1, Math.min(5, Math.round(n * 2) / 2)),
          });
        }
      }
    });
    setDirty(false);
    push("ok", `Calificaciones de ${periodLabel(period)} guardadas.`);
  }

  function descargarPlantilla() {
    const s = loadStore();
    exportPeriod(evaluadosView(s), [], period, false, `plantilla-evaluacion-${period}.xlsx`);
  }

  function exportar() {
    const s = loadStore();
    exportPeriod(evaluadosView(s), s.evaluaciones, period, true, `evaluacion-${period}.xlsx`);
  }

  async function onImport(file: File) {
    try {
      const { evaluaciones, filas } = await importPeriod(file, period);
      if (filas === 0) {
        push("error", "No se encontraron calificaciones válidas en el archivo.");
        return;
      }
      // vuelca al grid
      setGrid((prev) => {
        const next: Grid = { ...prev };
        for (const e of evaluaciones) {
          next[e.evaluadoId] = { ...next[e.evaluadoId], [e.dimensionId]: String(e.score) };
        }
        return next;
      });
      setDirty(true);
      push("ok", `${filas} calificaciones importadas. Revise y guarde los cambios.`);
    } catch {
      push("error", "No se pudo leer el archivo. Verifique el formato.");
    }
  }

  function reset() {
    if (!window.confirm("¿Restablecer todos los datos de ejemplo? Se perderán los cambios guardados.")) return;
    resetStore();
    const s = loadStore();
    const g: Grid = {};
    for (const ev of s.evaluados) {
      g[ev.id] = {};
      for (const d of dimensiones) {
        const row = s.evaluaciones.find(
          (e) => e.evaluadoId === ev.id && e.period === period && e.dimensionId === d.id
        );
        g[ev.id][d.id] = row ? String(row.score) : "";
      }
    }
    setGrid(g);
    setDirty(false);
    push("ok", "Datos de ejemplo restablecidos.");
  }

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Carga de evaluaciones</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Registre el puntaje (1–5) de cada evaluado por dimensión, o cargue una plantilla Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periodos.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </Select>
          <Select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="__all__">Todas las empresas</option>
            {empresaOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={descargarPlantilla}>
          <DownloadSimple size={15} /> Plantilla
        </Button>
        <Button variant="secondary" size="sm" onClick={exportar}>
          <DownloadSimple size={15} /> Exportar periodo
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <UploadSimple size={15} /> Importar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <ArrowCounterClockwise size={15} /> Datos de ejemplo
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>
            <FloppyDisk size={15} /> {dirty ? "Guardar cambios" : "Guardado"}
          </Button>
        </div>
      </div>

      <section className="overflow-x-auto rounded-[12px] border border-line bg-surface">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                Evaluado
              </th>
              {dimensiones.map((d) => (
                <th
                  key={d.id}
                  className="min-w-[76px] px-2 py-3 text-center text-[11px] font-medium text-ink-500"
                  title={d.descripcion}
                >
                  {d.nombre}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[12px] font-medium text-ink-500">Índice</th>
            </tr>
          </thead>
          <tbody>
            {evaluados.map((ev) => {
              const idx = rowIndex(ev.id);
              return (
                <tr key={ev.id} className="group">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-t border-line-soft bg-surface px-4 py-2 group-hover:bg-line-soft/50">
                    <p className="text-[13px] font-medium text-ink-900">{ev.nombre}</p>
                    <p className="text-[11px] text-ink-400">
                      {ev.cargo} · {ev.area} · {ev.empresa}
                    </p>
                  </td>
                  {dimensiones.map((d) => (
                    <td key={d.id} className="border-t border-line-soft px-2 py-2 text-center group-hover:bg-line-soft/50">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={grid[ev.id]?.[d.id] ?? ""}
                        onChange={(e) => setCell(ev.id, d.id, e.target.value)}
                        className="h-8 w-14 rounded-[6px] border border-line bg-surface px-1 text-center tnum font-mono text-[13px] text-ink-900 hover:border-ink-300 focus:border-brand-600"
                      />
                    </td>
                  ))}
                  <td className="border-t border-line-soft px-3 py-2 text-center group-hover:bg-line-soft/50">
                    <span className="tnum font-mono text-[13px] font-semibold text-ink-900">
                      {score(idx)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
