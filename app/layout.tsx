import type { Metadata } from "next";
import TopBar from "@/components/TopBar";
import "./globals.css";

// Every page reads live data and the demo-role cookie, so render on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giftly: Santa's little agent for real giving",
  description: "Follow your gift from click to child. Your money moves only when the gift arrives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="container">{children}</main>
        <footer className="footer">
          Giftly is a hackathon prototype. PayPal sandbox only: no real money moves. Charity payouts and merchant
          purchases are simulated, charity verification is illustrative, and roles are a demo switcher.
        </footer>
      </body>
    </html>
  );
}
