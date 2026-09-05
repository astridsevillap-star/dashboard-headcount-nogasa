import type { Persona } from "./types";

/* ---------------------------------------------------------------------------
   Códigos de acceso de la encuesta (anónima).
   Cada evaluador (N2, N3, N4) recibe un código único y estable. La misma lógica
   generó el CSV entregado, de modo que los códigos coinciden exactamente.
   El código solo identifica a quién le toca evaluar; las respuestas se guardan
   agregadas y sin el código.
--------------------------------------------------------------------------- */

const ALPH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin O,0,I,1,L para evitar confusión

function rawCode(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPH[h % ALPH.length];
    h = Math.floor(h / ALPH.length) + (i + 1) * 7;
  }
  return s;
}

export type CodeMap = { byId: Map<string, string>; byCode: Map<string, string> };

/** Construye el mapa código↔evaluador. Solo N2, N3 y N4 (el Gerente no evalúa). */
export function buildCodes(personas: Persona[]): CodeMap {
  const used = new Set<string>();
  const uniq = (seed: string) => {
    let c = rawCode(seed);
    let i = 0;
    while (used.has(c)) c = rawCode(seed + "#" + ++i);
    used.add(c);
    return c;
  };
  const evaluadores = personas
    .filter((p) => [2, 3, 4].includes(p.nivel))
    .sort(
      (a, b) =>
        a.nivel - b.nivel ||
        a.area.localeCompare(b.area) ||
        a.nombre.localeCompare(b.nombre)
    );
  const byId = new Map<string, string>();
  const byCode = new Map<string, string>();
  for (const p of evaluadores) {
    // Código fijo y memorable para el evaluador de prueba
    const c = p.dni === "DEMO004" ? "DEMO25" : uniq(p.dni + "|EC2026");
    byId.set(p.id, c);
    byCode.set(c, p.id);
  }
  return { byId, byCode };
}

export const normalizeCode = (s: string) =>
  s.toUpperCase().replace(/[^A-Z2-9]/g, "");
