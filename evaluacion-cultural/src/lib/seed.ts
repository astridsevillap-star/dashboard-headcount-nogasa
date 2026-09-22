import type { Admin, Audiencia, Competencia, Meta, Pregunta } from "./types";

export const OWNER_EMAIL = "astrid.sevillap@gmail.com";

export const SEED_ADMINS: Admin[] = [
  { email: OWNER_EMAIL, role: "owner", active: true },
];

export const COMPETENCIAS: Competencia[] = [
  { id: "creatividad", nombre: "Creatividad" },
  { id: "autonomia", nombre: "Autonomía" },
  { id: "competitividad", nombre: "Competitividad" },
  { id: "empatia", nombre: "Empatía" },
  { id: "integracion", nombre: "Integración" },
];

export const VALORACION_GENERAL_ID = "valoracion_general";

/** Escala de las preguntas 1 a 11. La opción 6 significa "sin información" y no puntúa. */
export const ESCALA: { value: number; label: string }[] = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi siempre" },
  { value: 5, label: "Siempre" },
  { value: 6, label: "No tengo conocimiento suficiente para evaluar" },
];

/** Escala exclusiva de la pregunta 12: valoración general de 1 a 10. */
export const ESCALA_VALORACION: { value: number; label: string }[] =
  Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: "" }));

export const EDICION = "2026";

let seq = 0;
const q = (
  competenciaId: string,
  audiencia: Audiencia,
  texto: string,
  escalaMax: 5 | 10 = 5,
  activa = true
): Pregunta => ({
  id: `q${++seq}`,
  competenciaId,
  audiencia,
  texto,
  activa,
  escalaMax,
});

export const PREGUNTAS: Pregunta[] = [
  q("creatividad", "gerencial", "Promueve e impulsa nuevas ideas para mejorar la forma de trabajo."),
  q("creatividad", "gerencial", "Gestiona y brinda soluciones oportunas a las problemáticas que se presentan en el trabajo diario."),

  q("autonomia", "gerencial", "Delega responsabilidades y genera oportunidades de desarrollo que preparan a su equipo para asumir mayores retos."),
  q("autonomia", "gerencial", "Acompaña en las rutas y hace seguimiento al trabajo diario de sus colaboradores, orientándolos para mejorar su desempeño."),

  q("competitividad", "gerencial", "Establece metas retadoras que impulsan a su equipo a alcanzar un alto nivel de desempeño."),
  q("competitividad", "gerencial", "Motiva e impulsa a su equipo a alcanzar un alto nivel de desempeño."),
  q("competitividad", "gerencial", "Hace seguimiento a los problemas y acuerdos planteados en las reuniones hasta su resolución."),

  q("empatia", "gerencial", "Se comunica con empatía y escucha de manera abierta las ideas y preocupaciones de su equipo."),
  q("empatia", "gerencial", "Brinda retroalimentación clara y constructiva, orientada a la mejora."),

  q("integracion", "gerencial", "Construye un equipo cohesionado y fomenta activamente su participación en la toma de decisiones."),
  q("integracion", "gerencial", "Mantiene una coordinación efectiva y frecuente con líderes de otras áreas de la organización."),

  q(VALORACION_GENERAL_ID, "gerencial", "En una escala del 1 al 10, ¿qué tan buen líder considera que es para el equipo?", 10),
];

const META_DEFAULT = 4.0;

export function seedMetas(): Meta[] {
  return COMPETENCIAS.map((c) => ({ competenciaId: c.id, objetivo: META_DEFAULT }));
}
