import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";
import UmamiProvider from "next-umami";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fintrack.sannty.in";

// Analytics is opt-in: with no NEXT_PUBLIC_UMAMI_WEBSITE_ID set, nothing loads.
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FinTrack - Privacy-first, self-hosted personal finance",
    template: "%s | FinTrack",
  },
  description:
    "FinTrack is an open source, self-hostable personal finance tracker. Track income and expenses, plan budgets, and keep your financial data on your own server.",
  keywords: [
    "personal finance",
    "expense tracker",
    "budgeting",
    "self-hosted",
    "open source",
    "double-entry",
  ],
  applicationName: "FinTrack",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "FinTrack",
    title: "FinTrack - Privacy-first, self-hosted personal finance",
    description:
      "Open source personal finance tracking you can run on your own server. No subscriptions, no vendor lock-in.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinTrack - Privacy-first, self-hosted personal finance",
    description:
      "Open source personal finance tracking you can run on your own server.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {umamiWebsiteId ? (
          <UmamiProvider websiteId={umamiWebsiteId}>{children}</UmamiProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
