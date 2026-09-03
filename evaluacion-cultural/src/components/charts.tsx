"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { score, signedScore } from "@/lib/format";
import type { CompetenciaScore } from "@/lib/types";

/* Paleta: azul de marca + rojo semántico, referencia neutra para la meta. */
export const C = {
  brand: "#0957c3",
  brandFill: "rgba(9, 87, 195, 0.10)",
  danger: "#e31013",
  warn: "#b45309",
  ok: "#047857",
  ref: "#52525b",
  grid: "#ececef",
  tick: "#9b9ba3",
  ink: "#3f3f46",
};

const AXIS_TICK = { fontSize: 11.5, fill: C.tick } as const;

/* ---------- leyenda ---------- */

export function LegendRow({
  items,
}: {
  items: { label: string; swatch: "bar" | "line" | "tick"; color: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
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

/* ---------- tooltip ---------- */

type TooltipRow = { name: string; value: string; color?: string };

function Panel({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2.5 shadow-[0_6px_20px_rgba(23,23,26,0.10)]">
      <p className="mb-1.5 text-[12px] font-medium text-ink-900">{title}</p>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
              {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
              {r.name}
            </span>
            <span className="tnum font-mono text-[12px] font-medium text-ink-900">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- comparativo por competencia ---------- */

export function CompetenciaBars({ data }: { data: CompetenciaScore[] }) {
  const meta = data[0]?.objetivo ?? 4;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={C.grid} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: C.grid }}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          width={120}
          tick={{ fontSize: 12, fill: C.ink }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(23,23,26,0.03)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as CompetenciaScore;
            return (
              <Panel
                title={p.nombre}
                rows={[
                  { name: "Puntaje", value: score(p.score), color: C.brand },
                  { name: "Meta", value: score(p.objetivo), color: C.ref },
                  { name: "Brecha", value: signedScore(p.score - p.objetivo) },
                  { name: "Respuestas", value: String(p.n) },
                ]}
              />
            );
          }}
        />
        <ReferenceLine x={meta} stroke={C.ref} strokeDasharray="4 4" strokeWidth={1.5} />
        <Bar dataKey="score" barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => {
            const gap = d.score - d.objetivo;
            const color = d.score === 0 ? "#c9c9cf" : gap >= 0 ? C.brand : gap >= -0.5 ? C.warn : C.danger;
            return <Cell key={d.competenciaId} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- radar por competencia ---------- */

export function CompetenciaRadar({ data }: { data: CompetenciaScore[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 12, right: 30, bottom: 12, left: 30 }}>
        <PolarGrid stroke={C.grid} />
        <PolarAngleAxis dataKey="nombre" tick={{ fontSize: 11.5, fill: C.ink }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: C.tick }} axisLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as CompetenciaScore;
            return (
              <Panel
                title={p.nombre}
                rows={[
                  { name: "Puntaje", value: score(p.score), color: C.brand },
                  { name: "Meta", value: score(p.objetivo), color: C.ref },
                ]}
              />
            );
          }}
        />
        <Radar name="Meta" dataKey="objetivo" stroke={C.ref} strokeDasharray="4 4" fill="none" isAnimationActive={false} />
        <Radar name="Puntaje" dataKey="score" stroke={C.brand} strokeWidth={2} fill={C.brandFill} fillOpacity={1} isAnimationActive={false} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
