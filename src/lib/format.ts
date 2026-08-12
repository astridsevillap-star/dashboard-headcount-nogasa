export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const MESES_CORTO = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Oct",
  "Nov",
  "Dic",
];

const nf = new Intl.NumberFormat("es-PE");

export function num(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return nf.format(v);
}

export function signed(v: number): string {
  if (v > 0) return `+${nf.format(v)}`;
  return nf.format(v);
}

export function pct(v: number, decimals = 1): string {
  return `${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v)}%`;
}

/** '2025-03-01' → { y: 2025, m: 3 } (sin efectos de zona horaria) */
export function parsePeriod(period: string): { y: number; m: number } {
  const [y, m] = period.split("-").map(Number);
  return { y, m };
}

export function periodLabel(period: string, short = false): string {
  const { y, m } = parsePeriod(period);
  const name = short ? MESES_CORTO[m - 1] : MESES[m - 1];
  return `${name} ${y}`;
}

export function monthShort(period: string): string {
  return MESES_CORTO[parsePeriod(period).m - 1];
}

/** Etiqueta corta de mes; agrega el año en dos dígitos cuando la vista cruza años */
export function monthLabel(period: string, withYear: boolean): string {
  const { y, m } = parsePeriod(period);
  return withYear ? `${MESES_CORTO[m - 1]} ${String(y).slice(2)}` : MESES_CORTO[m - 1];
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
