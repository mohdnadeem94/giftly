"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent, IRowNode, RowClassParams, RowClickedEvent } from "ag-grid-community";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { gridTheme } from "./agSetup";
import type { PublicCause } from "@/lib/public-data";

type Row = PublicCause & { pct: number; mine: number };

/** Who is looking: public/donor see Donate; a charity sees its own cause highlighted and no Donate buttons. */
export type CausesViewer = { mode: "public" | "donor" | "charity"; ownSlug: string | null };
type GridCtx = CausesViewer;

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function CauseCell(p: CustomCellRendererProps<Row>) {
  const r = p.data;
  if (!r) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%", minWidth: 0 }}>
      <img src={r.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
        <Box sx={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</Box>
        {(p.context as GridCtx | undefined)?.ownSlug === r.slug && (
          <Box component="span" sx={{ display: "inline-block", mr: 0.75, px: 0.75, borderRadius: 999, bgcolor: "#166534", color: "#fff", fontSize: 11, fontWeight: 800 }}>
            Your charity
          </Box>
        )}
        {r.verifiedDemo && (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, color: "#166534", fontSize: 12, fontWeight: 700 }}>
            <VerifiedRoundedIcon sx={{ fontSize: 14 }} /> Verified (demo)
          </Box>
        )}
      </Box>
    </Box>
  );
}

function RaisedCell(p: CustomCellRendererProps<Row>) {
  const r = p.data;
  if (!r) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 0.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <strong>{money(r.raisedCents)}</strong>
        <span style={{ color: "#57534e" }}>{r.pct}%</span>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(100, r.pct)} sx={{ height: 6 }} />
    </Box>
  );
}

function DonateCell(p: CustomCellRendererProps<Row>) {
  const router = useRouter();
  const r = p.data;
  const ctx = p.context as GridCtx | undefined;
  if (!r) return null;
  if (ctx?.mode === "charity") {
    const own = ctx.ownSlug === r.slug;
    return (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Button
          size="small"
          variant={own ? "contained" : "outlined"}
          sx={{ borderRadius: 999, px: 2, py: 0.25, fontSize: 13 }}
          onClick={(e) => {
            e.stopPropagation();
            router.push(own ? "/charity" : `/causes/${r.slug}`);
          }}
        >
          {own ? "Dashboard" : "View"}
        </Button>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Button
        size="small"
        variant="contained"
        sx={{ borderRadius: 999, px: 2, py: 0.25, fontSize: 13 }}
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/give/${r.slug}?mode=gift`);
        }}
      >
        Donate
      </Button>
    </Box>
  );
}

/** Public, read-only causes table. Optional category filter (driven by the chart). */
export default function CausesGrid({
  causes,
  category,
  viewer = { mode: "public", ownSlug: null },
  myGiving = null,
}: {
  causes: PublicCause[];
  category: string | null;
  viewer?: CausesViewer;
  myGiving?: Record<string, number> | null;
}) {
  const router = useRouter();
  const apiRef = useRef<GridApi<Row> | null>(null);
  const categoryRef = useRef<string | null>(category);

  const rows = useMemo<Row[]>(
    () =>
      causes.map((c) => ({
        ...c,
        pct: c.goalCents > 0 ? Math.round((c.raisedCents / c.goalCents) * 100) : 0,
        mine: myGiving?.[c.slug] ?? 0,
      })),
    [causes, myGiving]
  );

  useEffect(() => {
    categoryRef.current = category;
    apiRef.current?.onFilterChanged();
  }, [category]);

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { field: "name", headerName: "Cause", cellRenderer: CauseCell, flex: 2, minWidth: 230, filter: "agTextColumnFilter" },
      { field: "category", headerName: "Category", flex: 1, minWidth: 120 },
      { field: "region", headerName: "Region", flex: 1, minWidth: 120 },
      {
        field: "goalCents",
        headerName: "Goal",
        width: 110,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""),
      },
      { field: "raisedCents", headerName: "Raised", flex: 1.3, minWidth: 170, cellRenderer: RaisedCell, filter: "agNumberColumnFilter", sort: "desc" },
      { field: "openNeeds", headerName: "Open needs", width: 120, type: "rightAligned" },
      ...(viewer.mode === "donor"
        ? [
            {
              field: "mine",
              headerName: "You gave",
              width: 115,
              type: "rightAligned",
              filter: "agNumberColumnFilter",
              valueFormatter: (p: { value: unknown }) => (typeof p.value === "number" && p.value > 0 ? money(p.value) : "—"),
            } as ColDef<Row>,
          ]
        : []),
      { colId: "donate", headerName: "", width: 120, cellRenderer: DonateCell, sortable: false, filter: false },
    ],
    [viewer.mode]
  );
  const context = useMemo<GridCtx>(() => viewer, [viewer.mode, viewer.ownSlug]); // eslint-disable-line react-hooks/exhaustive-deps
  const getRowStyle = useCallback(
    (p: RowClassParams<Row>) => (p.data && p.data.slug === viewer.ownSlug ? { background: "#f0fdf4" } : undefined),
    [viewer.ownSlug]
  );
  const defaultColDef = useMemo<ColDef<Row>>(() => ({ sortable: true, resizable: true, filter: true, suppressHeaderMenuButton: true }), []);

  const isExternalFilterPresent = useCallback(() => !!categoryRef.current, []);
  const doesExternalFilterPass = useCallback((node: IRowNode<Row>) => !!node.data && node.data.category === categoryRef.current, []);
  const getRowId = useCallback((p: { data: Row }) => p.data.slug, []);
  const onGridReady = useCallback((e: GridReadyEvent<Row>) => {
    apiRef.current = e.api;
  }, []);
  const onRowClicked = useCallback((e: RowClickedEvent<Row>) => e.data && router.push(`/causes/${e.data.slug}`), [router]);

  return (
    <Box sx={{ height: Math.min(560, 120 + rows.length * 64), "& .ag-row": { cursor: "pointer" } }}>
      <AgGridReact<Row>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowHeight={64}
        getRowId={getRowId}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        onGridReady={onGridReady}
        onRowClicked={onRowClicked}
        context={context}
        getRowStyle={getRowStyle}
        suppressCellFocus
        overlayNoRowsTemplate="No causes match this filter."
      />
    </Box>
  );
}
