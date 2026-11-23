import type { Metadata, Viewport } from "next";
import { Jost, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Jost({ subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AETHR",
  description: "Nutrition, gym and running in one place.",
  applicationName: "AETHR",
  appleWebApp: { capable: true, title: "AETHR", statusBarStyle: "black" },
  // Next.js 15 emits the generic capability flag; explicitly add the Apple tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0C11",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
