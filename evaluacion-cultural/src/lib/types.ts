/* Modelo de dominio · Evaluación cultural 2026 (encuesta 360 ascendente) */

/** Nivel jerárquico: 1 Gerente · 2 Regional/Líder de producto · 3 Jefe/Supervisor · 4 Vendedor */
export type Nivel = 1 | 2 | 3 | 4;

/** Persona del padrón (puede ser evaluada, evaluadora o ambas). */
export type Persona = {
  id: string;
  dni: string;
  nombre: string;
  cargo: string;
  gerencia: string;
  area: string;
  nivel: Nivel;
  region: string;
};

/** Competencia cultural evaluada. */
export type Competencia = {
  id: string;
  nombre: string;
};

/**
 * Audiencia del cuestionario según el nivel del evaluado.
 * · "gerencial" (20 preguntas): solo el Gerente (Nivel 1).
 * · "general" (8 preguntas): Niveles 2, 3 y 4 (todos los demás).
 */
export type Audiencia = "gerencial" | "general";

/** Conducta observable (pregunta) de una competencia, para una audiencia. */
export type Pregunta = {
  id: string;
  competenciaId: string;
  audiencia: Audiencia;
  texto: string;
  activa: boolean;
};

/** Meta (objetivo) de puntaje por competencia. Escala 1–5. */
export type Meta = {
  competenciaId: string;
  objetivo: number;
};

/**
 * Resultado agregado y anónimo por evaluado y pregunta: distribución de
 * frecuencias en la escala 1–5. `dist[k]` = nº de evaluadores que marcaron k+1.
 * Las respuestas "No tengo suficiente información" no se registran (no cuentan).
 * Promedio = Σ((k+1)·dist[k]) / Σdist. Resultado % = promedio / 5 · 100.
 */
export type Resultado = {
  evaluadoId: string;
  preguntaId: string;
  dist: [number, number, number, number, number];
};

/** Administrador autorizado. */
export type Admin = {
  email: string;
  role: "owner" | "editor";
  active: boolean;
};

/* ---------- vistas agregadas ---------- */

export type CompetenciaScore = {
  competenciaId: string;
  nombre: string;
  score: number; // promedio 1–5 (0 si sin datos)
  objetivo: number;
  n: number; // respuestas que lo sustentan
};

/** Nodo de la matriz Área → Evaluado. */
export type MatrixNode = {
  key: string;
  label: string;
  level: 0 | 1; // 0 = área, 1 = evaluado
  area: string;
  evaluadoId?: string;
  cargo?: string;
  nivel?: Nivel;
  indice: number | null;
  porCompetencia: Record<string, number | null>;
  respondientes: number;
  esperados: number;
  children: MatrixNode[];
};
