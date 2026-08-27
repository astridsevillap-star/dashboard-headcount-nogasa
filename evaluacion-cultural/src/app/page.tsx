"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { KpiCard, Segmented, Select, SectionCard, Skeleton } from "@/components/ui";
import {
  DimensionBars,
  DimensionRadar,
  EvolutionChart,
  LegendRow,
  C,
} from "@/components/charts";
import { EvaluadoDrawer } from "@/components/drawer";
import {
  anios,
  buildMatrix,
  cobertura,
  dimensionScores,
  evolution,
  idsForEmpresa,
  indiceGeneral,
  loadStore,
  metaGeneral,
  periodosDe,
  ranking,
  toneFor,
  empresas as empresasOf,
  type Store,
} from "@/lib/data";
import { periodLabel, quarterLabel, score, signedScore, pct } from "@/lib/format";
import type { Evaluado, MatrixNode } from "@/lib/types";

export default function DashboardPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [empresa, setEmpresa] = useState<string>("__all__");
  const [anio, setAnio] = useState<number>(() => anios().at(-1) ?? 2026);
  const [vista, setVista] = useState<"barras" | "radar">("barras");
  const [drawer, setDrawer] = useState<{ ev: Evaluado; period: string } | null>(null);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  if (!store) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <Dashboard
      store={store}
      empresa={empresa}
      setEmpresa={setEmpresa}
      anio={anio}
      setAnio={setAnio}
      vista={vista}
      setVista={setVista}
      drawer={drawer}
      setDrawer={setDrawer}
    />
  );
}

function Dashboard({
  store,
  empresa,
  setEmpresa,
  anio,
  setAnio,
  vista,
  setVista,
  drawer,
  setDrawer,
}: {
  store: Store;
  empresa: string;
  setEmpresa: (v: string) => void;
  anio: number;
  setAnio: (v: number) => void;
  vista: "barras" | "radar";
  setVista: (v: "barras" | "radar") => void;
  drawer: { ev: Evaluado; period: string } | null;
  setDrawer: (v: { ev: Evaluado; period: string } | null) => void;
}) {
  const empresaFilter = empresa === "__all__" ? null : empresa;
  const ids = useMemo(() => idsForEmpresa(store, empresaFilter), [store, empresaFilter]);
  const periods = useMemo(() => periodosDe(anio), [anio]);
  const focus = periods.at(-1) ?? periods[0];

  const meta = metaGeneral(store, anio);
  const indice = indiceGeneral(store, ids, focus);
  const cob = cobertura(store, ids, focus);
  const dims = useMemo(
    () => dimensionScores(store, ids, focus, anio),
    [store, ids, focus, anio]
  );
  const evo = useMemo(() => evolution(store, ids), [store, ids]);
  const rank = useMemo(() => ranking(store, ids, focus), [store, ids, focus]);
  const matrix = useMemo(() => buildMatrix(store, ids, periods), [store, ids, periods]);

  const debil = [...dims].filter((d) => d.score > 0).sort((a, b) => a.score - b.score)[0];
  const fuerte = [...dims].sort((a, b) => b.score - a.score)[0];
  const brecha = indice === null ? null : indice - meta;

  const empresaOptions = empresasOf(store);

  return (
    <div className="fade-rise flex flex-col gap-5">
      {/* encabezado + filtros */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
            Panel de evaluación cultural
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Índice cultural por evaluado y dimensión · {periodLabel(focus)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="__all__">Todas las empresas</option>
            {empresaOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
          <Select value={String(anio)} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Índice cultural"
          value={score(indice)}
          hint={`Escala 1–5 · meta ${score(meta)}`}
          tone={brecha === null ? "neutral" : brecha >= 0 ? "ok" : brecha >= -0.5 ? "warn" : "bad"}
        />
        <KpiCard
          label="Brecha vs meta"
          value={brecha === null ? "–" : signedScore(brecha)}
          hint={`Objetivo general ${score(meta)}`}
          tone={brecha === null ? "neutral" : brecha >= 0 ? "ok" : brecha >= -0.5 ? "warn" : "bad"}
        />
        <KpiCard
          label="Cobertura"
          value={cob.total ? pct((cob.evaluados / cob.total) * 100) : "–"}
          hint={`${cob.evaluados} de ${cob.total} evaluados`}
        />
        <KpiCard
          label="Dimensión más baja"
          value={debil ? score(debil.score) : "–"}
          hint={debil ? debil.nombre : "Sin datos"}
          tone={debil ? (debil.score >= meta ? "ok" : debil.score >= meta - 0.5 ? "warn" : "bad") : "neutral"}
        />
      </div>

      {/* evolución */}
      <SectionCard
        title="Evolución del índice cultural"
        desc="Promedio de todas las dimensiones por trimestre, contra la meta del año."
        right={
          <LegendRow
            items={[
              { label: "Índice", swatch: "line", color: C.brand },
              { label: "Meta", swatch: "line", color: C.ref },
            ]}
          />
        }
      >
        <EvolutionChart data={evo} />
      </SectionCard>

      {/* comparativo por dimensión + ranking */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            title="Puntaje por dimensión"
            desc={`${periodLabel(focus)} · la línea punteada marca la meta`}
            right={
              <Segmented
                value={vista}
                onChange={setVista}
                options={[
                  { value: "barras", label: "Barras" },
                  { value: "radar", label: "Radar" },
                ]}
              />
            }
          >
            {vista === "barras" ? <DimensionBars data={dims} /> : <DimensionRadar data={dims} />}
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard
            title="Ranking de evaluados"
            desc={`Índice cultural · ${periodLabel(focus)}`}
          >
            <div className="flex flex-col">
              {rank.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-500">Sin datos del periodo.</p>
              )}
              {rank.map((r, i) => (
                <button
                  key={r.evaluado.id}
                  onClick={() => setDrawer({ ev: r.evaluado, period: focus })}
                  className="flex items-center gap-3 border-b border-line-soft py-2 text-left last:border-0 hover:bg-line-soft/60"
                >
                  <span className="w-5 tnum text-right font-mono text-[12px] text-ink-400">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-ink-700">
                    {r.evaluado.nombre}
                    <span className="ml-1.5 text-[11px] text-ink-400">{r.evaluado.area}</span>
                  </span>
                  <span
                    className={`tnum font-mono text-[13px] font-semibold ${
                      (r.indice ?? 0) >= meta
                        ? "text-ok-600"
                        : (r.indice ?? 0) >= meta - 0.5
                          ? "text-warn-600"
                          : "text-danger-600"
                    }`}
                  >
                    {score(r.indice)}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* matriz */}
      <SectionCard
        title="Matriz Empresa › Área › Evaluado"
        desc="Índice cultural por trimestre. Clic en una celda para ver el detalle de la persona."
        right={
          <LegendRow
            items={[
              { label: "≥ meta", swatch: "bar", color: C.ok },
              { label: "brecha leve", swatch: "bar", color: C.warn },
              { label: "brecha crítica", swatch: "bar", color: C.danger },
            ]}
          />
        }
      >
        <Matrix
          store={store}
          nodes={matrix}
          periods={periods}
          anio={anio}
          onPick={(ev, period) => setDrawer({ ev, period })}
        />
      </SectionCard>

      <EvaluadoDrawer
        store={store}
        evaluado={drawer?.ev ?? null}
        period={drawer?.period ?? focus}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}

/* ---------- matriz ---------- */

function Matrix({
  store,
  nodes,
  periods,
  anio,
  onPick,
}: {
  store: Store;
  nodes: MatrixNode[];
  periods: string[];
  anio: number;
  onPick: (ev: Evaluado, period: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.map((n) => n.key)));
  const meta = metaGeneral(store, anio);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const evaluadoById = useMemo(() => {
    const m = new Map<string, Evaluado>();
    for (const e of store.evaluados) m.set(e.id, e);
    return m;
  }, [store]);

  const rows: { node: MatrixNode; depth: number }[] = [];
  const walk = (list: MatrixNode[], depth: number) => {
    for (const n of list) {
      rows.push({ node: n, depth });
      if (n.level < 2 && expanded.has(n.key)) walk(n.children, depth + 1);
    }
  };
  walk(nodes, 0);

  const toneBg = (indice: number | null) => {
    const t = toneFor(indice, meta);
    if (t === "ok") return "bg-ok-50 text-ok-600";
    if (t === "warn") return "bg-warn-50 text-warn-600";
    if (t === "bad") return "bg-danger-50 text-danger-600";
    return "text-ink-300";
  };

  return (
    <div className="matrix-scroll overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface pb-2 text-left text-[12px] font-medium text-ink-500">
              Estructura
            </th>
            {periods.map((p) => (
              <th
                key={p}
                className="min-w-[64px] pb-2 text-center text-[12px] font-medium text-ink-500"
              >
                {quarterLabel(p, true)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, depth }) => {
            const isLeaf = node.level === 2;
            const canExpand = node.level < 2;
            return (
              <tr key={node.key} className="group">
                <td
                  className="sticky left-0 z-10 whitespace-nowrap border-b border-line-soft bg-surface py-2 pr-4 group-hover:bg-line-soft/50"
                  style={{ paddingLeft: depth * 18 + 4 }}
                >
                  <div className="flex items-center gap-1.5">
                    {canExpand ? (
                      <button
                        onClick={() => toggle(node.key)}
                        className="flex h-4 w-4 items-center justify-center text-ink-400 hover:text-ink-900"
                        aria-label={expanded.has(node.key) ? "Colapsar" : "Expandir"}
                      >
                        <CaretRight
                          size={12}
                          weight="bold"
                          className={`transition-transform ${expanded.has(node.key) ? "rotate-90" : ""}`}
                        />
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                    <span
                      className={`text-[13px] ${
                        node.level === 0
                          ? "font-semibold text-ink-900"
                          : node.level === 1
                            ? "font-medium text-ink-700"
                            : "text-ink-700"
                      }`}
                    >
                      {node.label}
                    </span>
                    {isLeaf && node.cargo && (
                      <span className="text-[11px] text-ink-400">· {node.cargo}</span>
                    )}
                  </div>
                </td>
                {periods.map((p) => {
                  const v = node.indice[p] ?? null;
                  const cell = (
                    <span
                      className={`inline-block min-w-[52px] rounded-[6px] px-2 py-0.5 text-center tnum font-mono text-[12px] font-medium ${toneBg(v)}`}
                    >
                      {score(v)}
                    </span>
                  );
                  return (
                    <td
                      key={p}
                      className="border-b border-line-soft py-2 text-center align-middle group-hover:bg-line-soft/50"
                    >
                      {isLeaf && v !== null && node.evaluadoId ? (
                        <button
                          onClick={() => {
                            const ev = evaluadoById.get(node.evaluadoId!);
                            if (ev) onPick(ev, p);
                          }}
                          className="transition-transform hover:scale-[1.04]"
                          title="Ver detalle"
                        >
                          {cell}
                        </button>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
