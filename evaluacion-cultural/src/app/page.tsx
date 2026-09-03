"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { KpiCard, Segmented, Select, SectionCard, Skeleton } from "@/components/ui";
import { CompetenciaBars, CompetenciaRadar, LegendRow, C } from "@/components/charts";
import { EvaluadoDrawer } from "@/components/drawer";
import {
  areas as areasOf,
  buildMatrix,
  competencias,
  consolidado,
  evaluadosFiltrados,
  indiceGeneral,
  loadStore,
  metaGeneral,
  NIVEL_LABEL,
  nivelesEvaluados,
  participacionGeneral,
  ranking,
  regiones as regionesOf,
  toneFor,
  type Store,
} from "@/lib/data";
import { EDICION } from "@/lib/seed";
import { score, signedScore, pct } from "@/lib/format";
import type { MatrixNode, Nivel, Persona } from "@/lib/types";

export default function DashboardPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [nivel, setNivel] = useState<string>("__all__");
  const [area, setArea] = useState<string>("__all__");
  const [region, setRegion] = useState<string>("__all__");
  const [vista, setVista] = useState<"barras" | "radar">("radar");
  const [drawer, setDrawer] = useState<Persona | null>(null);

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

  const filtro = {
    nivel: nivel === "__all__" ? null : (Number(nivel) as Nivel),
    area: area === "__all__" ? null : area,
    region: region === "__all__" ? null : region,
  };
  const set = evaluadosFiltrados(store, filtro);
  const meta = metaGeneral(store);
  const indice = indiceGeneral(store, set);
  const part = participacionGeneral(store, set);
  const comp = consolidado(store, set);
  const rank = ranking(store, set);
  const matrix = buildMatrix(store, set);

  const conDatos = comp.filter((c) => c.score > 0);
  const alta = [...conDatos].sort((a, b) => b.score - a.score)[0];
  const baja = [...conDatos].sort((a, b) => a.score - b.score)[0];
  const brecha = indice === null ? null : indice - meta;
  const cobertura = part.esperados ? (part.respondientes / part.esperados) * 100 : 0;

  return (
    <div className="fade-rise flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
            Dashboard de resultados
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Evaluación cultural {EDICION} · {set.length} líderes evaluados
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="__all__">Todos los niveles</option>
            {nivelesEvaluados(store).map((n) => (
              <option key={n} value={n}>
                {NIVEL_LABEL[n]}
              </option>
            ))}
          </Select>
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="__all__">Todas las áreas</option>
            {areasOf(store).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          {regionesOf(store).length > 0 && (
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="__all__">Todas las regiones</option>
              {regionesOf(store).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

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
          label="Participación"
          value={part.esperados ? pct(cobertura) : "–"}
          hint={`${part.respondientes} de ${part.esperados} respuestas`}
        />
        <KpiCard
          label="Competencia más baja"
          value={baja ? score(baja.score) : "–"}
          hint={baja ? baja.nombre : "Sin datos"}
          tone={baja ? (baja.score >= meta ? "ok" : baja.score >= meta - 0.5 ? "warn" : "bad") : "neutral"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            title="Resultado por competencia"
            desc={alta && baja ? `Más alta: ${alta.nombre} · más baja: ${baja.nombre}` : "Promedio por competencia"}
            right={
              <Segmented
                value={vista}
                onChange={setVista}
                options={[
                  { value: "radar", label: "Radar" },
                  { value: "barras", label: "Barras" },
                ]}
              />
            }
          >
            {vista === "radar" ? <CompetenciaRadar data={comp} /> : <CompetenciaBars data={comp} />}
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard title="Ranking de evaluados" desc="Índice cultural (mayor a menor)">
            <div className="flex max-h-[320px] flex-col overflow-y-auto">
              {rank.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-500">Sin datos.</p>
              )}
              {rank.map((r, i) => (
                <button
                  key={r.evaluado.id}
                  onClick={() => setDrawer(r.evaluado)}
                  className="flex items-center gap-3 border-b border-line-soft py-2 text-left last:border-0 hover:bg-line-soft/60"
                >
                  <span className="w-5 tnum text-right font-mono text-[12px] text-ink-400">{i + 1}</span>
                  <span className="flex-1 truncate text-[13px] text-ink-700">
                    {r.evaluado.nombre}
                    <span className="ml-1.5 text-[11px] text-ink-400">{r.evaluado.area}</span>
                  </span>
                  <span
                    className={`tnum font-mono text-[13px] font-semibold ${
                      (r.indice ?? 0) >= meta ? "text-ok-600" : (r.indice ?? 0) >= meta - 0.5 ? "text-warn-600" : "text-danger-600"
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

      <SectionCard
        title="Matriz Área › Evaluado"
        desc="Índice y puntaje por competencia. Clic en un evaluado para ver el detalle."
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
        <Matrix nodes={matrix} meta={meta} onPick={setDrawer} store={store} />
      </SectionCard>

      <EvaluadoDrawer store={store} evaluado={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}

function Matrix({
  nodes,
  meta,
  onPick,
  store,
}: {
  nodes: MatrixNode[];
  meta: number;
  onPick: (p: Persona) => void;
  store: Store;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(nodes.map((n) => n.key)));

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const personaById = useMemo(() => {
    const m = new Map<string, Persona>();
    for (const p of store.personas) m.set(p.id, p);
    return m;
  }, [store]);

  const toneBg = (v: number | null) => {
    const t = toneFor(v, meta);
    if (t === "ok") return "bg-ok-50 text-ok-600";
    if (t === "warn") return "bg-warn-50 text-warn-600";
    if (t === "bad") return "bg-danger-50 text-danger-600";
    return "text-ink-300";
  };

  const rows: { node: MatrixNode; depth: number }[] = [];
  for (const root of nodes) {
    rows.push({ node: root, depth: 0 });
    if (expanded.has(root.key)) for (const c of root.children) rows.push({ node: c, depth: 1 });
  }

  return (
    <div className="matrix-scroll overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface pb-2 text-left text-[12px] font-medium text-ink-500">
              Estructura
            </th>
            <th className="min-w-[60px] pb-2 text-center text-[12px] font-medium text-ink-500">Índice</th>
            {competencias.map((c) => (
              <th key={c.id} className="min-w-[70px] px-1 pb-2 text-center text-[11px] font-medium text-ink-500">
                {c.nombre}
              </th>
            ))}
            <th className="min-w-[70px] pb-2 text-center text-[12px] font-medium text-ink-500">Part.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, depth }) => {
            const isLeaf = node.level === 1;
            return (
              <tr key={node.key} className="group">
                <td
                  className="sticky left-0 z-10 whitespace-nowrap border-b border-line-soft bg-surface py-2 pr-4 group-hover:bg-line-soft/50"
                  style={{ paddingLeft: depth * 18 + 4 }}
                >
                  <div className="flex items-center gap-1.5">
                    {!isLeaf ? (
                      <button
                        onClick={() => toggle(node.key)}
                        className="flex h-4 w-4 items-center justify-center text-ink-400 hover:text-ink-900"
                        aria-label={expanded.has(node.key) ? "Colapsar" : "Expandir"}
                      >
                        <CaretRight size={12} weight="bold" className={`transition-transform ${expanded.has(node.key) ? "rotate-90" : ""}`} />
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                    {isLeaf && node.evaluadoId ? (
                      <button
                        onClick={() => {
                          const p = personaById.get(node.evaluadoId!);
                          if (p) onPick(p);
                        }}
                        className="text-left text-[13px] text-ink-700 hover:text-brand-600"
                      >
                        {node.label}
                        {node.cargo && <span className="ml-1.5 text-[11px] text-ink-400">· {node.cargo}</span>}
                      </button>
                    ) : (
                      <span className="text-[13px] font-semibold text-ink-900">{node.label}</span>
                    )}
                  </div>
                </td>
                <td className="border-b border-line-soft py-2 text-center group-hover:bg-line-soft/50">
                  <span className={`inline-block min-w-[46px] rounded-[6px] px-2 py-0.5 tnum font-mono text-[12px] font-semibold ${toneBg(node.indice)}`}>
                    {score(node.indice)}
                  </span>
                </td>
                {competencias.map((c) => (
                  <td key={c.id} className="border-b border-line-soft py-2 text-center group-hover:bg-line-soft/50">
                    <span className={`tnum font-mono text-[12px] ${toneBg(node.porCompetencia[c.id] ?? null).replace(/bg-\S+/, "")}`}>
                      {score(node.porCompetencia[c.id] ?? null)}
                    </span>
                  </td>
                ))}
                <td className="border-b border-line-soft py-2 text-center text-[11px] text-ink-500 group-hover:bg-line-soft/50">
                  {node.esperados ? `${node.respondientes}/${node.esperados}` : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
