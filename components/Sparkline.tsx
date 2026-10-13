"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/types";

/** Tiny temperature trace with the animal's danger line. */
export default function Sparkline({ data, critical }: { data: TrendPoint[]; critical: number }) {
  const temps = data.map((d) => d.temp);
  const lo = Math.min(...temps, critical) - 2;
  const hi = Math.max(...temps, critical) + 1;

  return (
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <YAxis hide domain={[lo, hi]} />
        <ReferenceLine y={critical} stroke="#D83A2C" strokeDasharray="2 3" />
        <Line type="linear" dataKey="temp" stroke="#141414" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
