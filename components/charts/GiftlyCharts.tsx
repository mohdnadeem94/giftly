"use client";

// AG Charts (Community) for Giftly's public transparency views.
import { useEffect, useMemo, useState } from "react";
import { AgCharts } from "ag-charts-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type AgCartesianChartOptions,
  type AgPolarChartOptions,
} from "ag-charts-community";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import type { ChartData } from "@/lib/chart-data";

ModuleRegistry.registerModules([AllCommunityModule]);

const FILLS = ["#166534", "#be123c", "#d97706", "#2563eb", "#7c3aed", "#0891b2"];
const THEME = {
  baseTheme: "ag-default" as const,
  palette: { fills: FILLS, strokes: FILLS },
};
const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

function ChartCard({ title, subtitle, children, height = 280 }: { title: string; subtitle?: string; children: React.ReactNode; height?: number }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", height: "100%" }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      <Box sx={{ height, mt: 1 }}>{children}</Box>
    </Paper>
  );
}

/** Avoid server/client mismatch: charts render only in the browser. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function Chart({ options }: { options: AgCartesianChartOptions | AgPolarChartOptions }) {
  const mounted = useMounted();
  if (!mounted) return <Skeleton variant="rounded" height="100%" sx={{ borderRadius: "12px" }} />;
  return <AgCharts options={options} style={{ height: "100%", width: "100%" }} />;
}

export function RaisedOverTimeChart({ data, height }: { data: ChartData; height?: number }) {
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme: THEME,
      background: { visible: false },
      data: data.raisedOverTime.map((d) => ({ ...d, date: new Date(`${d.date}T12:00:00`) })),
      series: [
        { type: "area", xKey: "date", yKey: "gifts", yName: "Gifts", stacked: true, fillOpacity: 0.55, stroke: "#be123c", fill: "#be123c" },
        { type: "area", xKey: "date", yKey: "cash", yName: "Cash", stacked: true, fillOpacity: 0.55, stroke: "#166534", fill: "#166534" },
      ],
      axes: {
        x: { type: "time", position: "bottom", label: { format: "%b %d" } },
        y: { type: "number", position: "left", label: { formatter: ({ value }: { value: number }) => usd(value) } },
      },
      legend: { position: "bottom" },
    }),
    [data]
  );
  return (
    <ChartCard title="Raised over time" subtitle={`${usd(data.totals.raised)} so far, cash and gifts`} height={height}>
      <Chart options={options} />
    </ChartCard>
  );
}

export function CategoryDonut({
  data,
  selected,
  onSelect,
  height,
}: {
  data: ChartData;
  selected?: string | null;
  onSelect?: (category: string | null) => void;
  height?: number;
}) {
  const options = useMemo<AgPolarChartOptions>(
    () => ({
      theme: THEME,
      background: { visible: false },
      data: data.byCategory,
      series: [
        {
          type: "donut",
          angleKey: "amount",
          legendItemKey: "category",
          calloutLabelKey: "category",
          innerRadiusRatio: 0.62,
          innerLabels: [{ text: usd(data.totals.raised), fontWeight: "bold", fontSize: 18 }, { text: "raised", fontSize: 12 }],
          tooltip: { renderer: ({ datum }: { datum: { category: string; amount: number } }) => ({ heading: datum.category, data: [{ label: "Raised", value: usd(datum.amount) }] }) },
          listeners: onSelect
            ? { seriesNodeClick: (e: { datum: { category: string } }) => onSelect(e.datum.category === selected ? null : e.datum.category) }
            : undefined,
        },
      ],
      legend: { position: "bottom" },
    }),
    [data, onSelect, selected]
  );
  return (
    <ChartCard title="Funds by category" subtitle={onSelect ? "Click a slice to filter the causes" : undefined} height={height}>
      <Chart options={options} />
    </ChartCard>
  );
}

export function CashVsGiftsDonut({ data, height }: { data: ChartData; height?: number }) {
  const options = useMemo<AgPolarChartOptions>(
    () => ({
      theme: { ...THEME, palette: { fills: ["#166534", "#be123c"], strokes: ["#166534", "#be123c"] } },
      background: { visible: false },
      data: data.cashVsGifts,
      series: [
        {
          type: "donut",
          angleKey: "amount",
          legendItemKey: "type",
          sectorLabelKey: "amount",
          sectorLabel: { formatter: ({ value }: { value: number }) => usd(value), color: "#fff", fontWeight: "bold" },
          innerRadiusRatio: 0.55,
        },
      ],
      legend: { position: "bottom" },
    }),
    [data]
  );
  return (
    <ChartCard title="Cash vs gifts" subtitle="How donors chose to give" height={height}>
      <Chart options={options} />
    </ChartCard>
  );
}

export function TopCausesBar({ data, onSelectCause, height }: { data: ChartData; onSelectCause?: (slug: string) => void; height?: number }) {
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme: THEME,
      background: { visible: false },
      data: data.topCauses,
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "cause",
          yKey: "amount",
          yName: "Raised",
          fill: "#166534",
          cornerRadius: 6,
          label: { formatter: ({ value }: { value: number }) => usd(value), placement: "inside-end", color: "#fff" },
          listeners: onSelectCause ? { seriesNodeClick: (e: { datum: { slug: string } }) => onSelectCause(e.datum.slug) } : undefined,
        },
      ],
      axes: {
        x: { type: "category", position: "left" },
        y: { type: "number", position: "bottom", label: { formatter: ({ value }: { value: number }) => usd(value) } },
      },
      legend: { enabled: false },
    }),
    [data, onSelectCause]
  );
  return (
    <ChartCard title="Top causes" subtitle="Total raised per cause" height={height}>
      <Chart options={options} />
    </ChartCard>
  );
}

export function GiftStatusBar({ data, height }: { data: ChartData; height?: number }) {
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme: THEME,
      background: { visible: false },
      data: data.giftStatus,
      series: [
        { type: "bar", xKey: "cause", yKey: "Paid", yName: "Paid", stacked: true, fill: "#d97706" },
        { type: "bar", xKey: "cause", yKey: "Bought", yName: "Bought", stacked: true, fill: "#2563eb" },
        { type: "bar", xKey: "cause", yKey: "Delivered", yName: "Delivered", stacked: true, fill: "#166534" },
      ],
      axes: {
        x: { type: "category", position: "bottom" },
        y: { type: "number", position: "left" },
      },
      legend: { position: "bottom" },
    }),
    [data]
  );
  return (
    <ChartCard title="Gift journey" subtitle={`${data.totals.delivered} of ${data.totals.giftCount} gifts delivered`} height={height}>
      <Chart options={options} />
    </ChartCard>
  );
}

/** One-line AI summary generated on the server from the real numbers. Hidden if unavailable. */
export function ChartCaption({ cause }: { cause?: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch(`/api/public/charts?caption=1${cause ? `&cause=${encodeURIComponent(cause)}` : ""}`)
      .then((r) => (r.ok ? r.json() : { caption: null }))
      .then((j) => alive && setText(j.caption ?? null))
      .catch(() => alive && setText(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cause]);

  if (!loading && !text) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.75, borderRadius: "14px", bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
      <AutoAwesomeRoundedIcon sx={{ color: "primary.main", fontSize: 20, mt: 0.2 }} />
      <Box sx={{ flex: 1 }}>
        {loading ? (
          <Skeleton width="80%" />
        ) : (
          <Typography sx={{ fontWeight: 600 }}>{text}</Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Summary written by the Elf from the numbers in these charts.
        </Typography>
      </Box>
    </Box>
  );
}
