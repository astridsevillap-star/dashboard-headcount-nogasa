import * as XLSX from "xlsx";
import type { EmployeeRow } from "./types";

/* ---------- normalización ---------- */

function norm(s: unknown): string {
  return String(s ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NULLISH = new Set(["", "#n/a", "n/a", "na", "-", "–", "null", "(en blanco)"]);

function cleanText(v: unknown): string {
  const s = String(v ?? "").trim();
  return NULLISH.has(s.toLocaleLowerCase("es")) ? "" : s;
}

/** Convierte celda (Date, serial de Excel o texto dd/mm/yyyy | yyyy-mm-dd) a ISO */
export function toISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    if (y < 1950 || y > 2100) return null;
    return `${y}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v < 20000 || v > 80000) return null;
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (NULLISH.has(s.toLocaleLowerCase("es"))) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const mm = Number(m[2]);
    const dd = Number(m[1]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  // número serial guardado como texto
  if (/^\d{5}$/.test(s)) return toISO(Number(s));
  return null;
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/* ---------- detección de encabezados ---------- */

type FieldKey =
  | "fecha"
  | "empresa"
  | "dni"
  | "nombre"
  | "cargo"
  | "area"
  | "division"
  | "categoria"
  | "dotacion"
  | "gerencia"
  | "fecha_ingreso"
  | "fecha_cese"
  | "anio"
  | "cantidad";

const ALIASES: Record<FieldKey, string[]> = {
  fecha: ["fecha data", "fecha", "periodo", "period", "mes data"],
  empresa: ["empresa", "company", "razon social"],
  dni: ["dni", "documento", "num docum", "numero de documento", "nro documento", "nro doc"],
  nombre: ["nombre", "apellidos y nombres", "nombres", "trabajador", "colaborador", "empleado"],
  cargo: ["cargo", "puesto", "posicion"],
  area: ["area"],
  division: ["division", "trabajo nombre division", "nombre division", "sede"],
  categoria: ["categoria", "hc cat", "hccat", "cat"],
  dotacion: ["dotacion", "grupo", "grupo dotacion"],
  gerencia: ["gerencia"],
  fecha_ingreso: ["fecha ingreso", "fec ing", "ingreso", "fecha de ingreso"],
  fecha_cese: ["fecha cese", "cesado", "fec baja", "cese", "baja", "fecha de cese", "fecha baja"],
  anio: ["ano", "anio", "year", "ejercicio"],
  cantidad: ["cantidad", "hc", "plazas", "posiciones", "cupos", "q"],
};

function matchField(header: string): FieldKey | null {
  const h = norm(header);
  if (!h) return null;
  for (const [key, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.includes(h)) return key;
  }
  // coincidencias parciales frecuentes
  if (h.includes("fecha") && h.includes("data")) return "fecha";
  if (h.includes("division")) return "division";
  if (h.includes("hc") && h.includes("cat")) return "categoria";
  if (h.includes("apellidos")) return "nombre";
  if (h.includes("cese") || h.includes("baja")) return "fecha_cese";
  if (h.includes("ingreso")) return "fecha_ingreso";
  return null;
}

type SheetGrid = (string | number | Date | null)[][];

function gridOf(ws: XLSX.WorkSheet): SheetGrid {
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as SheetGrid;
}

/** Busca la fila de encabezados en las primeras 12 filas */
function findHeader(
  grid: SheetGrid,
  required: FieldKey[]
): { rowIdx: number; map: Map<number, FieldKey> } | null {
  for (let i = 0; i < Math.min(grid.length, 12); i++) {
    const map = new Map<number, FieldKey>();
    grid[i].forEach((cell, col) => {
      const f = matchField(String(cell ?? ""));
      if (f !== null && !Array.from(map.values()).includes(f)) map.set(col, f);
    });
    const found = new Set(map.values());
    if (required.every((r) => found.has(r))) return { rowIdx: i, map };
  }
  return null;
}

/* ---------- parseo: data mensual ---------- */

export type HcInsert = {
  period: string;
  empresa: string;
  dni: string;
  nombre: string;
  cargo: string;
  area: string;
  division: string;
  categoria: string;
  dotacion: string;
  gerencia: string;
  fecha_ingreso: string | null;
  fecha_cese: string | null;
};

export type ParsedData = {
  rows: HcInsert[];
  omitted: number;
  warnings: string[];
  periods: string[];
};

export function parseDataWorkbook(buf: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const names = wb.SheetNames;
  const ordered = [
    ...names.filter((n) => norm(n) === "data"),
    ...names.filter((n) => norm(n) !== "data"),
  ];

  for (const name of ordered) {
    const grid = gridOf(wb.Sheets[name]);
    const head = findHeader(grid, ["fecha", "dni", "nombre", "cargo"]);
    if (!head) continue;

    const rows: HcInsert[] = [];
    let omitted = 0;
    const warnings: string[] = [];
    const get = (row: (string | number | Date | null)[], f: FieldKey) => {
      for (const [col, key] of head.map) if (key === f) return row[col];
      return null;
    };

    for (let i = head.rowIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const fecha = toISO(get(row, "fecha"));
      const dni = cleanText(get(row, "dni"));
      const nombre = cleanText(get(row, "nombre"));
      if (!fecha || (!dni && !nombre)) {
        if (row.some((c) => c !== null && String(c).trim() !== "")) omitted++;
        continue;
      }
      rows.push({
        period: firstOfMonth(fecha),
        empresa: cleanText(get(row, "empresa")),
        dni,
        nombre,
        cargo: cleanText(get(row, "cargo")),
        area: cleanText(get(row, "area")),
        division: cleanText(get(row, "division")),
        categoria: cleanText(get(row, "categoria")),
        dotacion: cleanText(get(row, "dotacion")),
        gerencia: cleanText(get(row, "gerencia")),
        fecha_ingreso: toISO(get(row, "fecha_ingreso")),
        fecha_cese: toISO(get(row, "fecha_cese")),
      });
    }

    if (rows.length === 0) continue;
    const sinDotacion = rows.filter((r) => !r.dotacion).length;
    if (sinDotacion > 0)
      warnings.push(`${sinDotacion} filas sin DOTACIÓN: aparecerán como "(sin dotación)".`);
    const sinEmpresa = rows.filter((r) => !r.empresa).length;
    if (sinEmpresa > 0) warnings.push(`${sinEmpresa} filas sin EMPRESA.`);
    if (omitted > 0)
      warnings.push(`${omitted} filas omitidas por no tener fecha válida o identificación.`);
    const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
    return { rows, omitted, warnings, periods };
  }

  throw new Error(
    "No se encontró una hoja con las columnas mínimas: FECHA DATA, DNI, NOMBRE y CARGO. Descarga la plantilla y respeta los encabezados."
  );
}

/* ---------- parseo: presupuesto ---------- */

export type BudgetInsert = {
  anio: number;
  empresa: string;
  dotacion: string;
  categoria: string;
  area: string;
  cargo: string;
  cantidad: number;
};

export type ParsedBudget = {
  rows: BudgetInsert[];
  omitted: number;
  warnings: string[];
  anios: number[];
};

export function parseBudgetWorkbook(buf: ArrayBuffer, fallbackYear: number): ParsedBudget {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const names = wb.SheetNames;
  const ordered = [
    ...names.filter((n) => ["presupuesto", "base"].includes(norm(n))),
    ...names.filter((n) => !["presupuesto", "base"].includes(norm(n))),
  ];

  for (const name of ordered) {
    const grid = gridOf(wb.Sheets[name]);
    const head = findHeader(grid, ["cargo", "dotacion"]);
    if (!head) continue;

    const get = (row: (string | number | Date | null)[], f: FieldKey) => {
      for (const [col, key] of head.map) if (key === f) return row[col];
      return null;
    };

    const agg = new Map<string, BudgetInsert>();
    let omitted = 0;
    const warnings: string[] = [];
    const hasCantidad = Array.from(head.map.values()).includes("cantidad");
    const hasAnio = Array.from(head.map.values()).includes("anio");

    for (let i = head.rowIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const cargo = cleanText(get(row, "cargo"));
      if (!cargo) {
        if (row.some((c) => c !== null && String(c).trim() !== "")) omitted++;
        continue;
      }
      const rawAnio = hasAnio ? Number(cleanText(get(row, "anio"))) : NaN;
      const anio = Number.isInteger(rawAnio) && rawAnio > 2000 && rawAnio < 2100 ? rawAnio : fallbackYear;
      const rawCant = hasCantidad ? Number(get(row, "cantidad")) : 1;
      const cantidad = Number.isFinite(rawCant) && rawCant > 0 ? Math.round(rawCant) : hasCantidad ? 0 : 1;
      if (cantidad === 0) {
        omitted++;
        continue;
      }
      const item: BudgetInsert = {
        anio,
        empresa: cleanText(get(row, "empresa")),
        dotacion: cleanText(get(row, "dotacion")),
        categoria: cleanText(get(row, "categoria")),
        area: cleanText(get(row, "area")),
        cargo,
        cantidad,
      };
      const key = [item.anio, item.empresa, item.dotacion, item.categoria, item.area, item.cargo].join("|");
      const prev = agg.get(key);
      if (prev) prev.cantidad += item.cantidad;
      else agg.set(key, item);
    }

    const rows = Array.from(agg.values());
    if (rows.length === 0) continue;
    if (!hasAnio)
      warnings.push(`El archivo no tiene columna AÑO: se asignará todo a ${fallbackYear}.`);
    if (!hasCantidad)
      warnings.push("Sin columna CANTIDAD: se contó 1 posición por fila (formato una fila por puesto).");
    if (omitted > 0) warnings.push(`${omitted} filas omitidas (sin cargo o cantidad válida).`);
    const anios = Array.from(new Set(rows.map((r) => r.anio))).sort();
    return { rows, omitted, warnings, anios };
  }

  throw new Error(
    "No se encontró una hoja con las columnas mínimas: DOTACION y CARGO. Descarga la plantilla de presupuesto y respeta los encabezados."
  );
}

/* ---------- plantillas ---------- */

const DATA_HEADERS = [
  "FECHA DATA",
  "EMPRESA",
  "DNI",
  "NOMBRE",
  "CARGO",
  "AREA",
  "DIVISION",
  "CATEGORIA",
  "DOTACION",
  "GERENCIA",
  "FECHA INGRESO",
  "FECHA CESE",
];

export function downloadDataTemplate() {
  const ejemplo = [
    [
      "01/03/2025",
      "MI EMPRESA SAC",
      "45678912",
      "Quispe Torres Mariana",
      "ANALISTA DE VENTAS",
      "GERENCIA DE VENTAS B2C",
      "VENTAS LIMA",
      "VENTAS DETALLE LIMA",
      "VENTAS",
      "GERENCIA COMERCIAL",
      "15/02/2023",
      "",
    ],
    [
      "01/03/2025",
      "MI EMPRESA SAC",
      "40123456",
      "Rojas Paredes Luis Alberto",
      "OPERARIO DE PRODUCCION",
      "PRODUCCION",
      "PLANTA LIMA",
      "PRODUCCION",
      "OPERACIONES",
      "GERENCIA DE OPERACIONES",
      "03/06/2021",
      "28/03/2025",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([DATA_HEADERS, ...ejemplo]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 11 },
    { wch: 30 },
    { wch: 26 },
    { wch: 26 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
  ];

  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE DATA MENSUAL DE HEADCOUNT"],
    [""],
    ["Una fila por persona y por mes. Puedes incluir varios meses en un mismo archivo."],
    [""],
    ["Columnas obligatorias:"],
    ["FECHA DATA", "Primer día del mes al que corresponde la foto (ej. 01/03/2025)."],
    ["DNI", "Documento de identidad. Se usa para calcular altas y bajas entre meses."],
    ["NOMBRE", "Apellidos y nombres."],
    ["CARGO", "Puesto de la persona. Es el nivel más fino de la matriz."],
    ["DOTACION", "Grupo mayor del dashboard (ej. ADMINISTRACION, OPERACIONES, SUCURSALES, VENTAS)."],
    [""],
    ["Columnas recomendadas:"],
    ["EMPRESA", "Razón social. Permite filtrar el dashboard por empresa."],
    ["CATEGORIA", "Subgrupo dentro de la dotación (equivale a HC CAT del Excel)."],
    ["AREA", "Área o gerencia de detalle."],
    ["DIVISION", "División o sede (opcional)."],
    ["GERENCIA", "Gerencia (opcional)."],
    ["FECHA INGRESO", "Fecha de ingreso (opcional)."],
    ["FECHA CESE", "Solo si la persona cesó. Vacío = activa. Define el conteo de activos."],
    [""],
    ["Al subir un mes que ya existe, sus registros se reemplazan por los del archivo."],
  ]);
  inst["!cols"] = [{ wch: 18 }, { wch: 95 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DATA");
  XLSX.utils.book_append_sheet(wb, inst, "INSTRUCCIONES");
  XLSX.writeFile(wb, "plantilla-data-mensual.xlsx");
}


/* ---------- exportación de un mes cargado (data cruda, para inspección) ---------- */

function ddmmyyyy(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function exportMonthXlsx(period: string, rows: EmployeeRow[]) {
  const data = rows.map((r) => [
    ddmmyyyy(r.period),
    r.empresa,
    r.dni,
    r.nombre,
    r.cargo,
    r.area,
    r.division,
    r.categoria,
    r.dotacion,
    r.gerencia,
    ddmmyyyy(r.fecha_ingreso),
    ddmmyyyy(r.fecha_cese),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([DATA_HEADERS, ...data]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 11 },
    { wch: 34 },
    { wch: 28 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DATA");
  XLSX.writeFile(wb, `data-${period.slice(0, 7)}.xlsx`);
}

export function downloadBudgetTemplate(anio: number) {
  const headers = ["AÑO", "EMPRESA", "DOTACION", "CATEGORIA", "AREA", "CARGO", "CANTIDAD"];
  const ejemplo = [
    [anio, "MI EMPRESA SAC", "VENTAS", "VENTAS DETALLE LIMA", "GERENCIA DE VENTAS B2C", "EJECUTIVO DE VENTAS", 12],
    [anio, "MI EMPRESA SAC", "OPERACIONES", "PRODUCCION", "PRODUCCION", "OPERARIO DE PRODUCCION", 45],
    [anio, "MI EMPRESA SAC", "ADMINISTRACION", "CONTABILIDAD", "GERENCIA DE ADMINISTRACION", "ANALISTA CONTABLE", 3],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo]);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 28 },
    { wch: 30 },
    { wch: 9 },
  ];
  const inst = XLSX.utils.aoa_to_sheet([
    ["PLANTILLA DE PRESUPUESTO DE POSICIONES"],
    [""],
    ["Una fila por combinación de dotación, categoría, área y cargo, con la cantidad presupuestada."],
    ["También se acepta el formato del Excel original (una fila por puesto, sin CANTIDAD)."],
    [""],
    ["AÑO", "Año del presupuesto. Permite mantener bases distintas por año."],
    ["DOTACION", "Grupo mayor del dashboard. Obligatorio."],
    ["CARGO", "Puesto presupuestado. Obligatorio."],
    ["CANTIDAD", "Número de posiciones presupuestadas para esa combinación."],
    [""],
    ["Al importar un año que ya existe, su presupuesto se reemplaza completo."],
    ["El presupuesto también se puede editar fila por fila directamente en la plataforma."],
  ]);
  inst["!cols"] = [{ wch: 12 }, { wch: 95 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PRESUPUESTO");
  XLSX.utils.book_append_sheet(wb, inst, "INSTRUCCIONES");
  XLSX.writeFile(wb, `plantilla-presupuesto-${anio}.xlsx`);
}
