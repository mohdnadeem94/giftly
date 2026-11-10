import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ProgressBar from "./ProgressBar";
import AppLink from "./ui/AppLink";
import LinkButton from "./ui/LinkButton";
import type { PublicCause } from "@/lib/public-data";

export default function CauseCard({ cause }: { cause: PublicCause }) {
  return (
    <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ position: "relative" }}>
        <CardMedia component="img" image={cause.photoUrl} alt="" sx={{ height: 180, objectFit: "cover" }} />
        <Chip
          label={cause.category}
          size="small"
          sx={{ position: "absolute", top: 12, left: 12, bgcolor: "rgba(255,255,255,0.92)", fontWeight: 700 }}
        />
      </Box>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5, p: 2.5 }}>
        <Box>
          <AppLink
            href={`/causes/${cause.slug}`}
            underline="hover"
            color="text.primary"
            sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.3 }}
          >
            {cause.name}
          </AppLink>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
              <PlaceOutlinedIcon sx={{ fontSize: 16 }} /> {cause.region}
            </Typography>
            {cause.verifiedDemo && (
              <Typography
                variant="caption"
                sx={{ display: "flex", alignItems: "center", gap: 0.3, color: "primary.main", fontWeight: 700 }}
              >
                <VerifiedRoundedIcon sx={{ fontSize: 15 }} /> Verified (demo)
              </Typography>
            )}
          </Box>
        </Box>
        <ProgressBar raisedCents={cause.raisedCents} goalCents={cause.goalCents} compact />
        <Typography variant="body2" color="text.secondary">
          {cause.openNeeds} open gift {cause.openNeeds === 1 ? "request" : "requests"}
        </Typography>
        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
          <LinkButton href={`/give/${cause.slug}?mode=gift`} variant="contained" fullWidth>
            Give a gift
          </LinkButton>
          <LinkButton href={`/causes/${cause.slug}`} variant="outlined" color="inherit" sx={{ borderColor: "divider" }}>
            Details
          </LinkButton>
        </Box>
      </CardContent>
    </Card>
  );
}
