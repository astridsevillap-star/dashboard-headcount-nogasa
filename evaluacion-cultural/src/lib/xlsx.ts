"use client";

import * as XLSX from "xlsx";
import { DIMENSIONES } from "./seed";
import type { Evaluacion, Evaluado } from "./types";

/* Columnas fijas de la plantilla, en orden. Las dimensiones se agregan después. */
const BASE_COLS = ["ID", "Evaluado", "Empresa", "Área", "Cargo"] as const;

export function dimensionHeaders(): string[] {
  return DIMENSIONES.map((d) => d.nombre);
}

/** Construye las filas (matriz) de un periodo para exportar o como plantilla. */
export function sheetRows(
  evaluados: Evaluado[],
  evaluaciones: Evaluacion[],
  period: string,
  includeScores: boolean
): (string | number)[][] {
  const header = [...BASE_COLS, ...dimensionHeaders()];
  const rows: (string | number)[][] = [header];
  for (const ev of evaluados) {
    const row: (string | number)[] = [ev.id, ev.nombre, ev.empresa, ev.area, ev.cargo];
    for (const d of DIMENSIONES) {
      if (!includeScores) {
        row.push("");
        continue;
      }
      const found = evaluaciones.find(
        (e) => e.evaluadoId === ev.id && e.period === period && e.dimensionId === d.id
      );
      row.push(found ? found.score : "");
    }
    rows.push(row);
  }
  return rows;
}

export function exportPeriod(
  evaluados: Evaluado[],
  evaluaciones: Evaluacion[],
  period: string,
  includeScores: boolean,
  filename: string
) {
  const rows = sheetRows(evaluados, evaluaciones, period, includeScores);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, period);
  XLSX.writeFile(wb, filename);
}

/**
 * Lee un archivo de plantilla y devuelve las calificaciones para un periodo.
 * Reconoce las columnas por nombre de dimensión (insensible a mayúsculas). El
 * evaluado se identifica por la columna ID.
 */
export async function importPeriod(
  file: File,
  period: string
): Promise<{ evaluaciones: Evaluacion[]; filas: number }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const norm = (s: string) => s.trim().toLowerCase();
  const dimByHeader = new Map<string, string>();
  for (const d of DIMENSIONES) dimByHeader.set(norm(d.nombre), d.id);

  const out: Evaluacion[] = [];
  for (const r of rows) {
    const id = String(r["ID"] ?? r["Id"] ?? r["id"] ?? "").trim();
    if (!id) continue;
    for (const [key, value] of Object.entries(r)) {
      const dimId = dimByHeader.get(norm(key));
      if (!dimId) continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) continue;
      out.push({
        evaluadoId: id,
        period,
        dimensionId: dimId,
        score: Math.max(1, Math.min(5, Math.round(n * 2) / 2)),
      });
    }
  }
  return { evaluaciones: out, filas: out.length };
}
