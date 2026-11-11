import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import { getCurrentDonor } from "@/lib/donor-data";
import AppHeader from "./AppHeader";

export default async function TopBar() {
  const session = await getDemoSession();
  let charities: { slug: string; name: string }[] = [];
  try {
    charities = await db.charity.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });
  } catch {
    // Database unavailable: keep the header usable.
  }
  // One name everywhere: the name entered at sign-in. The donor record's name is only a fallback.
  const donor = session.role === "donor" && !session.donorName ? await getCurrentDonor().catch(() => null) : null;
  const donorName = session.donorName ?? donor?.displayName ?? null;
  return <AppHeader role={session.role} charitySlug={session.charitySlug} charities={charities} donorName={donorName} />;
}
