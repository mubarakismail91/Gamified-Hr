import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale } from "@/hooks/useLocale";
import type { Bi } from "@/data";

const GREEN = "hsl(149 100% 21%)";
const GOLD = "hsl(40 49% 52%)";
const NAVY = "hsl(221 46% 30%)";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(220 20% 89%)",
  fontSize: 12,
  padding: "6px 10px",
};

export function ParticipationChart({ data: points }: { data: { month: Bi; rate: number }[] }) {
  const { lang } = useLocale();
  const data = points.map((d) => ({ name: d.month[lang], rate: d.rate }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, ""]} />
        <Area type="monotone" dataKey="rate" stroke={GREEN} strokeWidth={2} fill="url(#pg)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function XpByDeptChart({ data: rows }: { data: { department: Bi; avgXp: number }[] }) {
  const { lang } = useLocale();
  const data = rows.map((d) => ({ name: d.department[lang], xp: d.avgXp }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          domain={[0, "dataMax"]}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="name" width={128} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210 24% 96%)" }} />
        <Bar dataKey="xp" fill={GREEN} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BadgeDistributionChart({ data: rows }: { data: { tier: Bi; count: number }[] }) {
  const { lang } = useLocale();
  const data = rows.map((d) => ({ name: d.tier[lang], count: d.count }));
  const colors = ["hsl(28 55% 45%)", "hsl(215 15% 55%)", GOLD];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, "dataMax"]}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210 24% 96%)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SdtScoresChart({ data: rows }: { data: { scale: Bi; score: number }[] }) {
  const { lang } = useLocale();
  const data = rows.map((d) => ({ name: d.scale[lang], score: d.score }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          domain={[0, 7]}
          ticks={[0, 1, 2, 3, 4, 5, 6, 7]}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210 24% 96%)" }} />
        <Bar dataKey="score" fill={NAVY} radius={[4, 4, 0, 0]} barSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DemographicsBar({
  data,
}: {
  data: { key: { en: string; ar: string }; value: number }[];
}) {
  const { lang } = useLocale();
  const rows = data.map((d) => ({ name: d.key[lang], value: d.value }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210 24% 96%)" }} />
        <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
