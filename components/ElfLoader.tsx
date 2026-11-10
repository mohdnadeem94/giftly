"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";

const bounce = keyframes`
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-14px) rotate(4deg); }
`;

const shadow = keyframes`
  0%, 100% { transform: scaleX(1); opacity: 0.25; }
  50% { transform: scaleX(0.7); opacity: 0.12; }
`;

const fade = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
`;

export const PAGE_MESSAGES = [
  "The Elf is helping you give…",
  "Checking the wishlist twice…",
  "Gathering the latest gift updates…",
  "Wrapping up your page…",
];

export const PAYMENT_MESSAGES = [
  "Confirming your payment with PayPal…",
  "Making sure every cent is accounted for…",
  "Tying your payment to your gift…",
  "Almost there, thank you for giving…",
];

type Props = {
  messages?: string[];
  title?: string;
  note?: string;
  compact?: boolean;
};

export default function ElfLoader({ messages = PAGE_MESSAGES, title, note, compact = false }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        py: compact ? 4 : { xs: 10, md: 14 },
        px: 2,
        minHeight: compact ? undefined : "60vh",
      }}
    >
      <Box sx={{ position: "relative", width: 120, height: 120, mb: 2 }} aria-hidden="true">
        {/* sparkles */}
        {[
          { top: 6, left: 4, d: "0s" },
          { top: 0, right: 10, d: "0.6s" },
          { bottom: 34, right: -2, d: "1.2s" },
        ].map((s, idx) => (
          <Box
            key={idx}
            sx={{
              position: "absolute",
              ...s,
              fontSize: 18,
              color: "#d97706",
              animation: `${twinkle} 1.8s ease-in-out ${s.d} infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          >
            ✦
          </Box>
        ))}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 12,
            ml: "-38px",
            width: 76,
            height: 76,
            borderRadius: "22px",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
            background: "linear-gradient(135deg, #166534 0%, #be123c 100%)",
            boxShadow: "0 14px 30px rgba(190,18,60,0.30)",
            animation: `${bounce} 1.4s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          🎁
        </Box>
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            bottom: 8,
            ml: "-30px",
            width: 60,
            height: 10,
            borderRadius: "50%",
            bgcolor: "#1c1917",
            animation: `${shadow} 1.4s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.15 },
          }}
        />
      </Box>

      {title && (
        <Typography variant="h5" sx={{ mb: 0.75 }}>
          {title}
        </Typography>
      )}
      <Typography
        key={i}
        sx={{
          fontWeight: 700,
          fontSize: title ? "1rem" : "1.15rem",
          color: title ? "text.secondary" : "text.primary",
          minHeight: 28,
          animation: `${fade} 0.35s ease-out`,
        }}
      >
        {messages[i]}
      </Typography>
      <Box sx={{ width: 180, mt: 2 }}>
        <LinearProgress />
      </Box>
      {note && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}
