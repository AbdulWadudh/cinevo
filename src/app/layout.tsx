import type { Metadata } from "next";
import { Geist, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import PwaRegister from "@/components/PwaRegister";
import RadioMiniPlayer from "@/components/radio/RadioMiniPlayer";
import RadioPlayerProvider from "@/components/radio/RadioPlayerProvider";
import ClickSpark from "@/components/reactbits/ClickSpark";
import TrailerProvider from "@/components/TrailerProvider";
import SpatialNavProvider from "@/components/tv/SpatialNavProvider";
import ThemeStudio from "@/components/theme/ThemeStudio";
import Toaster from "@/components/ui/Toaster";
import WatchSync from "@/components/watch/WatchSync";
import WishlistProvider from "@/components/wishlist/WishlistProvider";
import { site } from "@/config";
import {
	CUSTOMIZABLE_THEME_KEYS,
	DEFAULT_THEME_ID,
	themePresets,
} from "@/lib/theme/presets";
import {
	getSsrThemeState,
	isTrustedThemeCookie,
	parseThemeCookie,
	THEME_COOKIE,
} from "@/lib/theme/studio/cookie";
import { ThemeProvider } from "@/lib/theme/studio/provider";
import { ThemeStyle } from "@/lib/theme/studio/theme-style";
import { getSiteTheme } from "@/lib/theme/site";

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
	const rawTheme = (await cookies()).get(THEME_COOKIE)?.value;
	const personalTheme = parseThemeCookie(rawTheme, DEFAULT_THEME_ID);
	const hasPersonalTheme =
		Boolean(rawTheme) &&
		isTrustedThemeCookie(personalTheme, themePresets, DEFAULT_THEME_ID);
	// A visitor who has never picked a theme gets the admin-published default.
	// Someone with a valid personal cookie keeps their own palette.
	const siteTheme = hasPersonalTheme ? null : await getSiteTheme();
	const initialTheme = hasPersonalTheme
		? personalTheme
		: siteTheme
			? { id: siteTheme.themeId, d: siteTheme.delta, def: DEFAULT_THEME_ID }
			: { id: DEFAULT_THEME_ID };
	const themeState = getSsrThemeState(
		initialTheme,
		themePresets,
		DEFAULT_THEME_ID,
		CUSTOMIZABLE_THEME_KEYS,
	);

	return (
		<html
			lang="en"
			suppressHydrationWarning
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
					<Toaster />
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
