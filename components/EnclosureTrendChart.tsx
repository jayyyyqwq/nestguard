"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clock, isShortSpan } from "@/lib/display";
import type { Limits, TrendPoint } from "@/lib/types";

const AXIS = { fontSize: 11, fill: "#5E5E57", fontFamily: "var(--font-plex-mono)" };

/** One metric over time; limit lines show where watch / danger begin. */
export default function EnclosureTrendChart({
  data,
  dataKey,
  unit,
  limits,
  height = 220,
}: {
  data: TrendPoint[];
  dataKey: "temp" | "humidity" | "airQuality";
  unit: string;
  limits?: Limits;
  height?: number;
}) {
  const withSeconds = isShortSpan(data);
  const values = data.map((d) => d[dataKey]);
  const lo = Math.min(...values, limits?.attention ?? Infinity);
  const hi = Math.max(...values, limits?.critical ?? -Infinity);
  const pad = (hi - lo) * 0.15 || 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#C4C4BB" strokeDasharray="1 3" />
        <XAxis
          dataKey="time"
          tickFormatter={(t: string) => clock(t, withSeconds)}
          tick={AXIS}
          axisLine={{ stroke: "#141414" }}
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]}
          tick={AXIS}
          axisLine={{ stroke: "#141414" }}
          tickLine={false}
          width={48}
        />
        {limits && (
          <>
            <ReferenceLine y={limits.attention} stroke="#E0A400" strokeWidth={1.5} strokeDasharray="5 4" />
            <ReferenceLine y={limits.critical} stroke="#D83A2C" strokeWidth={1.5} strokeDasharray="5 4" />
          </>
        )}
        <Tooltip
          labelFormatter={(t: string) => clock(t, true)}
          formatter={(v: number) => [`${v}${unit}`, ""]}
          separator=""
          contentStyle={{
            borderRadius: 0,
            border: "1px solid #141414",
            background: "#F5F5F0",
            fontSize: 12,
            fontFamily: "var(--font-plex-mono)",
          }}
          labelStyle={{ color: "#5E5E57" }}
        />
        <Line
          type="linear"
          dataKey={dataKey}
          stroke="#141414"
          strokeWidth={2}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 0, fill: "#141414" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
