"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import { storageKey } from "@/config";
import { safeStorage } from "@/lib/safeStorage";
import type { TMDBMedia } from "@/lib/tmdb";

const STORAGE_KEY = storageKey("daily-five:revealed");
const CHANGE_EVENT = "cinevo:daily-five";

function subscribe(onChange: () => void) {
	window.addEventListener("storage", onChange);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}

export default function DailyFive({
	items,
	day,
}: {
	items: TMDBMedia[];
	day: string;
}) {
	const reduceMotion = useReducedMotion();
	const snapshot = useSyncExternalStore(
		subscribe,
		() => safeStorage.get(STORAGE_KEY),
		() => null,
	);
	const revealed = useMemo(() => {
		try {
			const saved = JSON.parse(snapshot || "null");
			return saved?.day === day && Array.isArray(saved.keys)
				? saved.keys.filter(
						(key: unknown): key is string => typeof key === "string",
					)
				: [];
		} catch {
			return [];
		}
	}, [day, snapshot]);

	const reveal = (key: string) => {
		const next = [...new Set([...revealed, key])];
		safeStorage.set(STORAGE_KEY, JSON.stringify({ day, keys: next }));
		window.dispatchEvent(new Event(CHANGE_EVENT));
	};

	if (items.length < 5) return null;

	return (
		<section className="px-6 md:px-12 mb-12" aria-labelledby="daily-five-title">
			<div className="mb-5 flex items-end justify-between gap-4">
				<div>
					<h2
						id="daily-five-title"
						className="font-display text-2xl md:text-3xl font-extrabold tracking-tight"
					>
						Daily Five
					</h2>
					<p className="mt-1 text-sm text-fg-secondary">
						Five fresh picks. Reveal a card, save what catches your eye.
					</p>
				</div>
				<Link
					href="/reveal"
					className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-accent"
				>
					<span className="hidden sm:inline">Try Mystery</span>
					<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
				</Link>
			</div>

			<p className="sr-only" aria-live="polite">
				{`${revealed.length} of 5 daily picks revealed`}
			</p>
			<div className="flex snap-x gap-4 overflow-x-auto pb-4 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible">
				{items.map((item, index) => {
					const mediaType = item.media_type === "tv" ? "tv" : "movie";
					const key = `${mediaType}:${item.id}`;
					const isRevealed = revealed.includes(key);
					const title = item.title || item.name || "Untitled";

					return (
						<motion.article
							key={key}
							initial={
								reduceMotion ? false : { opacity: 0, y: 24, rotateY: -8 }
							}
							animate={{ opacity: 1, y: 0, rotateY: 0 }}
							transition={{
								duration: 0.45,
								delay: index * 0.07,
								ease: "easeOut",
							}}
							className="w-40 flex-none snap-start sm:w-44 lg:w-auto"
						>
							<div className="relative aspect-2/3 [perspective:1000px]">
								<AnimatePresence initial={false} mode="wait">
									{isRevealed ? (
										<motion.div
											key="revealed"
											initial={
												reduceMotion
													? false
													: { opacity: 0, rotateY: -70, scale: 0.96 }
											}
											animate={{ opacity: 1, rotateY: 0, scale: 1 }}
											transition={{ duration: 0.4, ease: "easeOut" }}
											className="group h-full"
										>
											<div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-xl">
												<Link
													href={`/watch/${mediaType}/${item.id}`}
													className="relative block h-full"
												>
													<Image
														src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
														alt={title}
														fill
														sizes="(max-width: 1024px) 176px, 20vw"
														className="object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-75"
													/>
												</Link>
												<WishlistHeart
													item={item}
													mediaType={mediaType}
													className="pointer-coarse:opacity-100"
												/>
											</div>
										</motion.div>
									) : (
										<motion.button
											key="hidden"
											type="button"
											onClick={() => reveal(key)}
											whileHover={
												reduceMotion
													? undefined
													: { y: -6, rotate: index % 2 === 0 ? -1 : 1 }
											}
											whileTap={{ scale: 0.97 }}
											className="relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-accent/25 bg-[radial-gradient(circle_at_50%_20%,rgba(229,62,79,0.2),transparent_55%),linear-gradient(145deg,#191927,#0e0e18)] text-fg shadow-xl transition-colors hover:border-accent/60"
											aria-label={`Reveal daily pick ${index + 1}`}
										>
											<span className="mb-5 grid size-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
												<Sparkles className="size-5" />
											</span>
											<span className="text-sm font-bold">Reveal pick</span>
											<span className="mt-1 text-xs text-muted">
												Tap to discover
											</span>
										</motion.button>
									)}
								</AnimatePresence>
							</div>
							<div className="min-h-12 px-1 pt-3">
								{isRevealed && (
									<>
										<h3 className="truncate text-sm font-semibold">{title}</h3>
										<p className="mt-0.5 text-xs text-muted">
											{mediaType === "tv" ? "TV series" : "Movie"}
										</p>
									</>
								)}
							</div>
						</motion.article>
					);
				})}
			</div>
		</section>
	);
}
