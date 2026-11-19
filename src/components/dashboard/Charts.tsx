import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--night)", border: "none", borderRadius: 10, color: "var(--night-foreground)", fontSize: 12 },
  labelStyle: { color: "var(--night-muted)" },
};

export function AreaTrend<T extends Record<string, unknown>>({
  data,
  x,
  series,
  height = 260,
  format,
}: {
  data: T[];
  x: keyof T & string;
  series: { key: keyof T & string; label: string; color: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={x} {...axis} minTickGap={16} />
          <YAxis {...axis} width={56} tickFormatter={(v) => (format ? format(v) : String(v))} />
          <Tooltip {...tooltipStyle} formatter={(v: number, name) => [format ? format(v) : v, series.find((s) => s.key === name)?.label ?? name]} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.2} fill={`url(#g-${s.key})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Bars<T extends Record<string, unknown>>({
  data,
  x,
  series,
  height = 260,
  format,
}: {
  data: T[];
  x: keyof T & string;
  series: { key: keyof T & string; label: string; color: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={x} {...axis} />
          <YAxis {...axis} width={56} tickFormatter={(v) => (format ? format(v) : String(v))} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number, name) => [format ? format(v) : v, series.find((s) => s.key === name)?.label ?? name]} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const compactBRL = (v: number) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`);
