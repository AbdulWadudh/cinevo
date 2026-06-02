import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import WishlistProvider from "@/components/wishlist/WishlistProvider";
import TrailerProvider from "@/components/TrailerProvider";
import WatchSync from "@/components/watch/WatchSync";
import PwaRegister from "@/components/PwaRegister";
import Toaster from "@/components/ui/Toaster";

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
    default: "Cinevo — Stream Movies & TV Shows",
    template: "%s · Cinevo",
  },
  description: "Experience premium, ad-free streaming of your favorite movies and TV series with restricted ad suppression sandboxing.",
  applicationName: "Cinevo",
  appleWebApp: { capable: true, title: "Cinevo", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Cinevo",
    title: "Cinevo — Stream Movies & TV Shows",
    description: "Premium, ad-suppressed streaming of movies and TV series.",
    images: ["/full_logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cinevo — Stream Movies & TV Shows",
    description: "Premium, ad-suppressed streaming of movies and TV series.",
    images: ["/full_logo.png"],
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
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
