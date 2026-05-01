import type { Metadata } from "next";
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
