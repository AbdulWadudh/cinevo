"use client";

import {
	ChevronLeft,
	ChevronRight,
	Clapperboard,
	Heart,
	Info,
	Play,
	Star,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { type RefObject, useRef } from "react";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { TMDBMedia } from "@/lib/tmdb";
import Skeleton from "./Skeleton";
import type { TitlePreview } from "./types";

interface PreviewPanelProps {
	item: TMDBMedia;
	mediaType: "movie" | "tv";
	href: string;
	preview: TitlePreview | null;
	loading: boolean;
	width: number;
	left: number;
	top: number;
	/** Percentage of the panel where the card sits, so the pop grows out of it. */
	originX: number;
	originY: number;
	panelRef: RefObject<HTMLDivElement | null>;
	reduceMotion: boolean;
	onTrailer: () => void;
	onPointerEnter: () => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerLeave: (event: React.PointerEvent) => void;
	onPointerDown: (event: React.PointerEvent) => void;
}

export default function PreviewPanel({
	item,
	mediaType,
	href,
	preview,
	loading,
	width,
	left,
	top,
	originX,
	originY,
	panelRef,
	reduceMotion,
	onTrailer,
	onPointerEnter,
	onPointerMove,
	onPointerLeave,
	onPointerDown,
}: PreviewPanelProps) {
	const title = item.title || item.name || "";
	const year = (item.release_date || item.first_air_date || "").slice(0, 4);
	const kind = mediaType === "tv" ? "Series" : "Film";
	const score = item.vote_average ? item.vote_average.toFixed(1) : "";
	const backdrop = item.backdrop_path
		? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
		: item.poster_path
			? `https://image.tmdb.org/t/p/w500${item.poster_path}`
			: "";
	const cast = preview?.cast ?? [];
	const { has, toggle } = useWishlist();
	const saved = has(mediaType, String(item.id));
	const castRef = useRef<HTMLDivElement>(null);
	const scrollCast = (direction: number) => {
		castRef.current?.scrollBy({ left: direction * 136, behavior: "smooth" });
	};

	return (
		<motion.div
			ref={panelRef}
			onPointerEnter={onPointerEnter}
			onPointerMove={onPointerMove}
			onPointerLeave={onPointerLeave}
			onPointerDown={onPointerDown}
			onMouseDown={(event) => event.stopPropagation()}
			onMouseUp={(event) => event.stopPropagation()}
			onClick={(event) => event.stopPropagation()}
			initial={
				reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 14 }
			}
			animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
			exit={
				reduceMotion
					? { opacity: 0, transition: { duration: 0.16 } }
					: {
							opacity: 0,
							scale: 0.82,
							y: 14,
							transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] },
						}
			}
			transition={
				reduceMotion
					? { duration: 0.15 }
					: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 }
			}
			style={{
				top,
				left,
				width,
				transformOrigin: `${originX}% ${originY}%`,
				willChange: "transform, opacity",
			}}
			className="fixed z-[90] overflow-hidden rounded-xl border border-border bg-surface/95 text-fg shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-xl"
		>
			<Link
				href={href}
				tabIndex={-1}
				draggable={false}
				className="group/art relative block aspect-video overflow-hidden bg-bg"
			>
				{backdrop && (
					<Image
						src={backdrop}
						alt=""
						fill
						sizes="420px"
						className="object-cover transition duration-700 group-hover/art:scale-105"
						draggable={false}
					/>
				)}
				<span className="absolute inset-0 bg-linear-to-t from-surface via-surface/20 to-transparent" />
				{score && (
					<span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-gold backdrop-blur-sm">
						<Star className="size-3 fill-gold stroke-gold" />
						{score}
					</span>
				)}
				<span className="absolute inset-0 grid place-items-center">
					<span className="grid size-12 scale-90 place-items-center rounded-full bg-accent-strong text-white opacity-0 shadow-[0_6px_24px_rgba(var(--accent-rgb),0.5)] transition-all duration-300 group-hover/art:scale-100 group-hover/art:opacity-100">
						<Play className="size-5 translate-x-0.5 fill-white" />
					</span>
				</span>
			</Link>

			<div className="p-4 pt-3.5">
				<div className="flex items-center gap-2">
					<Link
						href={href}
						tabIndex={-1}
						aria-label={`Watch ${title}`}
						className="grid size-9 place-items-center rounded-full bg-accent-strong text-white transition-colors hover:bg-accent"
					>
						<Play className="size-4 translate-x-0.5 fill-white" />
					</Link>
					<button
						type="button"
						tabIndex={-1}
						aria-label={`Watch the ${title} trailer`}
						onClick={onTrailer}
						className="grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-white/5 text-fg transition-colors hover:border-accent hover:text-accent"
					>
						<Clapperboard className="size-4" />
					</button>
					<span className="ml-auto text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
						{kind}
					</span>
					<button
						type="button"
						tabIndex={-1}
						aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
						title={saved ? "Remove from wishlist" : "Add to wishlist"}
						onClick={() =>
							toggle({
								mediaId: String(item.id),
								mediaType,
								title,
								posterPath: item.poster_path || undefined,
								rating: item.vote_average,
								releaseDate:
									item.release_date || item.first_air_date || undefined,
							})
						}
						className={`grid size-9 cursor-pointer place-items-center rounded-full border transition-colors ${
							saved
								? "border-accent bg-accent-strong text-white"
								: "border-border bg-white/5 text-fg hover:border-accent hover:text-accent"
						}`}
					>
						<Heart className={`size-4 ${saved ? "fill-white" : ""}`} />
					</button>
				</div>

				<p className="mt-3 font-display text-base font-bold leading-tight text-fg">
					{title}
				</p>

				<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-muted">
					{year && <span>{year}</span>}
					{loading ? (
						<>
							<Skeleton className="h-3.5 w-7 rounded" />
							<Skeleton className="h-3 w-14" />
						</>
					) : (
						<>
							{preview?.certification && (
								<span className="rounded border border-border px-1 text-[9px] leading-4 text-fg-secondary">
									{preview.certification}
								</span>
							)}
							{(preview?.runtime || kind) && (
								<span>{preview?.runtime || kind}</span>
							)}
						</>
					)}
				</div>

				{loading ? (
					<div className="mt-2 flex flex-wrap gap-1.5">
						<Skeleton className="h-4 w-16 rounded-full" />
						<Skeleton className="h-4 w-12 rounded-full" />
						<Skeleton className="h-4 w-20 rounded-full" />
					</div>
				) : (
					preview &&
					preview.genres.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1.5">
							{preview.genres.map((genre) => (
								<span
									key={genre}
									className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-fg-secondary"
								>
									{genre}
								</span>
							))}
						</div>
					)
				)}

				{preview?.overview || item.overview ? (
					<p className="mt-2.5 line-clamp-3 text-[11.5px] leading-relaxed text-fg-secondary">
						{preview?.overview || item.overview}
					</p>
				) : loading ? (
					<div className="mt-2.5 space-y-1.5">
						<Skeleton className="h-2.5 w-full" />
						<Skeleton className="h-2.5 w-full" />
						<Skeleton className="h-2.5 w-2/3" />
					</div>
				) : null}

				{(loading || cast.length > 0) && (
					<div className="mt-3 border-t border-border/70 pt-3">
						<p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted">
							Cast
						</p>
						<div className="group/cast-row relative mt-2">
							<div
								ref={castRef}
								className="scrollbar-hide flex snap-x gap-3 overflow-x-auto pb-1"
							>
								{loading
									? Array.from({ length: 4 }, (_, index) => (
											<div key={index} className="w-14 shrink-0 text-center">
												<Skeleton className="mx-auto size-11 rounded-(--radius-card)" />
												<Skeleton className="mx-auto mt-1.5 h-2 w-10" />
											</div>
										))
									: cast.map((member) => (
											<Link
												key={`${member.id}-${member.character}`}
												href={`/person/${member.id}`}
												tabIndex={-1}
												className="group/cast w-14 shrink-0 snap-start text-center"
											>
												<span className="relative block size-11 overflow-hidden rounded-(--radius-card) border border-border bg-bg">
													{member.profilePath ? (
														<Image
															src={`https://image.tmdb.org/t/p/w185${member.profilePath}`}
															alt={member.name}
															fill
															sizes="44px"
															className="object-cover object-top transition duration-300 group-hover/cast:scale-110"
														/>
													) : (
														<span className="grid h-full w-full place-items-center text-xs font-bold text-muted">
															{member.name.slice(0, 1)}
														</span>
													)}
												</span>
												<span className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-fg-secondary group-hover/cast:text-accent">
													{member.name}
												</span>
											</Link>
										))}
							</div>
							{!loading && cast.length > 4 && (
								<>
									<button
										type="button"
										tabIndex={-1}
										aria-label="Scroll cast left"
										onClick={() => scrollCast(-1)}
										className="absolute left-0 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-border bg-black/80 text-fg opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:border-accent hover:text-accent group-hover/cast-row:opacity-100"
									>
										<ChevronLeft className="size-3.5" />
									</button>
									<button
										type="button"
										tabIndex={-1}
										aria-label="Scroll cast right"
										onClick={() => scrollCast(1)}
										className="absolute right-0 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-border bg-black/80 text-fg opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:border-accent hover:text-accent group-hover/cast-row:opacity-100"
									>
										<ChevronRight className="size-3.5" />
									</button>
								</>
							)}
						</div>
					</div>
				)}

				<Link
					href={href}
					tabIndex={-1}
					className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-semibold text-fg-secondary transition-colors hover:border-accent hover:text-accent"
				>
					<Info className="size-3.5" /> More info
				</Link>
			</div>
		</motion.div>
	);
}
