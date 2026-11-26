import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const title = "Mirror Fit · AI Trial Room";
const description =
  "Take a photo of a person and a photo of a garment, and see the garment fitted on them.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Mirror Fit",
  // A tool behind a sign-in has nothing for a search engine to list.
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: "Mirror Fit" },
  openGraph: { title, description, siteName: "Mirror Fit", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF9F6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
