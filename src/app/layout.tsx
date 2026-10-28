import type { Metadata } from "next";
import { Geist, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./experiences.css";
import { Analytics } from "@vercel/analytics/next";
import PwaRegister from "@/components/PwaRegister";
import RadioMiniPlayer from "@/components/radio/RadioMiniPlayer";
import RadioPlayerProvider from "@/components/radio/RadioPlayerProvider";
import ClickSpark from "@/components/reactbits/ClickSpark";
import TrailerProvider from "@/components/TrailerProvider";
import SpatialNavProvider from "@/components/tv/SpatialNavProvider";
import ThemeMismatchNotice from "@/components/theme/ThemeMismatchNotice";
import ThemeStudio from "@/components/theme/ThemeStudio";
import Toaster from "@/components/ui/Toaster";
import WatchSync from "@/components/watch/WatchSync";
import WishlistProvider from "@/components/wishlist/WishlistProvider";
import { site } from "@/config";
import { getActiveThemeState } from "@/lib/theme/active";
import { DEFAULT_THEME_ID, themePresets } from "@/lib/theme/presets";
import { ThemeProvider } from "@/lib/theme/studio/provider";
import { ThemeStyle } from "@/lib/theme/studio/theme-style";

const plusJakarta = Plus_Jakarta_Sans({
	variable: "--font-plus-jakarta",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
});

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const siteUrl =
	process.env.SITE_URL ||
	process.env.NEXT_PUBLIC_SITE_URL ||
	"http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: site.title,
		template: site.titleTemplate,
	},
	description: site.description.long,
	applicationName: site.name,
	appleWebApp: {
		capable: true,
		title: site.name,
		statusBarStyle: "black-translucent",
	},
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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const themeState = await getActiveThemeState();

	return (
		<html
			lang="en"
			suppressHydrationWarning
			data-experience={themeState.experience}
			className={`${plusJakarta.variable} ${geistSans.variable} dark h-full antialiased`}
		>
			<head>
				<ThemeStyle themeState={themeState} />
				{/* Every poster and backdrop comes from here, and the hero's is the LCP
            element — opening the connection alongside the HTML saves the DNS +
            TLS round trips that would otherwise sit in front of it. */}
				<link rel="preconnect" href="https://image.tmdb.org" />
				<link rel="dns-prefetch" href="https://image.tmdb.org" />
			</head>
			<body className="bg-bg text-fg min-h-full flex flex-col font-sans">
				<ThemeProvider
					themes={themePresets}
					defaultTheme={DEFAULT_THEME_ID}
					initialState={{
						themeId: themeState.themeId,
						delta: themeState.delta,
						experience: themeState.experience,
						detailLayout: themeState.detailLayout,
					}}
				>
					{/* Owns the audio element, so radio keeps playing across navigation. */}
					<RadioPlayerProvider>
						<WishlistProvider>
							<TrailerProvider>
								<ClickSpark
									sparkColor="var(--color-accent)"
									sparkSize={12}
									sparkRadius={18}
									sparkCount={8}
									duration={500}
								>
									{/* The single `main` landmark for every route — pages render their
                      own sections inside it and must not nest another `main`. */}
									<main id="main-content">{children}</main>
								</ClickSpark>
							</TrailerProvider>
						</WishlistProvider>
						<RadioMiniPlayer />
						{/* Inside the radio provider so the trigger can clear the full
                player dock when a station is on air. */}
						<ThemeStudio />
					</RadioPlayerProvider>
					<WatchSync />
					<PwaRegister />
					<SpatialNavProvider />
					{themeState.showMismatch && themeState.published && (
						<ThemeMismatchNotice published={themeState.published} />
					)}
					<Toaster />
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
