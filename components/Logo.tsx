import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "11px",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          background: "linear-gradient(135deg, #166534 0%, #be123c 100%)",
          boxShadow: "0 4px 12px rgba(190,18,60,0.25)",
        }}
      >
        <CardGiftcardRoundedIcon fontSize="small" />
      </Box>
      <Typography
        component="span"
        sx={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", color: light ? "#fff" : "text.primary" }}
      >
        Giftly
      </Typography>
    </Box>
  );
}
