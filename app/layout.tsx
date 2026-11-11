import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import theme from "@/theme";
import "./globals.css";

// Every page reads live data and the demo-role cookie, so render on each request.
export const dynamic = "force-dynamic";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Giftly: Santa's little agent for real giving",
  description: "Give a real gift to anyone in need and follow it all the way. Explore AI gift recommendations, sandbox payments, and receipt-backed progress in this hackathon demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <a href="#main-content" className="skip-link">Skip to content</a>
              <TopBar />
              <Box component="main" id="main-content" tabIndex={-1} sx={{ flex: 1, minWidth: 0 }}>
                {children}
              </Box>
              <Footer />
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
