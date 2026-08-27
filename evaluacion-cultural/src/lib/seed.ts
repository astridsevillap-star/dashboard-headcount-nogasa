import type { Admin, Dimension, Evaluacion, Evaluado, Meta } from "./types";

/* ---------------------------------------------------------------------------
   Datos semilla de la plataforma de Evaluación Cultural.
   Versión estándar y autónoma: los datos viven aquí y las ediciones se guardan
   en el navegador (localStorage). Para conectar un backend real (p. ej. Supabase)
   basta con reemplazar las funciones de lectura/escritura en `data.ts`.
--------------------------------------------------------------------------- */

/** Correo del administrador principal (acceso de admin concedido). */
export const OWNER_EMAIL = "astrid.sevillap@gmail.com";

export const SEED_ADMINS: Admin[] = [
  { email: OWNER_EMAIL, role: "owner", active: true },
];

/** Dimensiones / valores culturales evaluados (escala 1–5). */
export const DIMENSIONES: Dimension[] = [
  { id: "integridad", nombre: "Integridad", descripcion: "Actúa con honestidad, ética y coherencia entre lo que dice y hace." },
  { id: "equipo", nombre: "Trabajo en equipo", descripcion: "Colabora, comparte información y construye relaciones de confianza." },
  { id: "cliente", nombre: "Orientación al cliente", descripcion: "Anticipa y resuelve las necesidades del cliente interno y externo." },
  { id: "innovacion", nombre: "Innovación", descripcion: "Propone mejoras, cuestiona el statu quo y adopta el cambio." },
  { id: "compromiso", nombre: "Compromiso", descripcion: "Asume responsabilidad por los resultados y cumple lo acordado." },
  { id: "comunicacion", nombre: "Comunicación", descripcion: "Escucha activamente y transmite ideas con claridad y respeto." },
  { id: "liderazgo", nombre: "Liderazgo", descripcion: "Inspira, guía y desarrolla a las personas a su alrededor." },
  { id: "adaptabilidad", nombre: "Adaptabilidad", descripcion: "Responde con flexibilidad y aprende ante contextos nuevos." },
];

/** Etiquetas de la escala de calificación. */
export const ESCALA: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "En desarrollo", desc: "Aún no demuestra el comportamiento de forma consistente." },
  { value: 2, label: "Básico", desc: "Demuestra el comportamiento de manera ocasional." },
  { value: 3, label: "Competente", desc: "Demuestra el comportamiento de forma consistente." },
  { value: 4, label: "Destacado", desc: "Supera lo esperado e influye positivamente en otros." },
  { value: 5, label: "Referente", desc: "Es modelo y referente cultural para la organización." },
];

/** Periodos evaluados: cierre trimestral (mes = fin del trimestre). */
export const PERIODOS = [
  "2025-03", "2025-06", "2025-09", "2025-12", "2026-03", "2026-06",
];

/** Los evaluados: lo único que cambia frente a otras instancias de la herramienta. */
export const EVALUADOS: Evaluado[] = [
  { id: "e01", nombre: "María Fernández Ríos", empresa: "NOGASA", area: "Operaciones", cargo: "Jefa de Operaciones", activo: true },
  { id: "e02", nombre: "Carlos Mendoza Salas", empresa: "NOGASA", area: "Operaciones", cargo: "Supervisor de Planta", activo: true },
  { id: "e03", nombre: "Lucía Paredes Vega", empresa: "NOGASA", area: "Operaciones", cargo: "Analista de Procesos", activo: true },
  { id: "e04", nombre: "Jorge Ramírez Luna", empresa: "NOGASA", area: "Comercial", cargo: "Gerente Comercial", activo: true },
  { id: "e05", nombre: "Ana Torres Campos", empresa: "NOGASA", area: "Comercial", cargo: "Ejecutiva de Ventas", activo: true },
  { id: "e06", nombre: "Diego Flores Núñez", empresa: "NOGASA", area: "Comercial", cargo: "Ejecutivo de Ventas", activo: true },
  { id: "e07", nombre: "Rosa Quispe Huamán", empresa: "NOGASA", area: "Finanzas", cargo: "Jefa de Finanzas", activo: true },
  { id: "e08", nombre: "Pedro Castillo Rojas", empresa: "NOGASA", area: "Finanzas", cargo: "Analista Contable", activo: true },
  { id: "e09", nombre: "Elena Vargas Díaz", empresa: "NOGASA", area: "Capital Humano", cargo: "Jefa de Capital Humano", activo: true },
  { id: "e10", nombre: "Miguel Espinoza Cruz", empresa: "NOGASA", area: "Capital Humano", cargo: "Analista de Desarrollo", activo: true },
  { id: "e11", nombre: "Sofía Chávez León", empresa: "NOGASA", area: "Tecnología", cargo: "Jefe de TI", activo: true },
  { id: "e12", nombre: "Raúl Ibáñez Soto", empresa: "NOGASA", area: "Tecnología", cargo: "Desarrollador", activo: true },
  { id: "e13", nombre: "Patricia Guzmán Ortiz", empresa: "NOGASA", area: "Logística", cargo: "Jefa de Logística", activo: true },
  { id: "e14", nombre: "Andrés Peña Molina", empresa: "NOGASA", area: "Logística", cargo: "Coordinador de Almacén", activo: true },
  { id: "e15", nombre: "Gabriela Rojas Ponce", empresa: "GDP", area: "Comercial", cargo: "Gerente de Cuentas", activo: true },
  { id: "e16", nombre: "Fernando Aguilar Ríos", empresa: "GDP", area: "Comercial", cargo: "Ejecutivo Senior", activo: true },
  { id: "e17", nombre: "Valeria Núñez Farfán", empresa: "GDP", area: "Operaciones", cargo: "Coordinadora de Servicio", activo: true },
  { id: "e18", nombre: "Luis Herrera Bravo", empresa: "GDP", area: "Operaciones", cargo: "Analista de Calidad", activo: true },
  { id: "e19", nombre: "Camila Ortega Ruiz", empresa: "GDP", area: "Finanzas", cargo: "Analista Financiera", activo: true },
  { id: "e20", nombre: "Sebastián Ríos Vela", empresa: "GDP", area: "Capital Humano", cargo: "Analista de Cultura", activo: true },
  { id: "e21", nombre: "Daniela Suárez Pinto", empresa: "GDP", area: "Tecnología", cargo: "Analista de Sistemas", activo: true },
  { id: "e22", nombre: "Martín Cáceres Godoy", empresa: "GDP", area: "Logística", cargo: "Supervisor de Distribución", activo: true },
];

/** Meta por defecto para todas las dimensiones (editable en /metas). */
const META_DEFAULT = 4.0;

export function seedMetas(): Meta[] {
  const anios = Array.from(new Set(PERIODOS.map((p) => Number(p.split("-")[0]))));
  const out: Meta[] = [];
  for (const anio of anios) {
    for (const d of DIMENSIONES) {
      out.push({ anio, dimensionId: d.id, objetivo: META_DEFAULT });
    }
  }
  return out;
}

/* ---------- generación determinística de calificaciones ---------- */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number) => Math.max(1, Math.min(5, v));

/**
 * Construye el set completo de calificaciones semilla. Cada evaluado tiene un
 * nivel base por dimensión (algo de fortaleza y algo de brecha) y una leve
 * tendencia de mejora a lo largo de los periodos, con ruido determinístico.
 */
export function seedEvaluaciones(): Evaluacion[] {
  const out: Evaluacion[] = [];
  for (const ev of EVALUADOS) {
    // nivel general de la persona (2.9–4.4)
    const base = 2.9 + (hashStr(ev.id) % 16) / 10;
    for (const dim of DIMENSIONES) {
      // sesgo por dimensión (-0.7 .. +0.7)
      const bias = ((hashStr(ev.id + dim.id) % 15) - 7) / 10;
      const rnd = mulberry32(hashStr(ev.id + "·" + dim.id));
      PERIODOS.forEach((period, idx) => {
        const trend = idx * 0.08; // mejora gradual
        const noise = (rnd() - 0.5) * 0.6;
        const raw = base + bias + trend + noise;
        out.push({
          evaluadoId: ev.id,
          period,
          dimensionId: dim.id,
          score: Math.round(clamp(raw) * 2) / 2, // pasos de 0.5
        });
      });
    }
  }
  return out;
}
