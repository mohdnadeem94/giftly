import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { money, percent } from "@/lib/format";

export default function ProgressBar({
  raisedCents,
  goalCents,
  compact = false,
}: {
  raisedCents: number;
  goalCents: number;
  compact?: boolean;
}) {
  const pct = percent(raisedCents, goalCents);
  return (
    <Box>
      <LinearProgress variant="determinate" value={pct} aria-label={`${pct}% of goal raised`} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
        <Typography variant={compact ? "caption" : "body2"} sx={{ fontWeight: 700 }}>
          {money(raisedCents)} raised
        </Typography>
        <Typography variant={compact ? "caption" : "body2"} color="text.secondary">
          {pct}% of {money(goalCents)}
        </Typography>
      </Box>
    </Box>
  );
}
