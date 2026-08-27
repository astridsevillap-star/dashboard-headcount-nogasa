export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

const nf = new Intl.NumberFormat("es-PE");

export function num(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return nf.format(v);
}

/** Puntaje 1–5 con un decimal */
export function score(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return v.toLocaleString("es-PE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Diferencia con signo, un decimal (para Δ vs meta) */
export function signedScore(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const s = Math.abs(v).toLocaleString("es-PE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (v > 0.0001) return `+${s}`;
  if (v < -0.0001) return `−${s}`;
  return "0.0";
}

export function pct(v: number, decimals = 0): string {
  return `${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v)}%`;
}

/** '2025-03' → { y: 2025, m: 3 } */
export function parsePeriod(period: string): { y: number; m: number } {
  const [y, m] = period.split("-").map(Number);
  return { y, m };
}

/** Trimestre evaluado a partir del mes de cierre (mar=T1, jun=T2, ...) */
export function periodLabel(period: string, short = false): string {
  const { y, m } = parsePeriod(period);
  const q = Math.ceil(m / 3);
  if (short) return `T${q} ${String(y).slice(2)}`;
  return `${MESES[m - 1]} ${y}`;
}

export function quarterLabel(period: string, withYear: boolean): string {
  const { y, m } = parsePeriod(period);
  const q = Math.ceil(m / 3);
  return withYear ? `T${q} ${String(y).slice(2)}` : `T${q}`;
}
