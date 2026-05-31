import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cinevo — Stream Movies & TV Shows",
  description: "Experience premium, ad-free streaming of your favorite movies and TV series with restricted ad suppression sandboxing.",
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
        {children}
      </body>
    </html>
  );
}
