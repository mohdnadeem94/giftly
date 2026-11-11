"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_COOKIE, canGive, isRole, signInHref } from "@/lib/roles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import LinkButton from "@/components/ui/LinkButton";
import ProductCard from "@/components/ProductCard";
import { createGiftDraft } from "@/app/give/actions";
import type { CashSuggestion, GiftCards } from "@/lib/elf/tools";

type Msg = {
  role: "user" | "assistant";
  content: string;
  cards?: GiftCards | null;
  cash?: CashSuggestion | null;
};

const dot = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

const THINKING = ["Reading your wish…", "Checking real stores…", "Picking the best fits…", "Checking it twice…"];

const DEFAULT_SUGGESTIONS = [
  "A Christmas gift for a 5-year-old girl, around $20",
  "Something warm for a 9-year-old, under $40",
  "I only have $5. How can I help?",
];

type Props = {
  charitySlug?: string;
  greeting?: string;
  suggestions?: string[];
  height?: number | string;
  placeholder?: string;
};

/** The demo role cookie is readable in the browser (it is not a security boundary; the server re-checks). */
function browserCanChat(): boolean {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${ROLE_COOKIE}=`))?.split("=")[1];
  const role = raw ? decodeURIComponent(raw) : "public";
  return isRole(role) && canGive(role);
}

function newSessionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function ElfChat({
  charitySlug,
  greeting = "Hi! I'm the Elf. Tell me who you'd like to help, and I'll find a real gift, or the cause where cash does the most good.",
  suggestions = DEFAULT_SUGGESTIONS,
  height = 520,
  placeholder = "Tell the Elf what you'd like to give…",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionId] = useState(newSessionId);
  const [signedIn, setSignedIn] = useState(true); // corrected after mount; avoids a hydration mismatch
  const askedRef = useRef(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    setThinkIdx(0);
    const t = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1600);
    return () => clearInterval(t);
  }, [loading]);

  // Public visitors: send them to the simulated sign-in, then come back and ask the same question.
  function goSignIn(question: string) {
    router.push(signInHref(pathname || "/", question));
  }

  // Coming back from sign-in with ?ask=...: ask the Elf that question once, then tidy the URL.
  useEffect(() => {
    const ok = browserCanChat();
    setSignedIn(ok);
    if (askedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const ask = params.get("ask");
    if (!ask) return;
    askedRef.current = true;
    params.delete("ask");
    const rest = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
    if (ok) void send(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const content = text.trim().slice(0, 600);
    if (!content || loading) return;
    if (!browserCanChat()) return goSignIn(content);
    setError("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/elf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          charitySlug,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data.code === "SIGN_IN") return goSignIn(content);
      if (!res.ok) throw new Error(data.error || "The Elf couldn't answer.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, cards: data.cards, cash: data.cash }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The Elf couldn't answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function giftThis(slug: string, productId: string) {
    setBusyProduct(productId);
    setError("");
    const res = await createGiftDraft({ charitySlug: slug, productId });
    if (!res.ok) {
      setBusyProduct(null);
      setError(res.error);
      return;
    }
    router.push(`/give/${slug}?mode=gift&item=${encodeURIComponent(res.orderItemId)}`);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height,
        maxHeight: { xs: "min(600px, 80svh)", sm: "none" },
        minHeight: 340,
        minWidth: 0,
        containerType: "inline-size",
        bgcolor: "background.paper",
        color: "text.primary",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0, bgcolor: "#dcfce7" }} aria-hidden="true">
          🧝
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>The Elf</Typography>
          <Typography variant="caption" color="text.secondary">
            AI giving helper · suggests, never pays for you
          </Typography>
        </Box>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 0 3px #dcfce7" }} aria-label="online" />
      </Box>

      {/* Messages */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, display: "flex", flexDirection: "column", gap: 1.5 }} aria-live="polite">
        <Bubble role="assistant">{greeting}</Bubble>

        {messages.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, alignItems: "flex-start" }}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} onClick={() => send(s)} variant="outlined" sx={{ height: "auto", py: 0.75, "& .MuiChip-label": { whiteSpace: "normal" } }} />
            ))}
          </Box>
        )}

        {messages.map((m, i) => (
          <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Bubble role={m.role}>{m.content}</Bubble>
            {m.cards && m.cards.picks.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
                  For {m.cards.charityName} · live prices from real stores
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", "@container (min-width: 420px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                  {m.cards.picks.map((p) => (
                    <Box key={p.id} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <ProductCard
                        product={p}
                        busy={busyProduct === p.id}
                        disabled={!!busyProduct}
                        onGift={() => giftThis(m.cards!.charitySlug, p.id)}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, lineHeight: 1.35 }}>
                        💡 {p.reason}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {m.cash && (
              <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {m.cash.reason}
                </Typography>
                <LinkButton
                  href={`/give/${m.cash.charitySlug}?mode=cash`}
                  variant="contained"
                  size="small"
                  startIcon={<VolunteerActivismRoundedIcon />}
                >
                  Give cash to {m.cash.charityName}
                </LinkButton>
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, alignSelf: "flex-start", bgcolor: "#f5f0e8", px: 2, py: 1.25, borderRadius: "18px 18px 18px 4px" }} role="status">
            <Box sx={{ display: "flex", gap: 0.5 }} aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <Box key={d} sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main", animation: `${dot} 1.2s ease-in-out ${d * 0.15}s infinite` }} />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {THINKING[thinkIdx]}
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Box>

      {/* Input */}
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, border: "1px solid", borderColor: "divider", borderRadius: 999, pl: 2, pr: 0.5, py: 0.5, "&:focus-within": { borderColor: "primary.main" } }}>
          <InputBase
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            slotProps={{ input: { maxLength: 600, "aria-label": "Message the Elf" } }}
          />
          <IconButton type="submit" color="primary" disabled={loading || !input.trim()} aria-label="Send" sx={{ bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "#e7e5e4", color: "#a8a29e" } }}>
            <SendRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        {!signedIn && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.75 }}>
            You&apos;ll sign in (simulated) first, then the Elf answers.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <Box
      sx={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "88%",
        px: 2,
        py: 1.25,
        fontSize: "0.92rem",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        bgcolor: mine ? "primary.main" : "#f5f0e8",
        color: mine ? "#fff" : "text.primary",
        borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      }}
    >
      {children}
    </Box>
  );
}
