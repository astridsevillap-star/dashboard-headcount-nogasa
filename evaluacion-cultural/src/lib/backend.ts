"use client";

import { supabase } from "./supabase";

/* ---------------------------------------------------------------------------
   Capa de backend (Supabase). Las respuestas se registran de forma anónima y
   agregada mediante funciones security-definer; los resultados solo se leen con
   la clave de administrador.
--------------------------------------------------------------------------- */

export type Resultados = {
  /** clave `${evaluadoId}|${preguntaId}` → distribución [d1..d5] */
  res: Map<string, number[]>;
  /** evaluadoId → nº de respondientes */
  part: Map<string, number>;
  completions: number;
};

const EMPTY: Resultados = { res: new Map(), part: new Map(), completions: 0 };

/** Registra una submission de un evaluador. answers = { evaluadoId: { preguntaId: score } }. */
export async function submitEncuesta(
  evaluadorId: string,
  answers: Record<string, Record<string, number>>
): Promise<"ok" | "already"> {
  const { data, error } = await supabase.rpc("ec_submit", {
    p_evaluador_id: evaluadorId,
    p_answers: answers,
  });
  if (error) throw new Error(error.message);
  return data === "already" ? "already" : "ok";
}

export async function yaCompleto(evaluadorId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("ec_completed", { p_evaluador_id: evaluadorId });
  if (error) return false;
  return Boolean(data);
}

export async function checkAdminKey(key: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("ec_check_key", { p_admin_key: key });
  if (error) return false;
  return Boolean(data);
}

type RawResultado = { evaluado_id: string; pregunta_id: string; d1: number; d2: number; d3: number; d4: number; d5: number };
type RawPart = { evaluado_id: string; respondientes: number };

/** Lee los resultados agregados con la clave de administrador. */
export async function fetchResultados(key: string): Promise<Resultados> {
  const { data, error } = await supabase.rpc("ec_results", { p_admin_key: key });
  if (error) throw new Error(error.message);
  const payload = data as { resultados: RawResultado[]; participacion: RawPart[]; completions: number };
  const res = new Map<string, number[]>();
  for (const r of payload.resultados ?? []) {
    res.set(`${r.evaluado_id}|${r.pregunta_id}`, [r.d1, r.d2, r.d3, r.d4, r.d5]);
  }
  const part = new Map<string, number>();
  for (const p of payload.participacion ?? []) part.set(p.evaluado_id, p.respondientes);
  return { res, part, completions: payload.completions ?? 0 };
}

export const emptyResultados = (): Resultados => EMPTY;

/* ---------- organización editable (overrides de nivel/área/región) ---------- */

export type Override = { persona_id: string; nivel: number | null; area: string | null; region: string | null; activo: boolean };
export type PersonaExtra = {
  id: string; dni: string; nombre: string; cargo: string; gerencia: string; area: string; nivel: number; region: string;
};

export async function fetchOrg(): Promise<{ overrides: Override[]; extra: PersonaExtra[] }> {
  const { data, error } = await supabase.rpc("ec_org_get");
  if (error) throw new Error(error.message);
  return data as { overrides: Override[]; extra: PersonaExtra[] };
}

export async function setOverride(
  adminKey: string,
  personaId: string,
  nivel: number,
  area: string,
  region: string,
  activo: boolean
) {
  const { error } = await supabase.rpc("ec_org_set_override", {
    p_admin_key: adminKey, p_persona_id: personaId, p_nivel: nivel, p_area: area, p_region: region, p_activo: activo,
  });
  if (error) throw new Error(error.message);
}

export async function clearOverride(adminKey: string, personaId: string) {
  const { error } = await supabase.rpc("ec_org_clear_override", { p_admin_key: adminKey, p_persona_id: personaId });
  if (error) throw new Error(error.message);
}

export async function upsertExtra(adminKey: string, p: PersonaExtra) {
  const { error } = await supabase.rpc("ec_org_upsert_extra", {
    p_admin_key: adminKey, p_id: p.id, p_dni: p.dni, p_nombre: p.nombre, p_cargo: p.cargo,
    p_gerencia: p.gerencia, p_area: p.area, p_nivel: p.nivel, p_region: p.region,
  });
  if (error) throw new Error(error.message);
}

export async function deleteExtra(adminKey: string, id: string) {
  const { error } = await supabase.rpc("ec_org_delete_extra", { p_admin_key: adminKey, p_id: id });
  if (error) throw new Error(error.message);
}

/* ---------- sesión de administrador (clave en el navegador) ---------- */

const ADMIN_KEY = "ec_admin_key_v1";

export function saveAdminKey(key: string) {
  try { window.localStorage.setItem(ADMIN_KEY, key); } catch { /* noop */ }
}
export function getAdminKey(): string | null {
  try { return window.localStorage.getItem(ADMIN_KEY); } catch { return null; }
}
export function clearAdminKey() {
  try { window.localStorage.removeItem(ADMIN_KEY); } catch { /* noop */ }
}
