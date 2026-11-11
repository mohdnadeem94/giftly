"use client";

import { useMemo } from "react";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import Box from "@mui/material/Box";
import { gridTheme } from "./agSetup";
import StatusBadge from "./StatusBadge";

/** Public, read-only donations feed. Rows contain safe fields only (no emails, no PayPal IDs). */
export type DonationRow = {
  date: string;
  displayName: string;
  type: "CASH" | "GIFT" | "HYBRID";
  amountCents: number;
  status: string;
  cause?: string;
};

const TYPE_LABEL: Record<string, string> = { CASH: "Cash", GIFT: "Gift", HYBRID: "Gift + cash" };

function TypeCell(p: CustomCellRendererProps<DonationRow>) {
  const v = p.value as string;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: "100%" }}>
      <span aria-hidden="true">{v === "CASH" ? "💚" : "🎁"}</span>
      {TYPE_LABEL[v] ?? v}
    </Box>
  );
}

export default function DonationsGrid({
  rows,
  showCause = false,
  height = 470,
  pageSize = 10,
}: {
  rows: DonationRow[];
  showCause?: boolean;
  height?: number;
  pageSize?: number;
}) {
  const columnDefs = useMemo<ColDef<DonationRow>[]>(
    () => [
      {
        field: "date",
        headerName: "Date",
        minWidth: 90,
        flex: 0.8,
        sort: "desc",
        filter: "agDateColumnFilter",
        valueGetter: (p) => (p.data ? new Date(p.data.date) : null),
        valueFormatter: (p) => (p.value instanceof Date ? p.value.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""),
      },
      { field: "displayName", headerName: "Donor", flex: 1.2, minWidth: 110, filter: "agTextColumnFilter" },
      ...(showCause ? [{ field: "cause", headerName: "Cause", flex: 1.2, minWidth: 160 } as ColDef<DonationRow>] : []),
      { field: "type", headerName: "Type", flex: 0.9, minWidth: 105, cellRenderer: TypeCell },
      {
        field: "amountCents",
        headerName: "Amount",
        flex: 0.8,
        minWidth: 95,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => (typeof p.value === "number" ? `$${(p.value / 100).toFixed(2)}` : ""),
        cellStyle: { fontWeight: 700 },
      },
      { field: "status", headerName: "Status", flex: 0.9, minWidth: 110, cellRenderer: (p: CustomCellRendererProps<DonationRow>) => <StatusBadge value={p.value as string} /> },
    ],
    [showCause]
  );

  const defaultColDef = useMemo<ColDef<DonationRow>>(() => ({ sortable: true, resizable: true, filter: true, suppressHeaderMenuButton: true }), []);

  return (
    <Box sx={{ height }}>
      <AgGridReact<DonationRow>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowHeight={46}
        pagination
        paginationPageSize={pageSize}
        paginationPageSizeSelector={[10, 25, 50]}
        suppressCellFocus
        overlayNoRowsTemplate="No donations yet."
      />
    </Box>
  );
}
