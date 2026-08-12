import { supabase } from "./supabase";
import type {
  AggRow,
  BudgetRow,
  EmployeeRow,
  MatrixNode,
  MergeCampo,
  MergeRule,
  Movimiento,
  MonthSummary,
} from "./types";

export async function fetchAggregate(): Promise<AggRow[]> {
  const { data, error } = await supabase.rpc("hc_aggregate_json");
  if (error) throw new Error(error.message);
  return (data ?? []) as AggRow[];
}

export async function fetchMovimientos(
  empresa: string | null
): Promise<Movimiento[]> {
  const { data, error } = await supabase.rpc("hc_movimientos_json", {
    p_empresa: empresa,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Movimiento[];
}

export async function fetchMonths(): Promise<MonthSummary[]> {
  const { data, error } = await supabase.rpc("hc_months");
  if (error) throw new Error(error.message);
  return (data ?? []) as MonthSummary[];
}

export async function fetchBudget(): Promise<BudgetRow[]> {
  const { data, error } = await supabase
    .from("budget_positions")
    .select("*")
    .order("dotacion")
    .order("categoria")
    .order("cargo")
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetRow[];
}

/** HC de una fila según el modo de conteo */
export function hcOf(row: AggRow, incluirCesados: boolean): number {
  return incluirCesados ? row.total : row.activos;
}

/* ---------- reglas de homologación (merge virtual) ---------- */

export async function fetchRules(): Promise<MergeRule[]> {
  const { data, error } = await supabase
    .from("merge_rules")
    .select("*")
    .order("campo")
    .order("origen")
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as MergeRule[];
}

/** Clave de comparación: sin tildes, sin mayúsculas, espacios colapsados */
export function normKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mayúsculas sin tildes, para segmentos reemplazados dentro de nombres compuestos */
function plainUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Aplica una regla a un valor. Coincidencia completa (insensible a tildes,
 * mayúsculas y espacios) devuelve el destino tal como se escribió. Si el valor
 * antiguo aparece como frase dentro de un nombre compuesto (con límites de
 * palabra), se reemplaza el segmento: "JEFE DE CAPITAL HUMANO" pasa a
 * "JEFE DE GESTION DE PERSONAS". Devuelve null si no hay coincidencia.
 */
export function applyRuleToValue(
  value: string,
  origen: string,
  destino: string
): string | null {
  const ko = normKey(origen);
  if (!ko) return null;
  if (normKey(value) === ko) return destino.trim();
  const V = plainUpper(value);
  const O = plainUpper(origen);
  if (!O) return null;
  const re = new RegExp(
    `(^|[^A-Z0-9])${escapeRegex(O).replace(/ /g, "\\s+")}(?=$|[^A-Z0-9])`
  );
  const m = re.exec(V);
  if (!m) return null;
  const start = m.index + m[1].length;
  return V.slice(0, start) + plainUpper(destino) + V.slice(m.index + m[0].length);
}

const CAMPOS: MergeCampo[] = ["dotacion", "categoria", "area", "cargo"];

export type ValueMaps = {
  /** valor crudo → valor mostrado (solo entradas que cambian) */
  display: Record<MergeCampo, Map<string, string>>;
  /** valor mostrado → valores crudos agrupados (para el drill-down) */
  originals: Record<MergeCampo, Map<string, string[]>>;
};

/**
 * Construye el mapeo de valores a partir de los valores reales de la data y el
 * presupuesto. Además de las reglas, agrupa variantes que solo difieren en
 * tildes, mayúsculas o espacios. El nombre mostrado prioriza: el destino de la
 * regla, luego la variante real más frecuente que ya lleva el nombre nuevo.
 */
export function buildValueMaps(
  agg: AggRow[],
  budget: BudgetRow[],
  rules: MergeRule[]
): ValueMaps {
  const active = rules.filter(
    (r) => r.activo && normKey(r.origen) !== "" && r.destino.trim() !== ""
  );
  const display: ValueMaps["display"] = {
    dotacion: new Map(),
    categoria: new Map(),
    area: new Map(),
    cargo: new Map(),
  };
  const originals: ValueMaps["originals"] = {
    dotacion: new Map(),
    categoria: new Map(),
    area: new Map(),
    cargo: new Map(),
  };

  for (const campo of CAMPOS) {
    // una regla aplica a todos los campos: el renombre de un área cruza
    // categoría, área y cargos compuestos a la vez
    const rulesFor = active;

    const freq = new Map<string, number>();
    for (const r of agg) {
      const v = r[campo];
      if (v) freq.set(v, (freq.get(v) ?? 0) + r.total);
    }
    for (const b of budget) {
      const v = b[campo];
      if (v) freq.set(v, (freq.get(v) ?? 0) + b.cantidad);
    }

    type Group = {
      raws: string[];
      unmappedBest?: { raw: string; f: number };
      syntheticBest?: { label: string; f: number };
      ruleDest?: string;
    };
    const groups = new Map<string, Group>();

    for (const [raw, f] of freq) {
      let label = raw;
      let changed = false;
      for (const r of rulesFor) {
        const res = applyRuleToValue(label, r.origen, r.destino);
        if (res !== null) {
          label = res;
          changed = true;
        }
      }
      const key = normKey(label);
      let g = groups.get(key);
      if (!g) {
        g = { raws: [] };
        groups.set(key, g);
      }
      g.raws.push(raw);
      if (!changed) {
        if (!g.unmappedBest || f > g.unmappedBest.f) g.unmappedBest = { raw, f };
      } else if (!g.syntheticBest || f > g.syntheticBest.f) {
        g.syntheticBest = { label, f };
      }
    }

    for (const r of rulesFor) {
      const g = groups.get(normKey(r.destino));
      if (g) g.ruleDest = r.destino.trim();
    }

    for (const g of groups.values()) {
      const disp =
        g.ruleDest ?? g.unmappedBest?.raw ?? g.syntheticBest?.label ?? g.raws[0];
      if (g.raws.length === 1 && g.raws[0] === disp) continue;
      for (const raw of g.raws) display[campo].set(raw, disp);
      originals[campo].set(disp, [...g.raws]);
    }
  }

  return { display, originals };
}

const mapVal = (maps: ValueMaps, campo: MergeCampo, v: string) =>
  maps.display[campo].get(v) ?? v;

export function applyRulesToAgg(rows: AggRow[], maps: ValueMaps): AggRow[] {
  if (!CAMPOS.some((c) => maps.display[c].size > 0)) return rows;
  return rows.map((r) => ({
    ...r,
    dotacion: mapVal(maps, "dotacion", r.dotacion),
    categoria: mapVal(maps, "categoria", r.categoria),
    area: mapVal(maps, "area", r.area),
    cargo: mapVal(maps, "cargo", r.cargo),
  }));
}

export function applyRulesToBudget(rows: BudgetRow[], maps: ValueMaps): BudgetRow[] {
  if (!CAMPOS.some((c) => maps.display[c].size > 0)) return rows;
  return rows.map((r) => ({
    ...r,
    dotacion: mapVal(maps, "dotacion", r.dotacion),
    categoria: mapVal(maps, "categoria", r.categoria),
    area: mapVal(maps, "area", r.area),
    cargo: mapVal(maps, "cargo", r.cargo),
  }));
}

/** Valores originales agrupados bajo un valor mostrado (incluye el propio) */
export function originalsOf(
  maps: ValueMaps,
  campo: MergeCampo,
  shown: string
): string[] {
  return maps.originals[campo].get(shown) ?? [shown];
}

/** Descarga todos los registros de un mes (paginado sobre el límite de PostgREST) */
export async function fetchMonthRecords(period: string): Promise<EmployeeRow[]> {
  const out: EmployeeRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("headcount_records")
      .select("*")
      .eq("period", period)
      .order("id")
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as EmployeeRow[];
    out.push(...batch);
    if (batch.length < page) break;
  }
  return out;
}

/**
 * Construye el árbol Dotación → Categoría → Cargo combinando datos reales
 * y presupuesto (los nodos solo-presupuesto también aparecen: son vacantes).
 */
export function buildMatrix(
  rows: AggRow[],
  budget: BudgetRow[],
  periods: string[],
  incluirCesados: boolean
): MatrixNode[] {
  const mk = (
    key: string,
    label: string,
    level: 0 | 1 | 2,
    dotacion: string,
    categoria?: string,
    cargo?: string
  ): MatrixNode => ({
    key,
    label,
    level,
    budget: 0,
    hc: {},
    children: [],
    dotacion,
    categoria,
    cargo,
  });

  const roots = new Map<string, MatrixNode>();

  const nodeFor = (dotacion: string, categoria?: string, cargo?: string) => {
    const d = dotacion || "(sin dotación)";
    let root = roots.get(d);
    if (!root) {
      root = mk(d, d, 0, dotacion);
      roots.set(d, root);
    }
    if (categoria === undefined) return root;
    const c = categoria || "(sin categoría)";
    let cat = root.children.find((n) => n.label === c);
    if (!cat) {
      cat = mk(`${d}›${c}`, c, 1, dotacion, categoria);
      root.children.push(cat);
    }
    if (cargo === undefined) return cat;
    const g = cargo || "(sin cargo)";
    let leaf = cat.children.find((n) => n.label === g);
    if (!leaf) {
      leaf = mk(`${d}›${c}›${g}`, g, 2, dotacion, categoria, cargo);
      cat.children.push(leaf);
    }
    return leaf;
  };

  const pset = new Set(periods);
  for (const r of rows) {
    if (!pset.has(r.period)) continue;
    const v = hcOf(r, incluirCesados);
    if (v === 0) continue;
    const leaf = nodeFor(r.dotacion, r.categoria, r.cargo);
    leaf.hc[r.period] = (leaf.hc[r.period] ?? 0) + v;
  }
  for (const b of budget) {
    const leaf = nodeFor(b.dotacion, b.categoria, b.cargo);
    leaf.budget += b.cantidad;
  }

  // acumula hojas → padres
  const rollup = (n: MatrixNode): void => {
    for (const c of n.children) {
      rollup(c);
      n.budget += c.budget;
      for (const [p, v] of Object.entries(c.hc)) {
        n.hc[p] = (n.hc[p] ?? 0) + v;
      }
    }
  };
  const sortRec = (list: MatrixNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label, "es"));
    for (const n of list) sortRec(n.children);
  };

  const out = Array.from(roots.values());
  for (const r of out) rollup(r);
  sortRec(out);
  return out;
}

/** Filtra un árbol ya construido por texto (mantiene ancestros de coincidencias) */
export function filterMatrix(nodes: MatrixNode[], q: string): MatrixNode[] {
  if (!q.trim()) return nodes;
  const needle = q.trim().toLocaleLowerCase("es");
  const walk = (n: MatrixNode): MatrixNode | null => {
    const hit = n.label.toLocaleLowerCase("es").includes(needle);
    const kids = n.children
      .map(walk)
      .filter((c): c is MatrixNode => c !== null);
    if (hit || kids.length > 0) return { ...n, children: hit ? n.children : kids };
    return null;
  };
  return nodes.map(walk).filter((n): n is MatrixNode => n !== null);
}
