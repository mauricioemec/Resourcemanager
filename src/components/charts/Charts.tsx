"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "#8b97b8" };
const GRID = "#283153";
const tooltipStyle = {
  background: "#141a2e",
  border: "1px solid #283153",
  borderRadius: 10,
  fontSize: 12,
  color: "#e8ecf7",
};

export function DemandCapacityArea({
  data,
}: {
  data: { label: string; demand: number; capacity: number; allocated: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gCap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b8def" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#5b8def" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} interval={2} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="capacity" name="Capacity" stroke="#5b8def" fill="url(#gCap)" strokeWidth={2} />
        <Area type="monotone" dataKey="demand" name="Demand" stroke="#ef4444" fill="url(#gDemand)" strokeWidth={2} />
        <Line type="monotone" dataKey="allocated" name="Allocated" stroke="#22c55e" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function UtilizationLine({
  data,
}: {
  data: { label: string; utilization: number }[];
}) {
  const pct = data.map((d) => ({ ...d, util: Math.round(d.utilization * 100) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={pct} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} interval={2} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} unit="%" domain={[0, 120]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
        <Line type="monotone" dataKey="util" name="Utilization" stroke="#5b8def" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricBar({
  data,
  keys = ["demand", "capacity", "allocated"],
}: {
  data: { label: string; demand: number; capacity: number; allocated: number; color?: string }[];
  keys?: string[];
}) {
  const colors: Record<string, string> = {
    demand: "#ef4444",
    capacity: "#5b8def",
    allocated: "#22c55e",
  };
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} name={k[0].toUpperCase() + k.slice(1)} fill={colors[k]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SingleBar({
  data,
  dataKey = "demand",
}: {
  data: { label: string; demand: number; color?: string }[];
  dataKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 16, top: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={80} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? "#5b8def"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StaffingArea({
  data,
  series,
}: {
  data: Record<string, number | string>[];
  series: { code: string; name: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} interval={2} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Area
            key={s.code}
            type="monotone"
            dataKey={s.code}
            name={s.name}
            stackId="1"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.55}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data }: { data: { v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke="#5b8def" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
