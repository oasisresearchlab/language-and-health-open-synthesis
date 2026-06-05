import type { Metadata } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rdf.scios.tech"),
  title: {
    default: "Resilient Data Futures — Discourse Graph",
    template: "%s · Resilient Data Futures",
  },
  description:
    "A living, content-addressed, contributable form of the SciOS Resilient Data Futures whitepaper. Every claim, evidence item, question, method, and source is its own addressable node.",
  openGraph: {
    type: "website",
    siteName: "Resilient Data Futures",
    url: "https://rdf.scios.tech",
    title: "Resilient Data Futures — Discourse Graph",
    description:
      "A living, content-addressed, contributable form of the SciOS Resilient Data Futures whitepaper. Every claim, evidence item, question, method, and source is its own addressable node.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resilient Data Futures — Discourse Graph",
    description:
      "A living, content-addressed, contributable form of the SciOS Resilient Data Futures whitepaper.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={150}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </TooltipProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
