import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giftly: Santa's little agent for real giving",
  description: "Follow your gift from click to child. Your money moves only when the gift arrives.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
