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
