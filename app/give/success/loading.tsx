import ElfLoader, { PAYMENT_MESSAGES } from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader title="Thank you for giving!" messages={PAYMENT_MESSAGES} />;
}
