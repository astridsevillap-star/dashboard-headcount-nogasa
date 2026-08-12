"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  DownloadSimple,
  FileXls,
  Trash,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { fetchMonthRecords, fetchMonths } from "@/lib/data";
import type { MonthSummary } from "@/lib/types";
import { num, periodLabel } from "@/lib/format";
import { Button, EmptyState, Skeleton, ToastStack, useToasts } from "@/components/ui";
import type { ParsedData } from "@/lib/xlsx";
import { useAdmin } from "@/lib/use-admin";

const CHUNK = 500;

type Phase =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "preview"; parsed: ParsedData; fileName: string }
  | { kind: "uploading"; done: number; total: number };

export default function DatosPage() {
  const isAdmin = useAdmin();
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [monthsError, setMonthsError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toasts, push, dismiss } = useToasts();

  const loadMonths = useCallback(() => {
    setMonthsError(null);
    fetchMonths()
      .then(setMonths)
      .catch((e: Error) => setMonthsError(e.message));
  }, []);

  useEffect(loadMonths, [loadMonths]);

  const existing = useMemo(
    () => new Map((months ?? []).map((m) => [m.period, m.registros])),
    [months]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setPhase({ kind: "parsing" });
      try {
        const buf = await file.arrayBuffer();
        const { parseDataWorkbook } = await import("@/lib/xlsx");
        const parsed = parseDataWorkbook(buf);
        setPhase({ kind: "preview", parsed, fileName: file.name });
      } catch (e) {
        push("error", e instanceof Error ? e.message : "No se pudo leer el archivo.");
        setPhase({ kind: "idle" });
      }
    },
    [push]
  );

  const confirmUpload = useCallback(async () => {
    if (phase.kind !== "preview") return;
    const { parsed } = phase;
    setPhase({ kind: "uploading", done: 0, total: parsed.rows.length });
    try {
      const { error: delError } = await supabase
        .from("headcount_records")
        .delete()
        .in("period", parsed.periods);
      if (delError) throw new Error(delError.message);

      for (let i = 0; i < parsed.rows.length; i += CHUNK) {
        const chunk = parsed.rows.slice(i, i + CHUNK);
        const { error } = await supabase.from("headcount_records").insert(chunk);
        if (error) throw new Error(error.message);
        setPhase({
          kind: "uploading",
          done: Math.min(i + CHUNK, parsed.rows.length),
          total: parsed.rows.length,
        });
      }
      await supabase.from("hc_activity_logs").insert({
        action: "upload_months",
        detail: { periods: parsed.periods, rows: parsed.rows.length, file_name: phase.fileName },
      });
      push(
        "ok",
        `Se cargaron ${num(parsed.rows.length)} registros en ${parsed.periods.length} ${
          parsed.periods.length === 1 ? "mes" : "meses"
        }.`
      );
      setPhase({ kind: "idle" });
      loadMonths();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Error al subir los datos.");
      setPhase({ kind: "idle" });
    }
  }, [phase, push, loadMonths]);

  const deleteMonth = useCallback(
    async (period: string) => {
      setConfirmDelete(null);
      const { error } = await supabase
        .from("headcount_records")
        .delete()
        .eq("period", period);
      if (error) push("error", `No se pudo eliminar: ${error.message}`);
      else {
        await supabase.from("hc_activity_logs").insert({
          action: "delete_month",
          detail: { period },
        });
        push("ok", `Se eliminó ${periodLabel(period)}.`);
        loadMonths();
      }
    },
    [push, loadMonths]
  );

  const onTemplate = useCallback(async () => {
    const { downloadDataTemplate } = await import("@/lib/xlsx");
    downloadDataTemplate();
  }, []);

  const downloadMonth = useCallback(
    async (period: string) => {
      setDownloading(period);
      try {
        const [rows, { exportMonthXlsx }] = await Promise.all([
          fetchMonthRecords(period),
          import("@/lib/xlsx"),
        ]);
        exportMonthXlsx(period, rows);
        push("ok", `Se descargó ${periodLabel(period)}: ${num(rows.length)} registros.`);
      } catch (e) {
        push("error", e instanceof Error ? e.message : "No se pudo descargar el mes.");
      } finally {
        setDownloading(null);
      }
    },
    [push]
  );

  return (
    <div className="fade-rise flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
          Datos mensuales
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">Consulta los periodos disponibles. La carga y modificación requieren acceso autorizado.</p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* zona de carga */}
        {isAdmin && <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-7">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="text-[14px] font-semibold text-ink-900">Subir archivo</h2>
            <p className="text-[12px] text-ink-500">
              Formato .xlsx o .csv con las columnas de la plantilla. Acepta varios meses a la vez.
            </p>
          </header>

          <div className="p-5">
            {phase.kind === "idle" && (
              <button
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={`flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed px-6 py-14 transition-colors ${
                  dragOver
                    ? "border-brand-600 bg-brand-25"
                    : "border-ink-300 bg-page hover:border-brand-600 hover:bg-brand-25"
                }`}
              >
                <UploadSimple size={26} className="text-brand-600" />
                <p className="mt-3 text-sm font-medium text-ink-900">
                  Arrastra el archivo aquí o haz clic para elegirlo
                </p>
                <p className="mt-1 text-[12.5px] text-ink-500">
                  Se validará antes de guardar. Nada se sube sin tu confirmación.
                </p>
              </button>
            )}

            {phase.kind === "parsing" && (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-4/5" />
                <p className="text-sm text-ink-500">Leyendo archivo…</p>
              </div>
            )}

            {phase.kind === "preview" && (
              <div>
                <div className="flex items-center gap-2.5">
                  <FileXls size={20} className="shrink-0 text-brand-600" />
                  <p className="truncate text-sm font-medium text-ink-900">
                    {phase.fileName}
                  </p>
                  <span className="tnum ml-auto shrink-0 font-mono text-[12.5px] text-ink-500">
                    {num(phase.parsed.rows.length)} registros
                  </span>
                </div>

                <table className="mt-4 w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                      <th className="py-2 pr-3">Mes</th>
                      <th className="py-2 pr-3 text-right">Registros</th>
                      <th className="py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phase.parsed.periods.map((p) => {
                      const count = phase.parsed.rows.filter((r) => r.period === p).length;
                      const prev = existing.get(p);
                      return (
                        <tr key={p} className="border-b border-line-soft">
                          <td className="py-2 pr-3 text-ink-900">{periodLabel(p)}</td>
                          <td className="tnum py-2 pr-3 text-right font-mono text-ink-700">
                            {num(count)}
                          </td>
                          <td className="py-2">
                            {prev !== undefined ? (
                              <span className="text-[12px] font-medium text-warn-600">
                                Reemplaza {num(prev)} existentes
                              </span>
                            ) : (
                              <span className="text-[12px] text-ink-400">Mes nuevo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {phase.parsed.warnings.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {phase.parsed.warnings.map((w) => (
                      <li key={w} className="flex items-start gap-2 text-[12.5px] text-warn-600">
                        <Warning size={14} className="mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 flex items-center gap-2">
                  <Button variant="primary" onClick={confirmUpload}>
                    Confirmar carga
                  </Button>
                  <Button onClick={() => setPhase({ kind: "idle" })}>Cancelar</Button>
                </div>
              </div>
            )}

            {phase.kind === "uploading" && (
              <div className="py-6">
                <p className="text-sm font-medium text-ink-900">Subiendo registros…</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{
                      width: `${Math.round((phase.done / Math.max(phase.total, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="tnum mt-2 font-mono text-[12.5px] text-ink-500">
                  {num(phase.done)} de {num(phase.total)}
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </section>}

        {/* plantilla */}
        <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-5">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="text-[14px] font-semibold text-ink-900">Plantilla</h2>
            <p className="text-[12px] text-ink-500">
              Estructura esperada del archivo, una fila por persona y mes.
            </p>
          </header>
          <div className="p-5">
            <Button variant="primary" onClick={onTemplate}>
              <DownloadSimple size={15} /> Descargar plantilla
            </Button>
            <dl className="mt-5 grid grid-cols-1 gap-y-2 text-[12.5px]">
              {[
                ["FECHA DATA", "Primer día del mes de la foto", true],
                ["DNI", "Documento. Base de altas y bajas", true],
                ["NOMBRE", "Apellidos y nombres", true],
                ["CARGO", "Puesto, nivel más fino de la matriz", true],
                ["DOTACION", "Grupo mayor del dashboard", true],
                ["EMPRESA", "Razón social, habilita el filtro", false],
                ["CATEGORIA", "Subgrupo de la dotación (HC CAT)", false],
                ["AREA / DIVISION / GERENCIA", "Detalle organizativo", false],
                ["FECHA INGRESO", "Opcional", false],
                ["FECHA CESE", "Vacío = activa. Define los activos", false],
              ].map(([name, desc, req]) => (
                <div key={String(name)} className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-2">
                  <dt className="shrink-0 font-mono text-[11.5px] font-medium text-ink-700">
                    {name}
                    {req ? <span className="ml-1.5 text-danger-600">*</span> : null}
                  </dt>
                  <dd className="text-right text-ink-500">{desc}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11.5px] text-ink-400">
              * obligatoria. El resto es recomendada para filtros y matriz.
            </p>
          </div>
        </section>
      </div>

      {/* meses cargados */}
      <section className="rounded-[12px] border border-line bg-surface">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-ink-900">Meses cargados</h2>
            <p className="text-[12px] text-ink-500">
              Historial disponible para el dashboard.
            </p>
          </div>
          <Link href="/" className="text-[13px] font-medium text-brand-600 hover:underline">
            Ver dashboard
          </Link>
        </header>

        {monthsError && (
          <p className="px-5 py-6 text-sm text-danger-600">{monthsError}</p>
        )}
        {!months && !monthsError && (
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        )}
        {months && months.length === 0 && (
          <div className="p-5">
            <EmptyState
              title="Sin meses cargados"
              body="Descarga la plantilla, complétala con la data de un mes y súbela aquí arriba."
            />
          </div>
        )}
        {months && months.length > 0 && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 pl-5 pr-3">Mes</th>
                <th className="px-3 py-2.5 text-right">Registros</th>
                <th className="px-3 py-2.5 text-right">Cesados en el mes</th>
                <th className="px-3 py-2.5 text-right">Empresas</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.period} className="border-b border-line-soft">
                  <td className="py-2.5 pl-5 pr-3">
                    <span className="flex items-center gap-2 font-medium text-ink-900">
                      <CalendarBlank size={15} className="text-ink-400" />
                      {periodLabel(m.period)}
                    </span>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-ink-700">
                    {num(m.registros)}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-ink-700">
                    {num(m.cesados)}
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-ink-700">
                    {num(m.empresas)}
                  </td>
                  <td className="py-2 pl-3 pr-5 text-right">
                    {!isAdmin ? <span className="text-xs text-ink-400">Solo lectura</span> : confirmDelete === m.period ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-[12px] text-ink-500">¿Eliminar?</span>
                        <Button size="sm" variant="danger" onClick={() => deleteMonth(m.period)}>
                          Sí, eliminar
                        </Button>
                        <Button size="sm" onClick={() => setConfirmDelete(null)}>
                          No
                        </Button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadMonth(m.period)}
                          disabled={downloading !== null}
                          aria-label={`Descargar ${periodLabel(m.period)}`}
                        >
                          <DownloadSimple size={14} />
                          {downloading === m.period ? "Descargando…" : "Descargar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(m.period)}
                          aria-label={`Eliminar ${periodLabel(m.period)}`}
                        >
                          <Trash size={14} /> Eliminar
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
