export function money(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

export function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  RECEIVED: "Received",
  PAID: "Paid",
  BOUGHT: "Bought",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  OPEN: "Open",
  FUNDED: "Funded",
  FULFILLED: "Fulfilled",
  CASH: "Cash",
  GIFT: "Gift",
  HYBRID: "Gift + cash",
};

export function label(value: string): string {
  return STATUS_LABELS[value] ?? value;
}
