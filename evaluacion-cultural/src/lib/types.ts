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

/** Audiencia del cuestionario según el rol del evaluado. */
export type Audiencia = "colaborador" | "lider";

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
 * Resultado agregado: suma de puntajes y número de respuestas recibidas por un
 * evaluado en una pregunta. El promedio es sum / n. Se mantiene agregado para
 * que las respuestas sean anónimas y el almacenamiento sea liviano.
 */
export type Resultado = {
  evaluadoId: string;
  preguntaId: string;
  sum: number;
  n: number;
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
