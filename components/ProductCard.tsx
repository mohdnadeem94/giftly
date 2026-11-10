"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import type { GiftProduct } from "@/lib/channel3";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type Props = {
  product: GiftProduct;
  onGift?: (p: GiftProduct) => void;
  busy?: boolean;
  disabled?: boolean;
};

export default function ProductCard({ product, onGift, busy, disabled }: Props) {
  return (
    <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ position: "relative", bgcolor: "#fff", aspectRatio: "1 / 1", borderBottom: "1px solid", borderColor: "divider" }}>
        {product.imageUrl ? (
          <Box
            component="img"
            src={product.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", p: 1.5 }}
          />
        ) : (
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#d6d3d1" }}>
            <CardGiftcardRoundedIcon sx={{ fontSize: 48 }} />
          </Box>
        )}
        <Chip
          size="small"
          label={product.inStock ? "In stock" : "Check stock"}
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            bgcolor: product.inStock ? "#dcfce7" : "#fef3c7",
            color: product.inStock ? "#166534" : "#92400e",
          }}
        />
      </Box>
      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 0.75, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.92rem",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "2.6em",
          }}
          title={product.title}
        >
          {product.title}
        </Typography>
        <Link
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          underline="hover"
          color="text.secondary"
          variant="caption"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}
        >
          {product.merchant} <OpenInNewRoundedIcon sx={{ fontSize: 12 }} />
        </Link>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mt: "auto" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>{fmt(product.priceCents)}</Typography>
          {product.compareAtCents && (
            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
              {fmt(product.compareAtCents)}
            </Typography>
          )}
        </Box>
        {onGift && (
          <Button
            variant="contained"
            size="small"
            fullWidth
            disabled={disabled || busy}
            onClick={() => onGift(product)}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CardGiftcardRoundedIcon />}
          >
            {busy ? "Saving…" : "Gift this"}
          </Button>
        )}
      </Box>
    </Card>
  );
}
