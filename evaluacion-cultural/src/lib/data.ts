"use client";

import type {
  Admin,
  Audiencia,
  Competencia,
  CompetenciaScore,
  MatrixNode,
  Meta,
  Nivel,
  Persona,
  Pregunta,
  Resultado,
} from "./types";
import {
  COMPETENCIAS,
  PREGUNTAS,
  SEED_ADMINS,
  seedMetas,
} from "./seed";
import { ROSTER } from "./roster";
import { buildCodes, type CodeMap } from "./codes";

let codeCache: CodeMap | null = null;
/** Mapa código↔evaluador (memoizado sobre el padrón semilla). */
export function codeMap(s: Store): CodeMap {
  if (!codeCache) codeCache = buildCodes(s.personas);
  return codeCache;
}

/* ---------------------------------------------------------------------------
   Store de la versión estándar: datos semilla + persistencia en localStorage.
   La lectura/escritura está aislada aquí para poder conectar un backend real
   (p. ej. Supabase) sin tocar la UI.
--------------------------------------------------------------------------- */

const KEY = "ec_store_v2";

/** Niveles que reciben evaluación (los líderes). N4 son evaluadores. */
export const EVALUAR_NIVELES: Nivel[] = [1, 2, 3];

export type Store = {
  personas: Persona[];
  preguntas: Pregunta[];
  metas: Meta[];
  admins: Admin[];
  resultados: Resultado[];
  /** nº de evaluaciones (evaluadores que respondieron) recibidas por evaluado */
  submissions: Record<string, number>;
};

/* ---------- relaciones (dependen solo del padrón) ---------- */

export function audienciaDe(nivel: Nivel): Audiencia {
  // Solo el Gerente (N1) usa el cuestionario gerencial de 20 preguntas;
  // N2, N3 y N4 usan el general de 8.
  return nivel === 1 ? "gerencial" : "general";
}

export function esEvaluado(p: Persona): boolean {
  return EVALUAR_NIVELES.includes(p.nivel);
}

/** Evaluadores asignados a un evaluado (cascada ascendente; región en niveles altos). */
export function evaluadoresDe(personas: Persona[], evaluado: Persona): Persona[] {
  if (evaluado.nivel === 3) {
    return personas.filter((p) => p.nivel === 4 && p.area === evaluado.area);
  }
  if (evaluado.nivel === 2) {
    const conRegion = personas.filter(
      (p) => p.nivel === 3 && evaluado.region && p.region === evaluado.region
    );
    return conRegion.length ? conRegion : personas.filter((p) => p.nivel === 3);
  }
  if (evaluado.nivel === 1) {
    return personas.filter((p) => p.nivel === 2);
  }
  return [];
}

/** Personas que un evaluador debe evaluar (inverso de evaluadoresDe). */
export function evaluadosDe(personas: Persona[], evaluador: Persona): Persona[] {
  if (evaluador.nivel === 4) {
    return personas.filter((p) => p.nivel === 3 && p.area === evaluador.area);
  }
  if (evaluador.nivel === 3) {
    const conRegion = personas.filter(
      (p) => p.nivel === 2 && evaluador.region && p.region === evaluador.region
    );
    return conRegion.length ? conRegion : personas.filter((p) => p.nivel === 2);
  }
  if (evaluador.nivel === 2) {
    return personas.filter((p) => p.nivel === 1);
  }
  return [];
}

export function preguntasActivas(preguntas: Pregunta[], audiencia: Audiencia): Pregunta[] {
  return preguntas.filter((q) => q.activa && q.audiencia === audiencia);
}

export function preguntasDe(store: Store, evaluado: Persona): Pregunta[] {
  return preguntasActivas(store.preguntas, audienciaDe(evaluado.nivel));
}

/* ---------- seed de resultados (respuestas simuladas) ---------- */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number) => Math.max(1, Math.min(5, v));

/** Promedio (1–5) de una distribución de frecuencias. null si no hay respuestas. */
export function avgOf(dist: number[]): number | null {
  const n = dist.reduce((a, b) => a + b, 0);
  if (n === 0) return null;
  let s = 0;
  for (let k = 0; k < dist.length; k++) s += (k + 1) * dist[k];
  return s / n;
}
export const nOf = (dist: number[]): number => dist.reduce((a, b) => a + b, 0);
/** Resultado en escala 0–100 % (promedio / 5 · 100), como en la referencia. */
export function pctOf(dist: number[]): number | null {
  const avg = avgOf(dist);
  return avg === null ? null : Math.round((avg / 5) * 100);
}

function seedResultados(personas: Persona[], preguntas: Pregunta[]): {
  resultados: Resultado[];
  submissions: Record<string, number>;
} {
  const resultados: Resultado[] = [];
  const submissions: Record<string, number> = {};
  for (const ev of personas) {
    if (!EVALUAR_NIVELES.includes(ev.nivel)) continue;
    const esperados = evaluadoresDe(personas, ev).length;
    if (esperados === 0) continue;
    const rnd = mulberry32(hashStr(ev.id));
    // participación 60–95%
    const n = Math.max(1, Math.round(esperados * (0.6 + rnd() * 0.35)));
    submissions[ev.id] = n;
    const base = 3.2 + (hashStr(ev.id) % 15) / 10; // 3.2–4.6
    const qs = preguntasActivas(preguntas, audienciaDe(ev.nivel));
    for (const q of qs) {
      const bias = ((hashStr(ev.id + q.competenciaId) % 11) - 5) / 12; // ±0.4
      const target = clamp(base + bias);
      const dist: [number, number, number, number, number] = [0, 0, 0, 0, 0];
      const r = mulberry32(hashStr(ev.id + q.id));
      for (let i = 0; i < n; i++) {
        // muestra alrededor del objetivo con ruido; algunos "no responden" esta conducta
        const v = clamp(Math.round(target + (r() - 0.5) * 1.6));
        dist[v - 1] += 1;
      }
      resultados.push({ evaluadoId: ev.id, preguntaId: q.id, dist });
    }
  }
  return { resultados, submissions };
}

function seedStore(): Store {
  const personas = ROSTER.map((p) => ({ ...p }));
  const preguntas = PREGUNTAS.map((p) => ({ ...p }));
  const { resultados, submissions } = seedResultados(personas, preguntas);
  return {
    personas,
    preguntas,
    metas: seedMetas(),
    admins: SEED_ADMINS.map((a) => ({ ...a })),
    resultados,
    submissions,
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
    /* almacenamiento bloqueado */
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
    /* ignora cuota/permiso */
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

/* ---------- catálogos ---------- */

export const competencias: Competencia[] = COMPETENCIAS;
export const nombreCompetencia = (id: string) =>
  COMPETENCIAS.find((c) => c.id === id)?.nombre ?? id;

export const NIVEL_LABEL: Record<Nivel, string> = {
  1: "N1 · Gerente",
  2: "N2 · Regional / Líder",
  3: "N3 · Jefe / Supervisor",
  4: "N4 · Vendedor",
};

export function evaluados(s: Store): Persona[] {
  return s.personas.filter(esEvaluado);
}

export function areas(s: Store): string[] {
  return Array.from(new Set(evaluados(s).map((p) => p.area))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

export function regiones(s: Store): string[] {
  return Array.from(
    new Set(evaluados(s).map((p) => p.region).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "es"));
}

export function nivelesEvaluados(s: Store): Nivel[] {
  return Array.from(new Set(evaluados(s).map((p) => p.nivel))).sort() as Nivel[];
}

/* ---------- agregaciones ---------- */

const round1 = (v: number) => Math.round(v * 10) / 10;

type Filtro = { nivel?: Nivel | null; area?: string | null; region?: string | null };

export function evaluadosFiltrados(s: Store, f: Filtro): Persona[] {
  return evaluados(s).filter(
    (p) =>
      (!f.nivel || p.nivel === f.nivel) &&
      (!f.area || p.area === f.area) &&
      (!f.region || p.region === f.region)
  );
}

function resultadoDe(s: Store, evaluadoId: string, preguntaId: string): Resultado | undefined {
  return s.resultados.find((r) => r.evaluadoId === evaluadoId && r.preguntaId === preguntaId);
}

/** Puntaje por competencia de un evaluado. */
export function competenciaScoresDe(s: Store, evaluado: Persona): CompetenciaScore[] {
  const qs = preguntasDe(s, evaluado);
  return COMPETENCIAS.map((c) => {
    const cqs = qs.filter((q) => q.competenciaId === c.id);
    const avgs: number[] = [];
    let n = 0;
    for (const q of cqs) {
      const r = resultadoDe(s, evaluado.id, q.id);
      const a = r ? avgOf(r.dist) : null;
      if (a !== null && r) {
        avgs.push(a);
        n += nOf(r.dist);
      }
    }
    const score = avgs.length ? round1(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
    const objetivo = s.metas.find((m) => m.competenciaId === c.id)?.objetivo ?? 4;
    return { competenciaId: c.id, nombre: c.nombre, score, objetivo, n };
  });
}

export function indiceDe(s: Store, evaluado: Persona): number | null {
  const cs = competenciaScoresDe(s, evaluado).filter((c) => c.score > 0);
  if (cs.length === 0) return null;
  return round1(cs.reduce((a, c) => a + c.score, 0) / cs.length);
}

export function participacionDe(s: Store, evaluado: Persona): { respondientes: number; esperados: number } {
  return {
    respondientes: s.submissions[evaluado.id] ?? 0,
    esperados: evaluadoresDe(s.personas, evaluado).length,
  };
}

export function metaGeneral(s: Store): number {
  if (s.metas.length === 0) return 4;
  return round1(s.metas.reduce((a, m) => a + m.objetivo, 0) / s.metas.length);
}

/** Consolidado por competencia sobre un conjunto de evaluados (promedio por evaluado). */
export function consolidado(s: Store, set: Persona[]): CompetenciaScore[] {
  return COMPETENCIAS.map((c) => {
    const scores: number[] = [];
    let n = 0;
    for (const ev of set) {
      const cs = competenciaScoresDe(s, ev).find((x) => x.competenciaId === c.id);
      if (cs && cs.score > 0) {
        scores.push(cs.score);
        n += cs.n;
      }
    }
    const score = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const objetivo = s.metas.find((m) => m.competenciaId === c.id)?.objetivo ?? 4;
    return { competenciaId: c.id, nombre: c.nombre, score, objetivo, n };
  });
}

export function indiceGeneral(s: Store, set: Persona[]): number | null {
  const vals = set.map((ev) => indiceDe(s, ev)).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function participacionGeneral(s: Store, set: Persona[]): { respondientes: number; esperados: number } {
  let respondientes = 0;
  let esperados = 0;
  for (const ev of set) {
    const p = participacionDe(s, ev);
    respondientes += p.respondientes;
    esperados += p.esperados;
  }
  return { respondientes, esperados };
}

export function ranking(s: Store, set: Persona[]): { evaluado: Persona; indice: number | null }[] {
  return set
    .map((ev) => ({ evaluado: ev, indice: indiceDe(s, ev) }))
    .filter((r) => r.indice !== null)
    .sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0));
}

export function buildMatrix(s: Store, set: Persona[]): MatrixNode[] {
  const roots = new Map<string, MatrixNode>();
  for (const ev of set) {
    let root = roots.get(ev.area);
    if (!root) {
      root = {
        key: ev.area, label: ev.area, level: 0, area: ev.area,
        indice: null, porCompetencia: {}, respondientes: 0, esperados: 0, children: [],
      };
      roots.set(ev.area, root);
    }
    const cs = competenciaScoresDe(s, ev);
    const part = participacionDe(s, ev);
    const porCompetencia: Record<string, number | null> = {};
    for (const c of cs) porCompetencia[c.competenciaId] = c.score > 0 ? c.score : null;
    root.children.push({
      key: ev.id, label: ev.nombre, level: 1, area: ev.area, evaluadoId: ev.id,
      cargo: ev.cargo, nivel: ev.nivel, indice: indiceDe(s, ev), porCompetencia,
      respondientes: part.respondientes, esperados: part.esperados, children: [],
    });
  }
  // rollup por área
  for (const root of roots.values()) {
    root.children.sort((a, b) => (b.indice ?? -1) - (a.indice ?? -1));
    const kids = root.children.filter((k) => k.indice !== null);
    root.indice = kids.length
      ? round1(kids.reduce((a, k) => a + (k.indice ?? 0), 0) / kids.length)
      : null;
    for (const c of COMPETENCIAS) {
      const vals = root.children
        .map((k) => k.porCompetencia[c.id])
        .filter((v): v is number => v !== null && v !== undefined);
      root.porCompetencia[c.id] = vals.length
        ? round1(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;
    }
    root.respondientes = root.children.reduce((a, k) => a + k.respondientes, 0);
    root.esperados = root.children.reduce((a, k) => a + k.esperados, 0);
  }
  return Array.from(roots.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/* ---------- registro de una evaluación ---------- */

/**
 * Registra las respuestas de un evaluador para un evaluado (una submission).
 * Solo se registran las conductas con un valor 1–5; las omitidas ("No tengo
 * suficiente información") no cuentan.
 */
export function registrarEvaluacion(evaluadoId: string, respuestas: Record<string, number>) {
  mutate((s) => {
    for (const [preguntaId, valor] of Object.entries(respuestas)) {
      if (!valor || valor < 1 || valor > 5) continue;
      const v = Math.round(valor);
      let r = s.resultados.find(
        (x) => x.evaluadoId === evaluadoId && x.preguntaId === preguntaId
      );
      if (!r) {
        r = { evaluadoId, preguntaId, dist: [0, 0, 0, 0, 0] };
        s.resultados.push(r);
      }
      r.dist[v - 1] += 1;
    }
    s.submissions[evaluadoId] = (s.submissions[evaluadoId] ?? 0) + 1;
  });
}

/** Color semántico del puntaje frente a la meta. */
export function toneFor(indice: number | null, meta: number): "ok" | "warn" | "bad" | "none" {
  if (indice === null) return "none";
  const d = indice - meta;
  if (d >= 0) return "ok";
  if (d >= -0.5) return "warn";
  return "bad";
}
