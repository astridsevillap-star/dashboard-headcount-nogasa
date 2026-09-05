"use client";

import type {
  Audiencia,
  Competencia,
  CompetenciaScore,
  MatrixNode,
  Meta,
  Nivel,
  Persona,
  Pregunta,
} from "./types";
import { COMPETENCIAS, PREGUNTAS, seedMetas } from "./seed";
import { ROSTER } from "./roster";
import { buildCodes, type CodeMap } from "./codes";
import { fetchOrg, type Resultados } from "./backend";

/* ---------------------------------------------------------------------------
   Catálogo del cliente: el padrón base (ROSTER) viene del código; la
   administradora puede editar nivel/área/región de cualquier persona, o
   agregar personas nuevas, desde /organizacion. Esos cambios se guardan en
   Supabase (ec_overrides / ec_personas_extra) y se combinan aquí para formar
   el padrón "efectivo" que usa el resto de la app. Las preguntas y metas
   siguen siendo fijas en el código.
--------------------------------------------------------------------------- */

/** Padrón efectivo (base + overrides + personas agregadas). Se actualiza con loadOrg(). */
export let personas: Persona[] = ROSTER;

/** Ids de personas agregadas manualmente (no vienen del Excel). */
export let extraIds = new Set<string>();

/** Descarga los overrides de organización y recalcula el padrón efectivo. */
export async function loadOrg(): Promise<Persona[]> {
  const { overrides, extra } = await fetchOrg();
  const byId = new Map(overrides.map((o) => [o.persona_id, o]));
  extraIds = new Set(extra.map((e) => e.id));

  const base: Persona[] = [
    ...ROSTER,
    ...extra.map((e) => ({
      id: e.id, dni: e.dni, nombre: e.nombre, cargo: e.cargo,
      gerencia: e.gerencia, area: e.area, nivel: e.nivel as Persona["nivel"], region: e.region,
    })),
  ];

  const next: Persona[] = [];
  for (const p of base) {
    const o = byId.get(p.id);
    if (!o) {
      next.push(p);
      continue;
    }
    if (!o.activo) continue; // persona excluida por la administradora
    next.push({
      ...p,
      nivel: (o.nivel ?? p.nivel) as Persona["nivel"],
      area: o.area ?? p.area,
      region: o.region ?? p.region,
    });
  }
  personas = next;
  codeCache = null; // el mapa de códigos depende del padrón efectivo
  return personas;
}

export const competencias: Competencia[] = COMPETENCIAS;
export const metas: Meta[] = seedMetas();
export const nombreCompetencia = (id: string) =>
  COMPETENCIAS.find((c) => c.id === id)?.nombre ?? id;

/** Niveles que reciben evaluación (los líderes). N4 son evaluadores. */
export const EVALUAR_NIVELES: Nivel[] = [1, 2, 3];

export const NIVEL_LABEL: Record<Nivel, string> = {
  1: "N1 · Gerente",
  2: "N2 · Regional / Líder",
  3: "N3 · Jefe / Supervisor",
  4: "N4 · Vendedor",
};

/* ---------- relaciones ---------- */

export function audienciaDe(nivel: Nivel): Audiencia {
  return nivel === 1 ? "gerencial" : "general";
}
export function esEvaluado(p: Persona): boolean {
  return EVALUAR_NIVELES.includes(p.nivel);
}

/**
 * Relación 90° ascendente. No todos los segmentos tienen la misma estructura:
 *   · Ventas Detalle: N4 → N3 (por área) → N2 (regional, por región) → N1.
 *   · Ventas LPC: N4 → N3 (por área) → N2 (líder de producto único) → N1.
 *   · Home Care / Supermercado: N4 → N2 directo (sin nivel N3) → N1.
 * La región solo desambigua cuando un área tiene más de un N2 (caso Detalle);
 * si el área tiene un único N2, todo N3 de esa área lo evalúa sin filtrar por región.
 */
function n2sDelArea(all: Persona[], area: string): Persona[] {
  return all.filter((p) => p.nivel === 2 && p.area === area);
}
function n3sDelArea(all: Persona[], area: string): Persona[] {
  return all.filter((p) => p.nivel === 3 && p.area === area);
}

/** Evaluadores asignados a un evaluado (cascada ascendente). */
export function evaluadoresDe(all: Persona[], evaluado: Persona): Persona[] {
  if (evaluado.nivel === 3) {
    return all.filter((p) => p.nivel === 4 && p.area === evaluado.area);
  }
  if (evaluado.nivel === 2) {
    const n2s = n2sDelArea(all, evaluado.area);
    const n3s = n3sDelArea(all, evaluado.area);
    if (n3s.length === 0) {
      // segmento sin nivel N3: los vendedores del área evalúan directo al líder
      return all.filter((p) => p.nivel === 4 && p.area === evaluado.area);
    }
    if (n2s.length > 1 && evaluado.region) {
      // área con varios N2 (regiones): filtra los N3 de esa misma región
      const porRegion = n3s.filter((p) => p.region === evaluado.region);
      return porRegion.length ? porRegion : n3s;
    }
    // único N2 del área (líder de producto): todos los N3 del área lo evalúan
    return n3s;
  }
  if (evaluado.nivel === 1) return all.filter((p) => p.nivel === 2);
  return [];
}

/** Personas que un evaluador debe evaluar (inverso de evaluadoresDe). */
export function evaluadosDe(all: Persona[], evaluador: Persona): Persona[] {
  if (evaluador.nivel === 4) {
    const n3s = n3sDelArea(all, evaluador.area);
    if (n3s.length > 0) return n3s;
    // segmento sin nivel N3 (Home Care / Supermercado): evalúa directo al N2
    return n2sDelArea(all, evaluador.area);
  }
  if (evaluador.nivel === 3) {
    const n2s = n2sDelArea(all, evaluador.area);
    if (n2s.length > 1 && evaluador.region) {
      const porRegion = n2s.filter((p) => p.region === evaluador.region);
      return porRegion.length ? porRegion : n2s;
    }
    return n2s;
  }
  if (evaluador.nivel === 2) return all.filter((p) => p.nivel === 1);
  return [];
}

export function preguntasActivas(audiencia: Audiencia): Pregunta[] {
  return PREGUNTAS.filter((q) => q.activa && q.audiencia === audiencia);
}
export function preguntasDe(evaluado: Persona): Pregunta[] {
  return preguntasActivas(audienciaDe(evaluado.nivel));
}

let codeCache: CodeMap | null = null;
export function codeMap(): CodeMap {
  if (!codeCache) codeCache = buildCodes(personas);
  return codeCache;
}

/* ---------- catálogos derivados ---------- */

/** Área ficticia solo para pruebas; se oculta del dashboard. */
export const DEMO_AREA = "DEMO";
export function evaluados(): Persona[] {
  return personas.filter((p) => esEvaluado(p) && p.area !== DEMO_AREA);
}
export function areas(): string[] {
  return Array.from(new Set(evaluados().map((p) => p.area))).sort((a, b) => a.localeCompare(b, "es"));
}
export function regiones(): string[] {
  return Array.from(new Set(evaluados().map((p) => p.region).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}
export function nivelesEvaluados(): Nivel[] {
  return Array.from(new Set(evaluados().map((p) => p.nivel))).sort() as Nivel[];
}

export type Filtro = { nivel?: Nivel | null; area?: string | null; region?: string | null };
export function evaluadosFiltrados(f: Filtro): Persona[] {
  return evaluados().filter(
    (p) =>
      (!f.nivel || p.nivel === f.nivel) &&
      (!f.area || p.area === f.area) &&
      (!f.region || p.region === f.region)
  );
}

/* ---------- distribución y promedios ---------- */

export function avgOf(dist: number[]): number | null {
  const n = dist.reduce((a, b) => a + b, 0);
  if (n === 0) return null;
  let s = 0;
  for (let k = 0; k < dist.length; k++) s += (k + 1) * dist[k];
  return s / n;
}
export const nOf = (dist: number[]): number => dist.reduce((a, b) => a + b, 0);
export function pctOf(dist: number[]): number | null {
  const avg = avgOf(dist);
  return avg === null ? null : Math.round((avg / 5) * 100);
}
export function distDe(r: Resultados, evaluadoId: string, preguntaId: string): number[] {
  return r.res.get(`${evaluadoId}|${preguntaId}`) ?? [0, 0, 0, 0, 0];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
export const metaDe = (competenciaId: string) =>
  metas.find((m) => m.competenciaId === competenciaId)?.objetivo ?? 4;
export function metaGeneral(): number {
  if (metas.length === 0) return 4;
  return round1(metas.reduce((a, m) => a + m.objetivo, 0) / metas.length);
}

/* ---------- agregaciones ---------- */

export function competenciaScoresDe(r: Resultados, evaluado: Persona): CompetenciaScore[] {
  const qs = preguntasDe(evaluado);
  return COMPETENCIAS.map((c) => {
    const cqs = qs.filter((q) => q.competenciaId === c.id);
    const avgs: number[] = [];
    let n = 0;
    for (const q of cqs) {
      const dist = distDe(r, evaluado.id, q.id);
      const a = avgOf(dist);
      if (a !== null) {
        avgs.push(a);
        n += nOf(dist);
      }
    }
    const score = avgs.length ? round1(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
    return { competenciaId: c.id, nombre: c.nombre, score, objetivo: metaDe(c.id), n };
  });
}

export function indiceDe(r: Resultados, evaluado: Persona): number | null {
  const cs = competenciaScoresDe(r, evaluado).filter((c) => c.score > 0);
  if (cs.length === 0) return null;
  return round1(cs.reduce((a, c) => a + c.score, 0) / cs.length);
}

export function participacionDe(r: Resultados, evaluado: Persona): { respondientes: number; esperados: number } {
  return {
    respondientes: r.part.get(evaluado.id) ?? 0,
    esperados: evaluadoresDe(personas, evaluado).length,
  };
}

export function consolidado(r: Resultados, set: Persona[]): CompetenciaScore[] {
  return COMPETENCIAS.map((c) => {
    const scores: number[] = [];
    let n = 0;
    for (const ev of set) {
      const cs = competenciaScoresDe(r, ev).find((x) => x.competenciaId === c.id);
      if (cs && cs.score > 0) {
        scores.push(cs.score);
        n += cs.n;
      }
    }
    const score = scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { competenciaId: c.id, nombre: c.nombre, score, objetivo: metaDe(c.id), n };
  });
}

export function indiceGeneral(r: Resultados, set: Persona[]): number | null {
  const vals = set.map((ev) => indiceDe(r, ev)).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function participacionGeneral(r: Resultados, set: Persona[]): { respondientes: number; esperados: number } {
  let respondientes = 0;
  let esperados = 0;
  for (const ev of set) {
    const p = participacionDe(r, ev);
    respondientes += p.respondientes;
    esperados += p.esperados;
  }
  return { respondientes, esperados };
}

export function ranking(r: Resultados, set: Persona[]): { evaluado: Persona; indice: number | null }[] {
  return set
    .map((ev) => ({ evaluado: ev, indice: indiceDe(r, ev) }))
    .filter((x) => x.indice !== null)
    .sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0));
}

export function buildMatrix(r: Resultados, set: Persona[]): MatrixNode[] {
  const roots = new Map<string, MatrixNode>();
  for (const ev of set) {
    let root = roots.get(ev.area);
    if (!root) {
      root = { key: ev.area, label: ev.area, level: 0, area: ev.area, indice: null, porCompetencia: {}, respondientes: 0, esperados: 0, children: [] };
      roots.set(ev.area, root);
    }
    const cs = competenciaScoresDe(r, ev);
    const part = participacionDe(r, ev);
    const porCompetencia: Record<string, number | null> = {};
    for (const c of cs) porCompetencia[c.competenciaId] = c.score > 0 ? c.score : null;
    root.children.push({
      key: ev.id, label: ev.nombre, level: 1, area: ev.area, evaluadoId: ev.id,
      cargo: ev.cargo, nivel: ev.nivel, indice: indiceDe(r, ev), porCompetencia,
      respondientes: part.respondientes, esperados: part.esperados, children: [],
    });
  }
  for (const root of roots.values()) {
    root.children.sort((a, b) => (b.indice ?? -1) - (a.indice ?? -1));
    const kids = root.children.filter((k) => k.indice !== null);
    root.indice = kids.length ? round1(kids.reduce((a, k) => a + (k.indice ?? 0), 0) / kids.length) : null;
    for (const c of COMPETENCIAS) {
      const vals = root.children.map((k) => k.porCompetencia[c.id]).filter((v): v is number => v != null);
      root.porCompetencia[c.id] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    }
    root.respondientes = root.children.reduce((a, k) => a + k.respondientes, 0);
    root.esperados = root.children.reduce((a, k) => a + k.esperados, 0);
  }
  return Array.from(roots.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function toneFor(indice: number | null, meta: number): "ok" | "warn" | "bad" | "none" {
  if (indice === null) return "none";
  const d = indice - meta;
  if (d >= 0) return "ok";
  if (d >= -0.5) return "warn";
  return "bad";
}
