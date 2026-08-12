"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num, signed } from "@/lib/format";

/* Paleta validada (validate_palette.js): azul #0957C3 + rojo #E31013,
   ΔE protan 100. Presupuesto = referencia neutra, no serie. */
export const C = {
  brand: "#0957c3",
  brandFill: "rgba(9, 87, 195, 0.10)",
  danger: "#e31013",
  ref: "#52525b",
  grid: "#ececef",
  tick: "#9b9ba3",
  ink: "#3f3f46",
};

const AXIS_TICK = { fontSize: 11.5, fill: C.tick } as const;

/* ---------- leyenda compartida ---------- */

export function LegendRow({
  items,
}: {
  items: { label: string; swatch: "bar" | "line" | "tick"; color: string }[];
}) {
  return (
    <div className="flex items-center gap-4">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] text-ink-500">
          {it.swatch === "bar" && (
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          )}
          {it.swatch === "line" && (
            <span className="h-[2px] w-4 rounded-full" style={{ background: it.color }} />
          )}
          {it.swatch === "tick" && (
            <span className="h-3 w-[2.5px] rounded-full" style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- tooltip compartido ---------- */

type TooltipRow = { name: string; value: string; color?: string };

function Panel({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2.5 shadow-[0_6px_20px_rgba(23,23,26,0.10)]">
      <p className="mb-1.5 text-[12px] font-medium text-ink-900">{title}</p>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
              {r.color && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: r.color }}
                />
              )}
              {r.name}
            </span>
            <span className="tnum font-mono text-[12px] font-medium text-ink-900">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- evolución mensual ---------- */

export type EvolutionPoint = {
  label: string;
  hc: number | null;
  presupuesto: number | null;
};

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  const values = data.flatMap((d) =>
    [d.hc, d.presupuesto].filter((v): v is number => v !== null)
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(Math.round((max - min) * 0.35), 15);
  const lo = Math.max(0, Math.floor((min - pad) / 25) * 25);
  const hi = Math.ceil((max + pad) / 25) * 25;
  const lastIdx = (() => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i].hc !== null) return i;
    return -1;
  })();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 18, right: 46, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: C.grid }}
          interval={0}
        />
        <YAxis
          domain={[lo, hi]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => num(v)}
        />
        <Tooltip
          cursor={{ stroke: C.tick, strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as EvolutionPoint;
            const rows: TooltipRow[] = [];
            if (p.hc !== null)
              rows.push({ name: "Dotación", value: num(p.hc), color: C.brand });
            if (p.presupuesto !== null)
              rows.push({
                name: "Presupuesto",
                value: num(p.presupuesto),
                color: C.ref,
              });
            if (p.hc !== null && p.presupuesto !== null)
              rows.push({
                name: "Diferencia",
                value: signed(p.hc - p.presupuesto),
              });
            return <Panel title={String(label)} rows={rows} />;
          }}
        />
        <Line
          type="linear"
          dataKey="presupuesto"
          stroke={C.ref}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          label={(props: unknown) => {
            const { x, y, index, value } = props as {
              x: number;
              y: number;
              index: number;
              value: number | null;
            };
            if (index !== data.length - 1 || value === null) return <g />;
            return (
              <text
                x={x + 8}
                y={y + 3.5}
                fontSize={11}
                fontWeight={500}
                fill={C.ref}
              >
                {num(value)}
              </text>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="hc"
          stroke={C.brand}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={C.brandFill}
          isAnimationActive={false}
          dot={{ r: 3.5, fill: C.brand, stroke: "#fefefe", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: C.brand, stroke: "#fefefe", strokeWidth: 2 }}
          label={(props: unknown) => {
            const { x, y, index, value } = props as {
              x: number;
              y: number;
              index: number;
              value: number | null;
            };
            if (index !== lastIdx || value === null) return <g />;
            return (
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                fontSize={11.5}
                fontWeight={600}
                fill={C.ink}
              >
                {num(value)}
              </text>
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- altas y bajas (divergente) ---------- */

export type MovPoint = {
  label: string;
  altas: number;
  bajasNeg: number;
  bajas: number;
};

export function MovimientosChart({ data }: { data: MovPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart
        data={data}
        stackOffset="sign"
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
      >
        <CartesianGrid stroke={C.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => num(Math.abs(Number(v)))}
        />
        <Tooltip
          cursor={{ fill: "rgba(23,23,26,0.03)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as MovPoint;
            return (
              <Panel
                title={String(label)}
                rows={[
                  { name: "Altas", value: num(p.altas), color: C.brand },
                  { name: "Bajas", value: num(p.bajas), color: C.danger },
                  { name: "Neto", value: signed(p.altas - p.bajas) },
                ]}
              />
            );
          }}
        />
        <ReferenceLine y={0} stroke={C.grid} strokeWidth={1} />
        <Bar
          dataKey="altas"
          stackId="m"
          fill={C.brand}
          barSize={14}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="bajasNeg"
          stackId="m"
          fill={C.danger}
          barSize={14}
          radius={[0, 0, 4, 4]}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
