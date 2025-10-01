"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Label } from "recharts";
import { LoaderCircle } from "lucide-react";

import NumberTicker from "@/components/magicui/number-ticker";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/** ---------- Types ---------- */
type StatsData = {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  /** minutes (avg per visit) after normalization */
  totaltime: { value: number; prev: number };
};

type RawStats =
  | {
      pageviews?: { value?: number; prev?: number } | number;
      visitors?: { value?: number; prev?: number } | number;
      visits?: { value?: number; prev?: number } | number;
      bounces?: { value?: number; prev?: number } | number;
      /** Umami typically returns *total seconds* for the period; we convert to avg minutes */
      totaltime?: { value?: number; prev?: number } | number;
    }
  | Record<string, any>;

/** ---------- Utils ---------- */
const toNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const unwrapValPrev = (maybe: unknown): { value: number; prev: number } => {
  // Accept {value, prev} or a bare number (value)
  if (typeof maybe === "object" && maybe !== null) {
    const obj = maybe as { value?: unknown; prev?: unknown };
    const value = toNum(obj.value, 0);
    const prev = toNum(obj.prev, 0);
    if (value !== 0 || prev !== 0) return { value, prev };
  }
  return { value: toNum(maybe, 0), prev: 0 };
};

/**
 * Normalize whatever the backend returns into StatsData.
 * - Wraps flat numbers into {value, prev}
 * - Converts totaltime seconds -> *average minutes per visit*
 */
const normalizeToStatsData = (raw: RawStats): StatsData => {
  const pageviews = unwrapValPrev(raw?.pageviews);
  const visitors = unwrapValPrev(raw?.visitors);
  const visits = unwrapValPrev(raw?.visits);
  const bounces = unwrapValPrev(raw?.bounces);
  const totaltimeRaw = unwrapValPrev(raw?.totaltime);

  // If backend provided *total seconds*, compute avg seconds per visit then convert to minutes.
  const visitsCurr = toNum(visits.value, 0);
  const visitsPrev = toNum(visits.prev, 0);

  const totalSecondsCurr = toNum(totaltimeRaw.value, 0);
  const totalSecondsPrev = toNum(totaltimeRaw.prev, 0);

  const avgMinutesCurr =
    visitsCurr > 0 ? totalSecondsCurr / visitsCurr / 60 : 0;
  const avgMinutesPrev =
    visitsPrev > 0 ? totalSecondsPrev / visitsPrev / 60 : 0;

  return {
    pageviews,
    visitors,
    visits,
    bounces,
    totaltime: { value: avgMinutesCurr, prev: avgMinutesPrev },
  };
};

/** ---------- Data fetch (patched) ---------- */
const fetchStats = async (): Promise<StatsData> => {
  // In a client component, a relative path is fine; keep SSR override just in case.
  const baseUrl =
    typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_BASE_URL;

  const res = await fetch(`${baseUrl}/api/fetch-umami-stats`);
  if (!res.ok) {
    console.error("Failed to fetch stats:", res.status, res.statusText);
    // Stable zeroed fallback keeps UI rendering
    return {
      pageviews: { value: 0, prev: 0 },
      visitors: { value: 0, prev: 0 },
      visits: { value: 0, prev: 0 },
      bounces: { value: 0, prev: 0 },
      totaltime: { value: 0, prev: 0 },
    };
  }

  const raw: RawStats = await res.json();
  // console.log("Raw API response:", raw);
  return normalizeToStatsData(raw);
};

/** ---------- Chart config (fixed label typo) ---------- */
const chartConfig = {
  visitor_stats: {
    label: "Visitors",
  },
  pageviews: {
    label: "Page Views",
    color: "hsl(var(--chart-1))",
  },
  visitors: {
    label: "Users",
    color: "hsl(var(--chart-2))",
  },
  visits: {
    label: "Visits",
    color: "hsl(var(--chart-3))",
  },
  bounces: {
    label: "Bounces",
    color: "hsl(var(--chart-4))",
  },
  totaltime: {
    label: "Average Time (min)",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

/** ---------- Component ---------- */
export default function StatsChart() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const s = await fetchStats();
        if (mounted) setStats(s);
      } catch (e) {
        console.error("Error loading stats:", e);
        if (mounted) {
          setStats({
            pageviews: { value: 0, prev: 0 },
            visitors: { value: 0, prev: 0 },
            visits: { value: 0, prev: 0 },
            bounces: { value: 0, prev: 0 },
            totaltime: { value: 0, prev: 0 },
          });
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        type: "pageviews",
        visitors: stats.pageviews.value ?? 0,
        fill: "var(--color-pageviews)",
      },
      {
        type: "visitors",
        visitors: stats.visitors.value ?? 0,
        fill: "var(--color-visitors)",
      },
      {
        type: "visits",
        visitors: stats.visits.value ?? 0,
        fill: "var(--color-visits)",
      },
      {
        type: "bounces",
        visitors: stats.bounces.value ?? 0,
        fill: "var(--color-bounces)",
      },
      {
        type: "totaltime",
        visitors: stats.totaltime.value ?? 0,
        fill: "var(--color-totaltime)",
      },
    ];
  }, [stats]);

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center py-10">
        <LoaderCircle className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const visitsValue = stats.visits?.value ?? 0;

  return (
    <ChartContainer config={chartConfig} className="">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={chartData}
          dataKey="visitors"
          nameKey="type"
          innerRadius={70}
          strokeWidth={5}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                const cx = viewBox.cx as number;
                const cy = viewBox.cy as number;
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      y={cy}
                      className="fill-foreground text-5xl font-bold"
                    >
                      {/* Show Visits in center (fix from original, which showed pageviews) */}
                      {visitsValue}
                    </tspan>
                    <tspan
                      x={cx}
                      y={(cy || 0) + 24}
                      className="fill-muted-foreground "
                    >
                      Visits
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
