import Link from "next/link";
import { db } from "@/lib/db";
import { getDemoSession } from "@/lib/session";
import RoleSwitcher from "./RoleSwitcher";

export default async function TopBar() {
  const session = await getDemoSession();
  let charities: { slug: string; name: string }[] = [];
  try {
    charities = await db.charity.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });
  } catch {
    // Database unavailable: keep the bar usable.
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span aria-hidden="true">🎁</span> Giftly
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/causes">Causes</Link>
        </nav>
        <RoleSwitcher role={session.role} charitySlug={session.charitySlug} charities={charities} />
      </div>
    </header>
  );
}
