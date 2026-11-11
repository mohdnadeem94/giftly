"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ProductCard from "./ProductCard";
import { createGiftDraft } from "@/app/give/actions";
import type { GiftProduct } from "@/lib/channel3";

const SUGGESTIONS = [
  "storybook for a 5 year old",
  "winter coat for a child",
  "science kit for a 10 year old",
  "building blocks for a toddler",
];

const BUDGETS = [10, 20, 30, 50, 100];

export default function GiftSearch({ charitySlug }: { charitySlug: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<GiftProduct[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function search(q: string) {
    const text = q.trim();
    if (text.length < 2) {
      setError("Tell us a bit about the gift, e.g. “storybook for a 5 year old”.");
      return;
    }
    setQuery(text);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(text)}&max=${budget}&limit=6`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.products ?? []);
    } catch (e) {
      setResults(null);
      setError(e instanceof Error ? e.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function gift(p: GiftProduct) {
    setBusyId(p.id);
    setError("");
    const res = await createGiftDraft({ charitySlug, productId: p.id });
    if (!res.ok) {
      setBusyId(null);
      setError(res.error);
      return;
    }
    router.push(`/give/${charitySlug}?mode=gift&item=${encodeURIComponent(res.orderItemId)}`);
  }

  return (
    <Box>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 130px" }, gap: 1.25 }}
      >
        <TextField
          fullWidth
          placeholder="e.g. storybook for a 5 year old"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            },
            htmlInput: { maxLength: 120, "aria-label": "Describe the gift" },
          }}
        />
        <TextField select label="Budget" value={budget} onChange={(e) => setBudget(Number(e.target.value))}>
          {BUDGETS.map((b) => (
            <MenuItem key={b} value={b}>
              Up to ${b}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ gridColumn: { sm: "1 / -1" } }}>
          {loading ? "Searching real stores…" : "Find real gifts"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.5 }}>
        {SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} size="small" onClick={() => search(s)} disabled={loading} variant="outlined" />
        ))}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5, mt: 2.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={300} sx={{ borderRadius: "20px" }} />
          ))}
        </Box>
      )}

      {!loading && results && results.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No child-appropriate gifts found in that budget. Try different words or a higher budget, or pick from the
          charity&apos;s wishlist.
        </Alert>
      )}

      {!loading && results && results.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5, mb: 1 }}>
            Live prices from real stores via Channel3. Unsafe items are filtered out.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
            {results.map((p) => (
              <ProductCard key={p.id} product={p} onGift={gift} busy={busyId === p.id} disabled={!!busyId} />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
