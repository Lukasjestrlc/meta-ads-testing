import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import ClarityScript from "@/components/ClarityScript";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Deliberately neutral metadata — no niche-specific keywords. Meta's classifier
// reads these on first crawl and uses them as a major signal.
export const metadata: Metadata = {
  title: "Daisy Hub",
  description: "A small, hand-curated directory of independent professionals.",
  // iOS treats the page as a "web app" when added to home screen — colors
  // the status bar to match the dark theme so there's no white strip.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daisy Hub",
  },
};

// Mobile chrome (iOS Safari address bar, Android status bar) tints to this
// color so the brand bleeds into the OS chrome instead of a default white.
// `viewportFit: "cover"` lets us paint behind the iPhone notch / home
// indicator and use safe-area insets where needed.
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quicksand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ClarityScript />
      </body>
    </html>
  );
}
