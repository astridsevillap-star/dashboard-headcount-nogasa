"use client";

import type {
  Admin,
  Dimension,
  DimensionScore,
  Evaluacion,
  Evaluado,
  EvolutionPoint,
  MatrixNode,
  MergeCampo,
  MergeRule,
  Meta,
} from "./types";
import {
  DIMENSIONES,
  EVALUADOS,
  PERIODOS,
  SEED_ADMINS,
  seedEvaluaciones,
  seedMetas,
} from "./seed";
import { parsePeriod, quarterLabel } from "./format";

/* ---------------------------------------------------------------------------
   Store de la versión estándar: los datos semilla se cargan una vez y las
   ediciones se persisten en localStorage. Aislar aquí la lectura/escritura
   permite reemplazar este archivo por llamadas a un backend sin tocar la UI.
--------------------------------------------------------------------------- */

const KEY = "ec_store_v1";

export type Store = {
  evaluados: Evaluado[];
  evaluaciones: Evaluacion[];
  metas: Meta[];
  rules: MergeRule[];
  admins: Admin[];
};

function seedStore(): Store {
  return {
    evaluados: EVALUADOS.map((e) => ({ ...e })),
    evaluaciones: seedEvaluaciones(),
    metas: seedMetas(),
    rules: [],
    admins: SEED_ADMINS.map((a) => ({ ...a })),
  };
}

let cache: Store | null = null;

export function loadStore(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seedStore();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as Store;
      return cache;
    }
  } catch {
    /* storage bloqueado: se usa la semilla en memoria */
  }
  cache = seedStore();
  persist();
  return cache;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignora cuotas/permiso: la sesión mantiene el estado en memoria */
  }
}

export function mutate(fn: (s: Store) => void): Store {
  const s = loadStore();
  fn(s);
  persist();
  return s;
}

export function resetStore() {
  cache = seedStore();
  persist();
}

/* ---------- lecturas base ---------- */

export const dimensiones: Dimension[] = DIMENSIONES;
export const periodos: string[] = PERIODOS;

export function empresas(s: Store): string[] {
  return Array.from(new Set(s.evaluados.map((e) => mapField(s, "empresa", e.empresa)))).sort(
    (a, b) => a.localeCompare(b, "es")
  );
}

export function anios(): number[] {
  return Array.from(new Set(PERIODOS.map((p) => parsePeriod(p).y))).sort();
}

export function periodosDe(anio: number): string[] {
  return PERIODOS.filter((p) => parsePeriod(p).y === anio);
}

/* ---------- homologación (reglas) ---------- */

function normKey(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapField(s: Store, campo: MergeCampo, value: string): string {
  const key = normKey(value);
  for (const r of s.rules) {
    if (r.activo && r.campo === campo && normKey(r.origen) === key) return r.destino.trim();
  }
  return value;
}

/** Evaluados con empresa/área/cargo ya homologados para mostrar. */
export function evaluadosView(s: Store): Evaluado[] {
  return s.evaluados.map((e) => ({
    ...e,
    empresa: mapField(s, "empresa", e.empresa),
    area: mapField(s, "area", e.area),
    cargo: mapField(s, "cargo", e.cargo),
  }));
}

/* ---------- agregaciones ---------- */

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Índice cultural (promedio de dimensiones) de un evaluado en un periodo. */
export function indiceEvaluado(
  s: Store,
  evaluadoId: string,
  period: string
): number | null {
  const rows = s.evaluaciones.filter(
    (e) => e.evaluadoId === evaluadoId && e.period === period
  );
  if (rows.length === 0) return null;
  return round1(rows.reduce((a, r) => a + r.score, 0) / rows.length);
}

/** Puntajes por dimensión (promedio sobre un conjunto de evaluados) en un periodo. */
export function dimensionScores(
  s: Store,
  evaluadoIds: Set<string>,
  period: string,
  anio: number
): DimensionScore[] {
  return DIMENSIONES.map((d) => {
    const rows = s.evaluaciones.filter(
      (e) =>
        e.dimensionId === d.id &&
        e.period === period &&
        evaluadoIds.has(e.evaluadoId)
    );
    const score = rows.length
      ? round1(rows.reduce((a, r) => a + r.score, 0) / rows.length)
      : 0;
    const meta = s.metas.find((m) => m.anio === anio && m.dimensionId === d.id);
    return { dimensionId: d.id, nombre: d.nombre, score, objetivo: meta?.objetivo ?? 4 };
  });
}

/** Índice general (promedio de todas las calificaciones) de un conjunto en un periodo. */
export function indiceGeneral(
  s: Store,
  evaluadoIds: Set<string>,
  period: string
): number | null {
  const rows = s.evaluaciones.filter(
    (e) => e.period === period && evaluadoIds.has(e.evaluadoId)
  );
  if (rows.length === 0) return null;
  return round1(rows.reduce((a, r) => a + r.score, 0) / rows.length);
}

/** Meta general del año (promedio de las metas por dimensión). */
export function metaGeneral(s: Store, anio: number): number {
  const rows = s.metas.filter((m) => m.anio === anio);
  if (rows.length === 0) return 4;
  return round1(rows.reduce((a, r) => a + r.objetivo, 0) / rows.length);
}

/** Cuántos evaluados del conjunto tienen al menos una calificación en el periodo. */
export function cobertura(
  s: Store,
  evaluadoIds: Set<string>,
  period: string
): { evaluados: number; total: number } {
  const conNota = new Set(
    s.evaluaciones
      .filter((e) => e.period === period && evaluadoIds.has(e.evaluadoId))
      .map((e) => e.evaluadoId)
  );
  return { evaluados: conNota.size, total: evaluadoIds.size };
}

/** Evolución del índice general por periodo, contra la meta del año. */
export function evolution(
  s: Store,
  evaluadoIds: Set<string>
): EvolutionPoint[] {
  return PERIODOS.map((p, i) => {
    const { y } = parsePeriod(p);
    const crossYear =
      new Set(PERIODOS.map((x) => parsePeriod(x).y)).size > 1;
    return {
      period: p,
      label: quarterLabel(p, crossYear || i === 0),
      indice: indiceGeneral(s, evaluadoIds, p),
      objetivo: metaGeneral(s, y),
    };
  });
}

/** Ranking de evaluados por índice en un periodo (desc). */
export function ranking(
  s: Store,
  evaluadoIds: Set<string>,
  period: string
): { evaluado: Evaluado; indice: number | null }[] {
  const view = evaluadosView(s);
  return view
    .filter((e) => evaluadoIds.has(e.id))
    .map((e) => ({ evaluado: e, indice: indiceEvaluado(s, e.id, period) }))
    .filter((r) => r.indice !== null)
    .sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0));
}

/** Matriz Empresa → Área → Evaluado con índice por periodo. */
export function buildMatrix(
  s: Store,
  evaluadoIds: Set<string>,
  periods: string[]
): MatrixNode[] {
  const view = evaluadosView(s);
  const roots = new Map<string, MatrixNode>();

  const mk = (
    key: string,
    label: string,
    level: 0 | 1 | 2,
    empresa: string,
    area?: string,
    evaluadoId?: string,
    cargo?: string
  ): MatrixNode => ({
    key, label, level, empresa, area, evaluadoId, cargo,
    indice: {}, count: {}, children: [],
  });

  for (const ev of view) {
    if (!evaluadoIds.has(ev.id)) continue;
    let root = roots.get(ev.empresa);
    if (!root) {
      root = mk(ev.empresa, ev.empresa, 0, ev.empresa);
      roots.set(ev.empresa, root);
    }
    let area = root.children.find((n) => n.label === ev.area);
    if (!area) {
      area = mk(`${ev.empresa}›${ev.area}`, ev.area, 1, ev.empresa, ev.area);
      root.children.push(area);
    }
    const leaf = mk(
      `${ev.empresa}›${ev.area}›${ev.id}`,
      ev.nombre, 2, ev.empresa, ev.area, ev.id, ev.cargo
    );
    for (const p of periods) {
      const idx = indiceEvaluado(s, ev.id, p);
      if (idx !== null) {
        leaf.indice[p] = idx;
        leaf.count[p] = 1;
      }
    }
    area.children.push(leaf);
  }

  // promedios ascendentes (área y empresa = promedio de hijos con nota)
  const rollup = (n: MatrixNode) => {
    if (n.level === 2) return;
    for (const c of n.children) rollup(c);
    for (const p of periods) {
      let sum = 0;
      let cnt = 0;
      for (const c of n.children) {
        const v = c.indice[p];
        const w = c.count[p] ?? 0;
        if (v !== null && v !== undefined && w > 0) {
          sum += v * w;
          cnt += w;
        }
      }
      n.count[p] = cnt;
      n.indice[p] = cnt > 0 ? round1(sum / cnt) : null;
    }
  };
  const sortRec = (list: MatrixNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label, "es"));
    for (const n of list) sortRec(n.children);
  };

  const out = Array.from(roots.values());
  for (const r of out) rollup(r);
  sortRec(out);
  return out;
}

/* ---------- helpers de selección ---------- */

export function idsForEmpresa(s: Store, empresa: string | null): Set<string> {
  const view = evaluadosView(s);
  return new Set(
    view.filter((e) => empresa === null || e.empresa === empresa).map((e) => e.id)
  );
}

/** Color semántico según el índice frente a la meta. */
export function toneFor(indice: number | null, meta: number): "ok" | "warn" | "bad" | "none" {
  if (indice === null) return "none";
  const d = indice - meta;
  if (d >= 0) return "ok";
  if (d >= -0.5) return "warn";
  return "bad";
}
