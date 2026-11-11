"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import type { ChartData } from "@/lib/chart-data";
import { CashVsGiftsDonut, CategoryDonut, ChartCaption, GiftStatusBar, RaisedOverTimeChart, TopCausesBar } from "./GiftlyCharts";

/** "Where the money goes" on the home page. Click a top-cause bar to open that cause. */
export default function HomeCharts({ data }: { data: ChartData }) {
  const router = useRouter();
  const openCause = useCallback((slug: string) => router.push(`/causes/${slug}`), [router]);
  const openCategory = useCallback(
    (category: string | null) => router.push(category ? `/causes?category=${encodeURIComponent(category)}` : "/causes"),
    [router]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <ChartCaption />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" }, gap: 2.5 }}>
        <RaisedOverTimeChart data={data} />
        <CategoryDonut data={data} onSelect={openCategory} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2.5 }}>
        <TopCausesBar data={data} onSelectCause={openCause} />
        <CashVsGiftsDonut data={data} />
        <GiftStatusBar data={data} />
      </Box>
    </Box>
  );
}
