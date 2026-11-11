"use client";

import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ChartData } from "@/lib/chart-data";
import type { PublicCause } from "@/lib/public-data";
import CausesGrid, { type CausesViewer } from "@/components/grid/CausesGrid";
import { CategoryDonut, ChartCaption, TopCausesBar } from "@/components/charts/GiftlyCharts";
import { useRouter } from "next/navigation";

/** Category donut + top causes + read-only causes grid. Clicking a slice filters the grid. */
export default function CausesExplorer({
  causes,
  data,
  initialCategory = null,
  viewer,
  myGiving = null,
}: {
  causes: PublicCause[];
  data: ChartData;
  initialCategory?: string | null;
  viewer?: CausesViewer;
  myGiving?: Record<string, number> | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(
    initialCategory && causes.some((c) => c.category === initialCategory) ? initialCategory : null
  );
  const onSelect = useCallback((c: string | null) => setCategory(c), []);
  const openCause = useCallback((slug: string) => router.push(`/causes/${slug}`), [router]);
  const shown = category ? causes.filter((c) => c.category === category).length : causes.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <ChartCaption />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
        <CategoryDonut data={data} selected={category} onSelect={onSelect} />
        <TopCausesBar data={data} onSelectCause={openCause} />
      </Box>
      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800 }}>All causes</Typography>
          <Typography variant="body2" color="text.secondary">
            {shown} of {causes.length}
          </Typography>
          {category && (
            <Chip label={`Category: ${category}`} onDelete={() => setCategory(null)} color="primary" size="small" />
          )}
        </Box>
        <CausesGrid causes={causes} category={category} viewer={viewer} myGiving={myGiving} />
      </Paper>
    </Box>
  );
}
