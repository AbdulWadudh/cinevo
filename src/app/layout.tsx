import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import WishlistProvider from "@/components/wishlist/WishlistProvider";
import TrailerProvider from "@/components/TrailerProvider";
import WatchSync from "@/components/watch/WatchSync";
import PwaRegister from "@/components/PwaRegister";
import Toaster from "@/components/ui/Toaster";
import SpatialNavProvider from "@/components/tv/SpatialNavProvider";
import { site } from "@/config";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.title,
    template: site.titleTemplate,
  },
  description: site.description.long,
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "black-translucent" },
  icons: {
    icon: site.logo.mark,
    shortcut: site.logo.mark,
    apple: site.logo.mark,
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description.short,
    images: [site.logo.full],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description.short,
    images: [site.logo.full],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body className="bg-bg text-fg min-h-full flex flex-col font-sans">
        <WishlistProvider>
          <TrailerProvider>{children}</TrailerProvider>
        </WishlistProvider>
        <WatchSync />
        <PwaRegister />
        <SpatialNavProvider />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
