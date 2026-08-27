/* Modelo de dominio · Evaluación cultural */

/** Persona evaluada en la organización */
export type Evaluado = {
  id: string;
  nombre: string;
  empresa: string;
  area: string;
  cargo: string;
  activo: boolean;
};

/** Dimensión o valor cultural que se mide (escala 1–5) */
export type Dimension = {
  id: string;
  nombre: string;
  descripcion: string;
};

/**
 * Una calificación: el puntaje de un evaluado en una dimensión, en un periodo.
 * `score` va de 1 a 5. El promedio de las dimensiones de un evaluado es su
 * índice cultural del periodo.
 */
export type Evaluacion = {
  evaluadoId: string;
  period: string; // 'YYYY-MM' (primer día del trimestre evaluado)
  dimensionId: string;
  score: number; // 1..5
};

/** Meta (objetivo) de puntaje por dimensión y año */
export type Meta = {
  anio: number;
  dimensionId: string;
  objetivo: number; // 1..5
};

/** Regla de homologación: agrupa un nombre histórico bajo uno nuevo */
export type MergeCampo = "empresa" | "area" | "cargo";
export type MergeRule = {
  id: string;
  campo: MergeCampo;
  origen: string;
  destino: string;
  activo: boolean;
  nota: string;
};

/** Administrador autorizado */
export type Admin = {
  email: string;
  role: "owner" | "editor";
  active: boolean;
};

/* ---------- Vistas agregadas para el dashboard ---------- */

/** Nodo de la matriz Empresa → Área → Evaluado */
export type MatrixNode = {
  key: string;
  label: string;
  level: 0 | 1 | 2;
  empresa: string;
  area?: string;
  evaluadoId?: string;
  cargo?: string;
  /** índice cultural por periodo (promedio de dimensiones) */
  indice: Record<string, number | null>;
  /** nº de evaluados que componen el nodo (para promediar) */
  count: Record<string, number>;
  children: MatrixNode[];
};

/** Puntaje agregado por dimensión en un periodo */
export type DimensionScore = {
  dimensionId: string;
  nombre: string;
  score: number;
  objetivo: number;
};

/** Punto de evolución del índice general por periodo */
export type EvolutionPoint = {
  period: string;
  label: string;
  indice: number | null;
  objetivo: number | null;
};
