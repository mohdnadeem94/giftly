"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import {
  type CellValueChangedEvent,
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  type GridReadyEvent,
  type IRowNode,
  type RowSelectionOptions,
  type SelectionChangedEvent,
} from "ag-grid-community";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ProofDialog from "@/components/ProofDialog";
import { releaseGift, updateGiftStatus } from "@/app/charity/actions";
import { gridTheme } from "@/components/grid/agSetup";
import type { CharityGiftRow } from "@/lib/charity-data";
import { STATUS_LABEL, STATUS_STYLE, nextStatus } from "@/lib/gift-status";

type StatusFilter = "ALL" | "PAID" | "BOUGHT" | "DELIVERED";
type TotalRow = { id: string; productTitle: string; priceCents: number; isTotal: true };
type GridRow = CharityGiftRow | TotalRow;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function isTotal(row: GridRow | undefined): row is TotalRow {
  return !!row && "isTotal" in row;
}

function ItemCell(p: CustomCellRendererProps<GridRow>) {
  const row = p.data;
  if (!row) return null;
  if (isTotal(row)) return <strong>{row.productTitle}</strong>;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%", minWidth: 0 }}>
      <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "8px", bgcolor: "#fff", border: "1px solid #ece6dc", overflow: "hidden", display: "grid", placeItems: "center" }}>
        {row.imageUrl ? (
          <img src={row.imageUrl} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span aria-hidden="true">🎁</span>
        )}
      </Box>
      <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
        <Box sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.productTitle}>
          {row.productTitle}
        </Box>
        {row.productUrl ? (
          <a href={row.productUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "#57534e", fontSize: 12 }}>
            {row.merchant} ↗
          </a>
        ) : (
          <span style={{ color: "#57534e", fontSize: 12 }}>{row.merchant}</span>
        )}
      </Box>
    </Box>
  );
}

/** "31h left" until an unused hold is released. */
function holdLeft(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "releasing";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.ceil(ms / 60_000))}m left`;
}

function StatusCell(p: CustomCellRendererProps<GridRow>) {
  if (!p.data || isTotal(p.data)) return null;
  const s = STATUS_STYLE[p.value as string] ?? STATUS_STYLE.PENDING;
  const editable = !!nextStatus(p.value as string);
  const held = p.data.held && p.value === "PAID";
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.5 }}>
      <Box
        component="span"
        title={held ? "The donor's payment is on hold. It is charged when you click Buy, or released automatically." : undefined}
        sx={{ px: 1.25, py: 0.4, borderRadius: 999, bgcolor: s.bg, color: s.fg, fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}
      >
        {held && <LockClockRoundedIcon sx={{ fontSize: 15 }} />}
        {held ? `Held · ${holdLeft(p.data.holdExpiresAt)}` : (STATUS_LABEL[p.value as string] ?? p.value)}
      </Box>
      {editable && (
        <Box component="span" sx={{ color: "#a8a29e", fontSize: 11 }} aria-hidden="true">
          ▾
        </Box>
      )}
    </Box>
  );
}

function AvailabilityCell(p: CustomCellRendererProps<GridRow>) {
  if (!p.data || isTotal(p.data)) return null;
  const label = p.data.availability;
  const good = label === "Available" || label === "Available for less";
  const warning = ["Sold out", "Price went up", "Check unavailable", "Stock unconfirmed"].includes(label);
  return <Box component="span" sx={{ px: 1, py: 0.4, borderRadius: 999, fontWeight: 700, fontSize: 12,
    bgcolor: good ? "#dcfce7" : warning ? "#fef3c7" : "#f5f5f4",
    color: good ? "#166534" : warning ? "#92400e" : "#57534e" }}>{label}</Box>;
}

function ProofCell(p: CustomCellRendererProps<GridRow>) {
  if (!p.data || isTotal(p.data)) return null;
  const v = p.value as string | null;
  if (!v) return <span style={{ color: "#a8a29e" }}>—</span>;
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    MATCH: { label: "Match", bg: "#dcfce7", fg: "#166534" },
    APPROVED: { label: "Approved", bg: "#dcfce7", fg: "#166534" },
    MISMATCH: { label: "Mismatch", bg: "#ffe4e6", fg: "#9f1239" },
    REJECTED: { label: "Rejected", bg: "#ffe4e6", fg: "#9f1239" },
    UNCLEAR: { label: "Unclear", bg: "#fef3c7", fg: "#92400e" },
    UPLOADED: { label: "Uploaded", bg: "#f5f5f4", fg: "#57534e" },
  };
  const s = map[v] ?? map.UPLOADED;
  return (
    <Box component="span" sx={{ px: 1, py: 0.3, borderRadius: 999, bgcolor: s.bg, color: s.fg, fontWeight: 700, fontSize: 12 }}>
      {s.label}
    </Box>
  );
}

type GridContext = {
  openProof: (row: CharityGiftRow) => void;
  markBought: (row: CharityGiftRow) => void;
  release: (row: CharityGiftRow) => void;
};

/** Release a held gift: two clicks, so it can't happen by accident. */
function ReleaseButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      size="small"
      variant="text"
      color={armed ? "error" : "inherit"}
      sx={{ textTransform: "none", fontWeight: 700, fontSize: 12, minWidth: 0, px: 0.75, color: armed ? undefined : "text.secondary" }}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      title="Can't buy this gift? Release the hold so the donor is never charged."
    >
      {armed ? "Confirm release" : "Release"}
    </Button>
  );
}

function ActionCell(p: CustomCellRendererProps<GridRow, unknown, GridContext>) {
  const row = p.data;
  if (!row || isTotal(row)) return null;
  const ctx = p.context;
  const sx = { textTransform: "none", fontWeight: 700, borderRadius: 999, py: 0.25, px: 1.25, minWidth: 0, fontSize: 12.5 } as const;
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      {row.status === "PAID" && row.held && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {row.buyBlockedReason ? (
            <Box component="span" sx={{ bgcolor: "#fef3c7", color: "#92400e", borderRadius: 999, px: 1, fontSize: 12, fontWeight: 700 }}>
              {row.buyBlockedReason === "PRICE_UP" ? "Price went up" : "Sold out"}
            </Box>
          ) : (
          <Button
            size="small"
            variant="contained"
            sx={sx}
            startIcon={<ShoppingBagRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => ctx.markBought(row)}
            title="Charges the donor's held payment so you have the money to buy this gift."
          >
            Buy · charge donor
          </Button>
          )}
          <ReleaseButton onConfirm={() => ctx.release(row)} />
        </Box>
      )}
      {row.status === "PAID" && !row.held && (
        <Button size="small" variant="outlined" sx={sx} startIcon={<ShoppingBagRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => ctx.markBought(row)}>
          Mark Bought
        </Button>
      )}
      {row.status === "BOUGHT" && (
        <Button
          size="small"
          variant={row.canDeliver ? "contained" : "outlined"}
          color={row.canDeliver ? "primary" : row.proof === "MISMATCH" || row.proof === "REJECTED" ? "error" : "primary"}
          sx={sx}
          startIcon={row.canDeliver ? <LocalShippingRoundedIcon sx={{ fontSize: 16 }} /> : <ReceiptLongRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={() => ctx.openProof(row)}
        >
          {row.canDeliver ? "Deliver" : row.proofId ? "Review receipt" : "Add receipt"}
        </Button>
      )}
      {row.status === "DELIVERED" && (
        <Button size="small" variant="text" color="inherit" sx={{ ...sx, color: "#166534" }} onClick={() => ctx.openProof(row)}>
          ✓ Delivered
        </Button>
      )}
    </Box>
  );
}

export default function CharityGiftGrid({ initialRows, charityName, charitySlug, isAdmin = false }: { initialRows: CharityGiftRow[]; charityName: string; charitySlug: string; isAdmin?: boolean }) {
  const apiRef = useRef<GridApi<GridRow> | null>(null);
  const filterRef = useRef<StatusFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ severity: "success" | "error" | "info" | "warning"; text: string } | null>(null);
  const [counts, setCounts] = useState(() => countByStatus(initialRows));
  const [dialogRow, setDialogRow] = useState<CharityGiftRow | null>(null);

  function countByStatus(rows: CharityGiftRow[]) {
    const c = { ALL: rows.length, PAID: 0, BOUGHT: 0, DELIVERED: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }

  const refreshTotals = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    let n = 0;
    let sum = 0;
    const all: CharityGiftRow[] = [];
    api.forEachNode((node) => {
      if (node.data && !isTotal(node.data)) all.push(node.data);
    });
    api.forEachNodeAfterFilter((node) => {
      if (node.data && !isTotal(node.data)) {
        n++;
        sum += node.data.priceCents;
      }
    });
    api.setGridOption("pinnedBottomRowData", [{ id: "total", productTitle: `Total · ${n} gift${n === 1 ? "" : "s"}`, priceCents: sum, isTotal: true }]);
    const next = countByStatus(all);
    setCounts((prev) =>
      prev.ALL === next.ALL && prev.PAID === next.PAID && prev.BOUGHT === next.BOUGHT && prev.DELIVERED === next.DELIVERED ? prev : next
    );
  }, []);

  const applyUpdates = useCallback(
    (rows: CharityGiftRow[]) => {
      apiRef.current?.applyTransaction({ update: rows });
      refreshTotals();
    },
    [refreshTotals]
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: "productTitle", headerName: "Item", cellRenderer: ItemCell, flex: 2.2, minWidth: 260, filter: "agTextColumnFilter" },
      { field: "ageRange" as never, headerName: "Ages", width: 95, valueFormatter: (p) => (p.value ? String(p.value) : "—") },
      {
        field: "priceCents",
        headerName: "Price",
        width: 115,
        type: "rightAligned",
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""),
        cellStyle: (p) => (isTotal(p.data) ? { fontWeight: 800 } : null),
      },
      {
        field: "status" as never,
        headerName: "Status",
        width: 165,
        cellRenderer: StatusCell,
        // Held gifts are bought with the "Buy" button so the charge is explicit, not via the dropdown.
        editable: (p) => !isTotal(p.data) && !(p.data as CharityGiftRow).held && !!nextStatus((p.data as CharityGiftRow)?.status),
        cellEditor: "agSelectCellEditor",
        cellEditorParams: (p: { data: CharityGiftRow }) => {
          const next = nextStatus(p.data.status);
          return { values: next ? [p.data.status, next] : [p.data.status] };
        },
        tooltipValueGetter: (p) => {
          const n = nextStatus((p.data as CharityGiftRow)?.status ?? "");
          return n ? `Double-click to mark ${STATUS_LABEL[n]}` : undefined;
        },
      },
      { field: "availability" as never, headerName: "Availability", width: 175, cellRenderer: AvailabilityCell,
        tooltipValueGetter: (p) => p.data && !isTotal(p.data) ? p.data.availabilityDetails : undefined },
      { colId: "next", headerName: "Next step", width: 250, cellRenderer: ActionCell, sortable: false, filter: false },
      { field: "donor" as never, headerName: "Donor", flex: 1, minWidth: 130 },
      { field: "proof" as never, headerName: "Receipt", width: 120, cellRenderer: ProofCell, onCellClicked: (e) => { if (e.data && !isTotal(e.data)) setDialogRow(e.data); } },
      {
        field: "updatedAt" as never,
        headerName: "Last updated",
        width: 150,
        sort: "desc",
        filter: "agDateColumnFilter",
        valueGetter: (p) => (p.data && !isTotal(p.data) ? new Date(p.data.updatedAt) : null),
        valueFormatter: (p) =>
          p.value instanceof Date ? p.value.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef<GridRow>>(() => ({ sortable: true, resizable: true, filter: true, suppressHeaderMenuButton: true }), []);

  const rowSelection = useMemo<RowSelectionOptions<GridRow>>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
      isRowSelectable: (node: IRowNode<GridRow>) => !!node.data && !isTotal(node.data) && node.data.status === "PAID",
    }),
    []
  );

  const getRowId = useCallback((p: GetRowIdParams<GridRow>) => p.data.id, []);

  // Stable callbacks: AG Grid re-runs filters when these change, so they must not be recreated each render.
  const isExternalFilterPresent = useCallback(() => filterRef.current !== "ALL", []);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<GridRow>) => !!node.data && !isTotal(node.data) && node.data.status === filterRef.current,
    []
  );
  const onGridReady = useCallback(
    (e: GridReadyEvent<GridRow>) => {
      apiRef.current = e.api;
      refreshTotals();
    },
    [refreshTotals]
  );
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<GridRow>) => setSelectedCount(e.api.getSelectedRows().length), []);
  const getRowStyle = useCallback(
    (p: { node: IRowNode<GridRow> }) => (p.node.rowPinned ? { background: "#faf7f2", fontWeight: 700 } : undefined),
    []
  );

  async function onCellValueChanged(e: CellValueChangedEvent<GridRow>) {
    if (e.colDef.field !== "status" || !e.data || isTotal(e.data) || e.newValue === e.oldValue) return;
    const row = e.data;
    setBusy(true);
    const res = await updateGiftStatus([row.id], String(e.newValue));
    setBusy(false);
    if (!res.ok) {
      e.node.setDataValue("status", e.oldValue); // revert
      if (res.rows) applyUpdates(res.rows);
      setToast({ severity: "error", text: res.error });
      return;
    }
    applyUpdates(res.rows);
    setToast({ severity: "success", text: `“${row.productTitle.slice(0, 40)}” marked ${STATUS_LABEL[String(e.newValue)]}.` });
  }

  async function markSelectedBought() {
    const api = apiRef.current;
    if (!api) return;
    const selected = api.getSelectedRows().filter((r): r is CharityGiftRow => !isTotal(r));
    const ids = api
      .getSelectedRows()
      .filter((r): r is CharityGiftRow => !isTotal(r))
      .map((r) => r.id);
    if (!ids.length) return;
    setBusy(true);
    const res = await updateGiftStatus(ids, "BOUGHT");
    setBusy(false);
    if (!res.ok) {
      if (res.rows) applyUpdates(res.rows);
      setToast({ severity: "error", text: res.error });
      return;
    }
    api.deselectAll();
    applyUpdates(res.rows);
    const bought = res.rows.filter((r) => r.status === "BOUGHT" && selected.some((old) => old.id === r.id && old.status === "PAID"));
    const details = bought.flatMap((r) => {
      const before = selected.find((old) => old.id === r.id);
      if (!before?.held) return [];
      const savings = r.priceCents < before.priceCents ? `Donor charged ${money(r.priceCents)} (was ${money(before.priceCents)} held, the rest was released).` : "";
      const store = r.merchant !== before.merchant ? `Buy from ${r.merchant}.` : "";
      return savings || store ? [`${savings} ${store} Buy it now, then upload the receipt.`] : [];
    });
    setToast({ severity: res.warning ? "warning" : "success", text:
      `${bought.length} gifts bought${res.skipped ? `, ${res.skipped} skipped` : ""}. ${details.join(" ")} ${res.warning ?? ""}`.trim(),
    });
  }

  async function markOneBought(row: CharityGiftRow) {
    setBusy(true);
    const res = await updateGiftStatus([row.id], "BOUGHT");
    setBusy(false);
    if (!res.ok) {
      if (res.rows) applyUpdates(res.rows);
      return setToast({ severity: "error", text: res.error });
    }
    applyUpdates(res.rows);
    const updated = res.rows.find((r) => r.id === row.id) ?? row;
    setToast({
      severity: res.warning ? "warning" : "success",
      text: res.warning ?? (row.held
        ? `Donor charged ${money(updated.priceCents)}${updated.priceCents < row.priceCents ? ` (was ${money(row.priceCents)} held, the rest was released)` : ""}.${updated.merchant !== row.merchant ? ` Buy from ${updated.merchant}.` : ""} Buy it now, then upload the receipt.`
        : `Gift marked Bought. Next: upload its receipt.`),
    });
  }

  async function releaseOne(row: CharityGiftRow) {
    setBusy(true);
    const res = await releaseGift(row.id);
    setBusy(false);
    if (!res.ok) return setToast({ severity: "error", text: res.error });
    apiRef.current?.applyTransaction({ remove: [row] });
    refreshTotals();
    setToast({ severity: "info", text: `Hold released for “${row.productTitle.slice(0, 40)}”. The donor won't be charged.` });
  }

  const gridContext = useMemo<GridContext>(
    () => ({
      openProof: (row) => setDialogRow(row),
      markBought: (row) => void markOneBought(row),
      release: (row) => void releaseOne(row),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function chooseStatus(s: StatusFilter) {
    filterRef.current = s;
    setStatusFilter(s);
    apiRef.current?.onFilterChanged();
  }

  function exportCsv() {
    apiRef.current?.exportDataAsCsv({
      fileName: `giftly-${charitySlug}-gifts.csv`,
      skipPinnedBottom: false,
      columnKeys: ["productTitle", "ageRange", "priceCents", "status", "availability", "donor", "proof", "updatedAt"],
      processCellCallback: (p) => {
        const field = p.column.getColDef().field;
        if (field === "priceCents" && typeof p.value === "number") return (p.value / 100).toFixed(2);
        if (field === "status") return STATUS_LABEL[p.value as string] ?? p.value ?? "";
        if (p.value instanceof Date) return p.value.toISOString();
        return p.value ?? "";
      },
    });
  }

  const chips: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: `All (${counts.ALL})` },
    { key: "PAID", label: `Paid (${counts.PAID})` },
    { key: "BOUGHT", label: `Bought (${counts.BOUGHT})` },
    { key: "DELIVERED", label: `Delivered (${counts.DELIVERED})` },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {chips.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              onClick={() => chooseStatus(c.key)}
              color={statusFilter === c.key ? "primary" : "default"}
              variant={statusFilter === c.key ? "filled" : "outlined"}
            />
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search gifts…"
          value={quickFilter}
          onChange={(e) => {
            setQuickFilter(e.target.value);
            apiRef.current?.setGridOption("quickFilterText", e.target.value);
          }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
          sx={{ width: { xs: "100%", sm: 220 } }}
        />
        <Button variant="contained" startIcon={<ShoppingBagRoundedIcon />} disabled={!selectedCount || busy} onClick={markSelectedBought}>
          Buy {selectedCount || ""} selected
        </Button>
        <Button variant="outlined" onClick={() => window.location.reload()} disabled={busy}>
          Refresh availability
        </Button>
        <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCsv}>
          Export CSV
        </Button>
      </Box>

      {initialRows.length === 0 ? (
        <Alert severity="info">No gifts for {charityName} yet. Paid gifts will appear here.</Alert>
      ) : (
        <Box sx={{ height: 600, opacity: busy ? 0.75 : 1, transition: "opacity .2s" }}>
          <AgGridReact<GridRow>
            theme={gridTheme}
            rowData={initialRows}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection={rowSelection}
            getRowId={getRowId}
            rowHeight={60}
            pagination
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 25, 50]}
            singleClickEdit={false}
            stopEditingWhenCellsLoseFocus
            tooltipShowDelay={300}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            onGridReady={onGridReady}
            onFilterChanged={refreshTotals}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            context={gridContext}
            getRowStyle={getRowStyle}
          />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Availability is checked when this page loads; hover over its badge for price, store, and check time. Buy checks again before charging. Use “Next step” to move each gift forward: Paid (held) → Buy → (receipt checked) → Delivered. A new gift&apos;s payment is
        only held by PayPal: clicking Buy charges the donor so you have the money to buy it. Holds you don&apos;t use are released
        automatically after 72 hours, and the donor is never charged. Delivered needs a matching or admin-approved receipt. The CSV contains only {charityName}&apos;s records.
      </Typography>

      <ProofDialog
        row={dialogRow}
        isAdmin={isAdmin}
        onClose={() => setDialogRow(null)}
        onUpdated={(row, message) => {
          applyUpdates([row]);
          setToast({ severity: "success", text: message });
        }}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
