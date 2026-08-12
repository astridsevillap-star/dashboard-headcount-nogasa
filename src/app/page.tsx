"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowsInSimple,
  ArrowsOutSimple,
  DownloadSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  applyRulesToAgg,
  applyRulesToBudget,
  buildMatrix,
  buildValueMaps,
  fetchAggregate,
  fetchBudget,
  fetchMovimientos,
  fetchRules,
  filterMatrix,
  hcOf,
  originalsOf,
} from "@/lib/data";
import type { AggRow, BudgetRow, MatrixNode, MergeRule, Movimiento } from "@/lib/types";
import { monthLabel, num, parsePeriod, pct, periodLabel, signed } from "@/lib/format";
import { Button, EmptyState, Segmented, Select, Skeleton, TextInput } from "@/components/ui";
import { EvolutionChart, LegendRow, MovimientosChart, C } from "@/components/charts";
import { GapLegend, GapMeters } from "@/components/gapmeter";
import { MatrixTable, type CellFilter } from "@/components/matrix";
import { DetailDrawer, type DrawerFilter } from "@/components/drawer";

type Modo = "activos" | "todos";

export default function DashboardPage() {
  const [agg, setAgg] = useState<AggRow[] | null>(null);
  const [budget, setBudget] = useState<BudgetRow[] | null>(null);
  const [rules, setRules] = useState<MergeRule[]>([]);
  const [mov, setMov] = useState<Movimiento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [ventana, setVentana] = useState<string>("12m");
  const [empresa, setEmpresa] = useState<string>("");
  const [modo, setModo] = useState<Modo>("activos");

  const [cell, setCell] = useState<DrawerFilter | null>(null);
  const [q, setQ] = useState("");
  const [expandSignal, setExpandSignal] = useState(0);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchAggregate(), fetchBudget(), fetchRules()])
      .then(([a, b, r]) => {
        setAgg(a);
        setBudget(b);
        setRules(r);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  // filtros por defecto: año actual y empresa NOGASA (una sola vez, al cargar)
  useEffect(() => {
    if (!agg || initialized) return;
    const ys = Array.from(new Set(agg.map((r) => parsePeriod(r.period).y)));
    const cy = new Date().getFullYear();
    if (ys.includes(cy)) setVentana(String(cy));
    else if (ys.length) setVentana(String(Math.max(...ys)));
    const nogasa = Array.from(new Set(agg.map((r) => r.empresa))).find((e) =>
      e.toLocaleUpperCase("es").includes("NOGASA")
    );
    if (nogasa) setEmpresa(nogasa);
    setInitialized(true);
  }, [agg, initialized]);

  useEffect(() => {
    fetchMovimientos(empresa || null)
      .then(setMov)
      .catch(() => setMov([]));
  }, [empresa]);

  /* ---------- derivados ---------- */

  // reglas de homologación: los valores históricos se agrupan bajo el nombre nuevo
  const ruleMaps = useMemo(
    () => buildValueMaps(agg ?? [], budget ?? [], rules),
    [agg, budget, rules]
  );
  const mAgg = useMemo(
    () => applyRulesToAgg(agg ?? [], ruleMaps),
    [agg, ruleMaps]
  );
  const mBudget = useMemo(
    () => applyRulesToBudget(budget ?? [], ruleMaps),
    [budget, ruleMaps]
  );

  const years = useMemo(() => {
    if (!agg) return [];
    return Array.from(new Set(agg.map((r) => parsePeriod(r.period).y))).sort();
  }, [agg]);

  const empresas = useMemo(() => {
    const set = new Set<string>();
    for (const r of agg ?? []) if (r.empresa) set.add(r.empresa);
    for (const b of budget ?? []) if (b.empresa) set.add(b.empresa);
    return Array.from(set).sort();
  }, [agg, budget]);

  const fAgg = useMemo(
    () => mAgg.filter((r) => !empresa || r.empresa === empresa),
    [mAgg, empresa]
  );

  // convierte un filtro de celda (valores mostrados) a valores originales
  const toDrawer = useCallback(
    (f: CellFilter): DrawerFilter => ({
      period: f.period,
      label: f.label,
      dotacion:
        f.dotacion !== undefined ? originalsOf(ruleMaps, "dotacion", f.dotacion) : undefined,
      categoria:
        f.categoria !== undefined ? originalsOf(ruleMaps, "categoria", f.categoria) : undefined,
      cargo: f.cargo !== undefined ? originalsOf(ruleMaps, "cargo", f.cargo) : undefined,
    }),
    [ruleMaps]
  );

  const periods = useMemo(() => {
    const all = Array.from(new Set(fAgg.map((r) => r.period))).sort();
    if (ventana === "12m") return all.slice(-12);
    const y = Number(ventana);
    return all.filter((p) => parsePeriod(p).y === y);
  }, [fAgg, ventana]);

  const lastPeriod = periods[periods.length - 1] ?? null;
  const prevPeriod = periods.length > 1 ? periods[periods.length - 2] : null;

  // año de referencia para elegir presupuesto: el del último mes visible
  const year = lastPeriod ? parsePeriod(lastPeriod).y : null;

  // la ventana cruza años → etiquetas de mes con año
  const spansYears = useMemo(
    () => new Set(periods.map((p) => parsePeriod(p).y)).size > 1,
    [periods]
  );
  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of periods) map[p] = monthLabel(p, spansYears);
    return map;
  }, [periods, spansYears]);
  const windowTitle =
    ventana === "12m" ? "últimos 12 meses" : `año ${ventana}`;

  // presupuesto del año (o el más reciente disponible como base)
  const budgetYear = useMemo(() => {
    if (!budget || year === null) return null;
    const anios = Array.from(new Set(budget.map((b) => b.anio))).sort();
    if (anios.includes(year)) return year;
    const prev = anios.filter((a) => a < year);
    if (prev.length) return prev[prev.length - 1];
    return anios.length ? anios[anios.length - 1] : null;
  }, [budget, year]);

  const fBudget = useMemo(
    () =>
      mBudget.filter(
        (b) => b.anio === budgetYear && (!empresa || b.empresa === empresa)
      ),
    [mBudget, budgetYear, empresa]
  );

  const budgetTotal = useMemo(
    () => fBudget.reduce((s, b) => s + b.cantidad, 0),
    [fBudget]
  );
  const budgetAvailable = budgetTotal > 0;

  const hcByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of fAgg) {
      map.set(r.period, (map.get(r.period) ?? 0) + hcOf(r, modo === "todos"));
    }
    return map;
  }, [fAgg, modo]);

  const hcActual = lastPeriod ? (hcByPeriod.get(lastPeriod) ?? 0) : 0;
  const hcPrev = prevPeriod ? (hcByPeriod.get(prevPeriod) ?? 0) : null;
  const deltaPpto = budgetAvailable ? hcActual - budgetTotal : null;
  const cobertura = budgetAvailable ? (hcActual / budgetTotal) * 100 : null;

  const movActual = useMemo(
    () => (mov ?? []).find((m) => m.period === lastPeriod) ?? null,
    [mov, lastPeriod]
  );

  const evolutionData = useMemo(
    () =>
      periods.map((p) => ({
        label: labels[p],
        hc: hcByPeriod.get(p) ?? null,
        presupuesto: budgetAvailable ? budgetTotal : null,
      })),
    [periods, labels, hcByPeriod, budgetAvailable, budgetTotal]
  );

  const dotacionData = useMemo(() => {
    if (!lastPeriod) return [];
    const hcByDot = new Map<string, number>();
    for (const r of fAgg) {
      if (r.period !== lastPeriod) continue;
      const v = hcOf(r, modo === "todos");
      if (v === 0) continue;
      const d = r.dotacion || "(sin dotación)";
      hcByDot.set(d, (hcByDot.get(d) ?? 0) + v);
    }
    const bByDot = new Map<string, number>();
    for (const b of fBudget) {
      const d = b.dotacion || "(sin dotación)";
      bByDot.set(d, (bByDot.get(d) ?? 0) + b.cantidad);
    }
    const names = new Set([...hcByDot.keys(), ...bByDot.keys()]);
    return Array.from(names)
      .map((name) => ({
        name,
        hc: hcByDot.get(name) ?? 0,
        presupuesto: bByDot.has(name) ? (bByDot.get(name) ?? 0) : null,
      }))
      .filter((d) => d.hc > 0 || (d.presupuesto !== null && d.presupuesto > 0))
      .sort((a, b) => b.hc - a.hc);
  }, [fAgg, fBudget, lastPeriod, modo]);

  const movData = useMemo(() => {
    const pset = new Set(periods);
    return (mov ?? [])
      .filter((m) => pset.has(m.period))
      .map((m) => ({
        label: labels[m.period],
        altas: m.altas,
        bajas: m.bajas,
        bajasNeg: -m.bajas,
      }));
  }, [mov, periods, labels]);

  const tree = useMemo(
    () => buildMatrix(fAgg, fBudget, periods, modo === "todos"),
    [fAgg, fBudget, periods, modo]
  );

  const totalNode = useMemo<MatrixNode>(() => {
    const total: MatrixNode = {
      key: "__total__",
      label: "Total general",
      level: 0,
      budget: 0,
      hc: {},
      children: [],
      dotacion: "",
    };
    for (const n of tree) {
      total.budget += n.budget;
      for (const [p, v] of Object.entries(n.hc)) {
        total.hc[p] = (total.hc[p] ?? 0) + v;
      }
    }
    return total;
  }, [tree]);

  const visibleTree = useMemo(() => filterMatrix(tree, q), [tree, q]);

  const brechas = useMemo(() => {
    if (!budgetAvailable || !lastPeriod) return null;
    const leaves: GapItem[] = [];
    const walk = (nodes: MatrixNode[]) => {
      for (const n of nodes) {
        if (n.level === 2) {
          const delta = (n.hc[lastPeriod] ?? 0) - n.budget;
          if (delta !== 0)
            leaves.push({
              label: n.label,
              dotacion: n.dotacion,
              categoria: n.categoria,
              cargo: n.cargo,
              delta,
            });
        }
        walk(n.children);
      }
    };
    walk(tree);
    const deficit = leaves.filter((l) => l.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 6);
    const sobre = leaves.filter((l) => l.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 6);
    return { deficit, sobre };
  }, [tree, budgetAvailable, lastPeriod]);

  const exportMatrix = useCallback(async () => {
    const XLSX = await import("xlsx");
    const header = [
      "Dotación / Categoría / Cargo",
      ...(budgetAvailable ? ["Presupuesto"] : []),
      ...periods.flatMap((p) =>
        budgetAvailable
          ? [`HC ${monthLabel(p, true)}`, `Dif ${monthLabel(p, true)}`]
          : [`HC ${monthLabel(p, true)}`]
      ),
    ];
    const rows: (string | number | null)[][] = [];
    const pushNode = (n: MatrixNode, indent: number) => {
      rows.push([
        `${"    ".repeat(indent)}${n.label}`,
        ...(budgetAvailable ? [n.budget || null] : []),
        ...periods.flatMap((p) => {
          const hc = n.hc[p] ?? null;
          if (!budgetAvailable) return [hc];
          return [hc, (hc ?? 0) - n.budget];
        }),
      ]);
      for (const c of n.children) pushNode(c, indent + 1);
    };
    pushNode(totalNode, 0);
    for (const n of tree) pushNode(n, 0);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = [{ wch: 44 }, ...header.slice(1).map(() => ({ wch: 10 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz HC");
    XLSX.writeFile(wb, `matriz-headcount-${year ?? ""}.xlsx`);
  }, [tree, totalNode, periods, budgetAvailable, year]);

  /* ---------- estados de página ---------- */

  if (error) {
    return (
      <EmptyState
        title="No se pudo cargar la información"
        body={error}
        action={<Button variant="primary" onClick={load}>Reintentar</Button>}
      />
    );
  }

  if (!agg || !budget) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <Skeleton className="h-9.5 w-96" />
        </div>
        <Skeleton className="h-[124px] w-full" />
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 h-[340px] lg:col-span-8" />
          <Skeleton className="col-span-12 h-[340px] lg:col-span-4" />
        </div>
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (agg.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay datos cargados"
        body="Sube la data mensual de headcount desde la plantilla para empezar a ver el dashboard."
        action={
          <Link href="/datos">
            <Button variant="primary">Cargar datos mensuales</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="fade-rise flex flex-col gap-4">
      {/* encabezado + fila única de filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
            Panel de dotación
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {lastPeriod
              ? `Último mes cargado: ${periodLabel(lastPeriod)}`
              : "Sin meses cargados para este año"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={ventana}
            onChange={(e) => setVentana(e.target.value)}
            aria-label="Periodo"
          >
            <option value="12m">Últimos 12 meses</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                Año {y}
              </option>
            ))}
          </Select>
          <Select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            aria-label="Empresa"
            className="max-w-[210px]"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
          <Segmented
            value={modo}
            onChange={setModo}
            options={[
              { value: "activos", label: "Activos" },
              { value: "todos", label: "Todos" },
            ]}
          />
        </div>
      </div>

      {/* banda de KPIs */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 bg-surface px-5 py-4 lg:col-span-1">
          <p className="text-[12px] font-medium text-ink-500">
            Dotación {modo === "activos" ? "activa" : "total"}
          </p>
          <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight text-ink-900">
            {num(hcActual)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            {deltaPpto !== null && (
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  deltaPpto < 0
                    ? "bg-danger-50 text-danger-700"
                    : deltaPpto > 0
                      ? "bg-warn-50 text-warn-600"
                      : "bg-ok-50 text-ok-600"
                }`}
              >
                {deltaPpto === 0 ? "= presupuesto" : `${signed(deltaPpto)} vs presupuesto`}
              </span>
            )}
            {hcPrev !== null && (
              <span className="text-ink-500">
                {signed(hcActual - hcPrev)} vs {prevPeriod ? labels[prevPeriod] : ""}
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface px-5 py-4">
          <p className="text-[12px] font-medium text-ink-500">Presupuesto</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
            {budgetAvailable ? num(budgetTotal) : "–"}
          </p>
          <p className="mt-2 text-[12px] text-ink-500">
            {budgetAvailable ? (
              budgetYear !== year ? (
                `Base ${budgetYear}`
              ) : (
                `Año ${budgetYear}`
              )
            ) : (
              <Link href="/presupuesto" className="text-brand-600 hover:underline">
                Cargar presupuesto
              </Link>
            )}
          </p>
        </div>

        <div className="bg-surface px-5 py-4">
          <p className="text-[12px] font-medium text-ink-500">Cobertura</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
            {cobertura !== null ? pct(cobertura) : "–"}
          </p>
          {cobertura !== null && (
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${Math.min(cobertura, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-surface px-5 py-4">
          <p className="text-[12px] font-medium text-ink-500">Altas del mes</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
            {movActual ? num(movActual.altas) : "–"}
          </p>
          <p className="mt-2 text-[12px] text-ink-500">
            {lastPeriod ? periodLabel(lastPeriod, true) : ""}
          </p>
        </div>

        <div className="bg-surface px-5 py-4">
          <p className="text-[12px] font-medium text-ink-500">Bajas del mes</p>
          <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-900">
            {movActual ? num(movActual.bajas) : "–"}
          </p>
          <p className="mt-2 text-[12px] text-ink-500">
            {movActual && movActual.bajas > 0 && lastPeriod ? (
              <button
                onClick={() =>
                  setCell({ period: lastPeriod, label: "Total general" })
                }
                className="text-brand-600 hover:underline"
              >
                Ver detalle
              </button>
            ) : lastPeriod ? (
              periodLabel(lastPeriod, true)
            ) : (
              ""
            )}
          </p>
        </div>
      </section>

      {/* fila de gráficos */}
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-8">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">
                Evolución mensual
              </h2>
              <p className="text-[12px] text-ink-500">
                Dotación {modo === "activos" ? "activa" : "total"}, {windowTitle}
              </p>
            </div>
            <LegendRow
              items={[
                { label: "Dotación", swatch: "line", color: C.brand },
                ...(budgetAvailable
                  ? [{ label: "Presupuesto", swatch: "line" as const, color: C.ref }]
                  : []),
              ]}
            />
          </header>
          <div className="px-2 pb-3">
            {evolutionData.length > 0 ? (
              <EvolutionChart data={evolutionData} />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-ink-500">
                Sin datos para este periodo.
              </p>
            )}
          </div>
        </section>

        <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-4">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">
                Por dotación
              </h2>
              <p className="text-[12px] text-ink-500">
                {lastPeriod ? periodLabel(lastPeriod, true) : ""} contra presupuesto
              </p>
            </div>
            <GapLegend />
          </header>
          <div className="px-3 pb-4">
            {dotacionData.length > 0 ? (
              <GapMeters
                rows={dotacionData}
                onRowClick={(name) =>
                  lastPeriod &&
                  setCell(
                    toDrawer({
                      period: lastPeriod,
                      dotacion: name === "(sin dotación)" ? "" : name,
                      label: name,
                    })
                  )
                }
              />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-ink-500">
                Sin datos para este filtro.
              </p>
            )}
          </div>
        </section>

        <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-5">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">
                Altas y bajas
              </h2>
              <p className="text-[12px] text-ink-500">
                Movimientos de personal, {windowTitle}
              </p>
            </div>
            <LegendRow
              items={[
                { label: "Altas", swatch: "bar", color: C.brand },
                { label: "Bajas", swatch: "bar", color: C.danger },
              ]}
            />
          </header>
          <div className="px-2 pb-3">
            {movData.length > 0 ? (
              <MovimientosChart data={movData} />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-ink-500">
                Sin movimientos para este periodo.
              </p>
            )}
          </div>
        </section>

        <section className="col-span-12 rounded-[12px] border border-line bg-surface lg:col-span-7">
          <header className="px-5 pb-2 pt-4">
            <h2 className="text-[14px] font-semibold text-ink-900">
              Mayores brechas vs presupuesto
            </h2>
            <p className="text-[12px] text-ink-500">
              Por cargo, {lastPeriod ? periodLabel(lastPeriod, true) : ""}
            </p>
          </header>
          {brechas ? (
            <div className="grid grid-cols-1 gap-x-8 px-5 pb-4 sm:grid-cols-2">
              <GapList
                title="Déficit"
                items={brechas.deficit}
                tone="deficit"
                onItem={(it) =>
                  lastPeriod &&
                  setCell(
                    toDrawer({
                      period: lastPeriod,
                      dotacion: it.dotacion,
                      categoria: it.categoria,
                      cargo: it.cargo,
                      label: it.label,
                    })
                  )
                }
              />
              <GapList
                title="Sobre presupuesto"
                items={brechas.sobre}
                tone="sobre"
                onItem={(it) =>
                  lastPeriod &&
                  setCell(
                    toDrawer({
                      period: lastPeriod,
                      dotacion: it.dotacion,
                      categoria: it.categoria,
                      cargo: it.cargo,
                      label: it.label,
                    })
                  )
                }
              />
            </div>
          ) : (
            <p className="px-5 pb-6 text-sm text-ink-500">
              Carga el presupuesto para comparar la dotación contra la base.{" "}
              <Link href="/presupuesto" className="text-brand-600 hover:underline">
                Ir a presupuesto
              </Link>
            </p>
          )}
        </section>
      </div>

      {/* matriz jerárquica */}
      <section className="rounded-[12px] border border-line bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-ink-900">
              Matriz por dotación, categoría y cargo
            </h2>
            <p className="text-[12px] text-ink-500">
              HC por mes y diferencia contra presupuesto. Clic en una celda para ver a las personas.
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
                placeholder="Buscar cargo o área"
                className="w-52 pl-9"
              />
            </div>
            <Button size="sm" onClick={() => setExpandSignal((s) => s + 1)}>
              <ArrowsOutSimple size={14} /> Expandir
            </Button>
            <Button size="sm" onClick={() => setExpandSignal((s) => s - 1)}>
              <ArrowsInSimple size={14} /> Colapsar
            </Button>
            <Button size="sm" onClick={exportMatrix}>
              <DownloadSimple size={14} /> Exportar
            </Button>
          </div>
        </header>
        {periods.length > 0 ? (
          <MatrixTable
            nodes={visibleTree}
            totalNode={totalNode}
            periods={periods}
            labels={labels}
            budgetAvailable={budgetAvailable}
            onCellClick={(f) => setCell(toDrawer(f))}
            expandSignal={expandSignal}
          />
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            Sin meses cargados para este periodo.
          </p>
        )}
      </section>

      <DetailDrawer
        filter={cell}
        empresa={empresa || null}
        onClose={() => setCell(null)}
      />
    </div>
  );
}

type GapItem = {
  label: string;
  dotacion: string;
  categoria?: string;
  cargo?: string;
  delta: number;
};

function GapList({
  title,
  items,
  tone,
  onItem,
}: {
  title: string;
  items: GapItem[];
  tone: "deficit" | "sobre";
  onItem: (it: GapItem) => void;
}) {
  const itemCls =
    tone === "deficit"
      ? "bg-danger-50 hover:bg-danger-100"
      : "bg-warn-50 hover:bg-warn-100";
  const valueCls = tone === "deficit" ? "text-danger-600" : "text-warn-600";

  return (
    <div>
      <p className="border-b border-line pb-1.5 text-[12px] font-medium text-ink-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-[8px] bg-ok-50 px-3 py-3 text-[13px] font-medium text-ok-600">
          Sin brechas. Todo en línea con el presupuesto.
        </p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={`${it.label}-${it.dotacion}`}>
              <button
                onClick={() => onItem(it)}
                className={`flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-1.5 text-left transition-colors ${itemCls}`}
                title="Ver en detalle"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink-900">
                    {it.label}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-500">
                    {it.dotacion}
                  </span>
                </span>
                <span
                  className={`tnum shrink-0 font-mono text-[13px] font-semibold ${valueCls}`}
                >
                  {signed(it.delta)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
