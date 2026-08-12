export type AggRow = {
  period: string;
  empresa: string;
  dotacion: string;
  categoria: string;
  area: string;
  cargo: string;
  total: number;
  activos: number;
};

export type BudgetRow = {
  id: number;
  anio: number;
  empresa: string;
  dotacion: string;
  categoria: string;
  area: string;
  cargo: string;
  cantidad: number;
};

export type Movimiento = {
  period: string;
  altas: number;
  bajas: number;
};

export type MonthSummary = {
  period: string;
  registros: number;
  empresas: number;
  cesados: number;
};

export type EmployeeRow = {
  id: number;
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

export type MergeCampo = "dotacion" | "categoria" | "area" | "cargo";

/** "todos" aplica la regla en dotación, categoría, área y cargo a la vez */
export type RuleCampo = MergeCampo | "todos";

export type MergeRule = {
  id: number;
  campo: RuleCampo;
  origen: string;
  destino: string;
  activo: boolean;
  nota: string;
};

export type MatrixNode = {
  key: string;
  label: string;
  level: 0 | 1 | 2;
  budget: number;
  hc: Record<string, number>;
  children: MatrixNode[];
  dotacion: string;
  categoria?: string;
  cargo?: string;
};
