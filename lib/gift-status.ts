// Gift status rules, shared by the server (enforcement) and the dashboard (UI hints).
// The only allowed moves are one step forward: PAID -> BOUGHT -> DELIVERED.

export const GIFT_FLOW = ["PAID", "BOUGHT", "DELIVERED"] as const;
export type GiftFlowStatus = (typeof GIFT_FLOW)[number];

export function nextStatus(current: string): GiftFlowStatus | null {
  const i = GIFT_FLOW.indexOf(current as GiftFlowStatus);
  return i >= 0 && i < GIFT_FLOW.length - 1 ? GIFT_FLOW[i + 1] : null;
}

export function isAllowedTransition(from: string, to: string): boolean {
  return nextStatus(from) === to;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  BOUGHT: "Bought",
  DELIVERED: "Delivered",
};

export const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "#fef3c7", fg: "#92400e" },
  BOUGHT: { bg: "#dbeafe", fg: "#1e40af" },
  DELIVERED: { bg: "#dcfce7", fg: "#166534" },
  PENDING: { bg: "#f5f5f4", fg: "#57534e" },
};
