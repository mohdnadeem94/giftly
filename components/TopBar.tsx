import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import AppHeader from "./AppHeader";

export default async function TopBar() {
  const session = await getDemoSession();
  let charities: { slug: string; name: string }[] = [];
  try {
    charities = await db.charity.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });
  } catch {
    // Database unavailable: keep the header usable.
  }
  return <AppHeader role={session.role} charitySlug={session.charitySlug} charities={charities} donorName={session.donorName} />;
}
