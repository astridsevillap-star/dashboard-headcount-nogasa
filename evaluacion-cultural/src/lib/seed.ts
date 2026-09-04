import type { Admin, Audiencia, Competencia, Meta, Pregunta } from "./types";

/* ---------------------------------------------------------------------------
   Contenido del cuestionario · Evaluación cultural 2026
   Competencias y conductas observables replicadas de la encuesta original.
   Dos cuestionarios, según el nivel del evaluado:
     · "gerencial" (20 preguntas, 4 por competencia): solo el Gerente (Nivel 1).
     · "general" (8 preguntas): Niveles 2, 3 y 4 (todos los demás).
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
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi siempre" },
  { value: 5, label: "Siempre" },
];

/** Año / edición de la evaluación. */
export const EDICION = "2026";

let seq = 0;
const q = (
  competenciaId: string,
  audiencia: Audiencia,
  texto: string,
  activa = true
): Pregunta => ({ id: `q${++seq}`, competenciaId, audiencia, texto, activa });

export const PREGUNTAS: Pregunta[] = [
  /* ===== Cuestionario NIVEL 1 · Gerente (20 preguntas, 4 por competencia) ===== */
  q("creatividad", "gerencial", "Crea un entorno donde la experimentación y la creatividad son reconocidas y recompensadas."),
  q("creatividad", "gerencial", "Cuando alguien de su equipo propone una idea innovadora, la impulsa y ayuda a concretarla."),
  q("creatividad", "gerencial", "Estimula a su equipo a generar nuevas ideas y métodos de trabajo."),
  q("creatividad", "gerencial", "Propone regularmente ideas creativas sobre procesos, productos o procedimientos."),

  q("autonomia", "gerencial", "Delega responsabilidades que representan oportunidades reales de crecimiento para su equipo."),
  q("autonomia", "gerencial", "Asegura que los miembros de su equipo tengan acceso a oportunidades de desarrollo personal y profesional."),
  q("autonomia", "gerencial", "Al empoderar a otros, genera un clima motivador que energiza a todo el equipo."),
  q("autonomia", "gerencial", "Prepara activamente a sus colaboradores para asumir roles de mayor responsabilidad."),

  q("competitividad", "gerencial", "Establece metas ambiciosas que desafían a su equipo a superar los estándares habituales."),
  q("competitividad", "gerencial", "Motiva e impulsa a otros a dar lo mejor de sí en su trabajo."),
  q("competitividad", "gerencial", "Orienta a su área hacia niveles de rendimiento de excelencia en productos y/o servicios."),
  q("competitividad", "gerencial", "Promueve una cultura de mejora continua dentro de su área."),

  q("empatia", "gerencial", "Se comunica de manera empática cuando las personas de su equipo comparten sus problemas."),
  q("empatia", "gerencial", "Cuando da retroalimentación, lo hace de forma que impulsa la mejora en lugar de generar defensividad."),
  q("empatia", "gerencial", "Escucha de manera abierta y atenta las ideas de otros, incluso cuando no está de acuerdo."),
  q("empatia", "gerencial", "Genera confianza y apertura demostrando comprensión genuina ante las preocupaciones de su equipo."),

  q("integracion", "gerencial", "Construye equipos cohesionados con sentido de compromiso compartido."),
  q("integracion", "gerencial", "Crea un ambiente donde la participación en las decisiones es activamente fomentada."),
  q("integracion", "gerencial", "Coordina de manera regular con líderes de otras áreas de la organización."),
  q("integracion", "gerencial", "Al liderar grupos, asegura la colaboración y la resolución positiva de conflictos."),

  /* ===== Cuestionario NIVEL 2·3·4 · resto (8 preguntas) ===== */
  q("creatividad", "general", "Propone soluciones creativas sobre procesos o procedimientos en favor de tu gestión."),
  q("creatividad", "general", "Lidera y promueve la mejora continua en la organización."),
  q("autonomia", "general", "Promueve que los colaboradores tengan acceso a oportunidades de desarrollo personal y profesional."),
  q("competitividad", "general", "Resuelve tu solicitud en los plazos prometidos."),
  q("empatia", "general", "Ofrece un trato amable y cortés."),
  q("empatia", "general", "Se comunica de manera empática cuando las personas de su equipo comparten sus problemas."),
  q("empatia", "general", "Escucha de manera abierta y atenta las ideas de otros, incluso cuando no está de acuerdo."),
  q("integracion", "general", "Coordina de manera regular con tu área respecto a las necesidades del negocio."),
];

const META_DEFAULT = 4.0;

export function seedMetas(): Meta[] {
  return COMPETENCIAS.map((c) => ({ competenciaId: c.id, objetivo: META_DEFAULT }));
}
