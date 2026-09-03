import type { Admin, Competencia, Meta, Pregunta } from "./types";

/* ---------------------------------------------------------------------------
   Contenido del cuestionario · Evaluación cultural 2026
   Competencias y conductas observables replicadas de la encuesta original.
   Dos audiencias:
     · "colaborador" (Equipo): 1 pregunta por competencia.
     · "lider" (Jefatura / Líderes): hasta 4 preguntas por competencia.
   La audiencia de cada evaluado se decide por su nivel jerárquico.
--------------------------------------------------------------------------- */

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

/** Escala de respuesta (1–5). Editable en Configuración. */
export const ESCALA: { value: number; label: string }[] = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Rara vez" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Frecuentemente" },
  { value: 5, label: "Siempre" },
];

/** Año / edición de la evaluación. */
export const EDICION = "2026";

let seq = 0;
const q = (
  competenciaId: string,
  audiencia: "colaborador" | "lider",
  texto: string,
  activa = true
): Pregunta => ({ id: `q${++seq}`, competenciaId, audiencia, texto, activa });

export const PREGUNTAS: Pregunta[] = [
  /* ---- Audiencia colaborador (1 por competencia) ---- */
  q("creatividad", "colaborador", "Propone y pone en práctica mejoras que simplifican procesos o elevan la experiencia de las personas."),
  q("autonomia", "colaborador", "Toma decisiones oportunas dentro de su responsabilidad y asume los resultados de sus acciones."),
  q("competitividad", "colaborador", "Cumple sus compromisos con calidad y agilidad, incluso ante imprevistos o alta carga de trabajo."),
  q("empatia", "colaborador", "Escucha para comprender la necesidad real y responde con respeto e interés genuino."),
  q("integracion", "colaborador", "Coordina y comparte información con otras personas o áreas para alcanzar resultados colectivos."),

  /* ---- Audiencia líder · Creatividad ---- */
  q("creatividad", "lider", "Crea un entorno donde la experimentación y la creatividad son reconocidas y recompensadas."),
  q("creatividad", "lider", "Cuando alguien de su equipo propone una idea innovadora, la impulsa y ayuda a concretarla."),
  q("creatividad", "lider", "Estimula a su equipo a generar nuevas ideas y métodos de trabajo."),
  q("creatividad", "lider", "Propone regularmente ideas creativas sobre procesos, productos o procedimientos."),
  q("creatividad", "lider", "Crea un entorno donde las ideas nuevas se prueban, se reconocen y se convierten en mejoras concretas.", false),

  /* ---- Audiencia líder · Autonomía ---- */
  q("autonomia", "lider", "Delega responsabilidades que representan oportunidades reales de crecimiento para su equipo."),
  q("autonomia", "lider", "Asegura que los miembros de su equipo tengan acceso a oportunidades de desarrollo personal y profesional."),
  q("autonomia", "lider", "Al empoderar a otros, genera un clima motivador que energiza a todo el equipo."),
  q("autonomia", "lider", "Prepara activamente a sus colaboradores para asumir roles de mayor responsabilidad."),
  q("autonomia", "lider", "Delega responsabilidades que desarrollan al equipo y prepara personas para asumir mayor responsabilidad.", false),

  /* ---- Audiencia líder · Competitividad ---- */
  q("competitividad", "lider", "Establece metas ambiciosas que desafían a su equipo a superar los estándares habituales."),
  q("competitividad", "lider", "Motiva e impulsa a otros a dar lo mejor de sí en su trabajo."),
  q("competitividad", "lider", "Orienta a su área hacia niveles de rendimiento de excelencia en productos y/o servicios."),
  q("competitividad", "lider", "Promueve una cultura de mejora continua dentro de su área."),
  q("competitividad", "lider", "Establece metas exigentes e impulsa la mejora continua del área.", false),

  /* ---- Audiencia líder · Empatía ---- */
  q("empatia", "lider", "Se comunica de manera empática cuando las personas de su equipo comparten sus problemas."),
  q("empatia", "lider", "Cuando da retroalimentación, lo hace de forma que impulsa la mejora en lugar de generar defensividad."),
  q("empatia", "lider", "Escucha de manera abierta y atenta las ideas de otros, incluso cuando no está de acuerdo."),
  q("empatia", "lider", "Genera confianza y apertura demostrando comprensión genuina ante las preocupaciones de su equipo."),
  q("empatia", "lider", "Escucha con apertura y brinda retroalimentación que genera confianza y mejora.", false),

  /* ---- Audiencia líder · Integración ---- */
  q("integracion", "lider", "Construye equipos cohesionados con sentido de compromiso compartido."),
  q("integracion", "lider", "Crea un ambiente donde la participación en las decisiones es activamente fomentada."),
  q("integracion", "lider", "Coordina de manera regular con líderes de otras áreas de la organización."),
  q("integracion", "lider", "Al liderar grupos, asegura la colaboración y la resolución positiva de conflictos."),
  q("integracion", "lider", "Construye un equipo cohesionado y coordina activamente con otras áreas para resolver desafíos compartidos.", false),
];

const META_DEFAULT = 4.0;

export function seedMetas(): Meta[] {
  return COMPETENCIAS.map((c) => ({ competenciaId: c.id, objetivo: META_DEFAULT }));
}
