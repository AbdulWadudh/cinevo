"use client";

import {
	ArrowUpRight,
	Cake,
	ChevronLeft,
	ChevronRight,
	MapPin,
	User,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { type RefObject, useRef } from "react";
import Skeleton from "./Skeleton";
import type { PersonPreview } from "./types";

interface PersonPreviewPanelProps {
	personId: number;
	name: string;
	character: string;
	profilePath: string | null;
	preview: PersonPreview | null;
	loading: boolean;
	width: number;
	left: number;
	top: number;
	originX: number;
	originY: number;
	panelRef: RefObject<HTMLDivElement | null>;
	reduceMotion: boolean;
	onPointerEnter: () => void;
	onPointerMove: (event: React.PointerEvent) => void;
	onPointerLeave: (event: React.PointerEvent) => void;
	onPointerDown: (event: React.PointerEvent) => void;
}

function ageOf(
	birthday: string | null,
	deathday: string | null,
): number | null {
	if (!birthday) return null;
	const end = deathday ? new Date(deathday) : new Date();
	const start = new Date(birthday);
	let age = end.getFullYear() - start.getFullYear();
	const month = end.getMonth() - start.getMonth();
	if (month < 0 || (month === 0 && end.getDate() < start.getDate())) age--;
	return age;
}

function dateOf(value: string): string {
	return new Date(value).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export default function PersonPreviewPanel({
	personId,
	name,
	character,
	profilePath,
	preview,
	loading,
	width,
	left,
	top,
	originX,
	originY,
	panelRef,
	reduceMotion,
	onPointerEnter,
	onPointerMove,
	onPointerLeave,
	onPointerDown,
}: PersonPreviewPanelProps) {
	const age = preview ? ageOf(preview.birthday, preview.deathday) : null;
	const profileHref = `/person/${personId}`;
	const knownRef = useRef<HTMLDivElement>(null);
	const scrollKnown = (direction: number) => {
		knownRef.current?.scrollBy({ left: direction * 176, behavior: "smooth" });
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
			<div className="p-4">
				<div className="flex items-start gap-3">
					<span className="relative size-16 shrink-0 overflow-hidden rounded-(--radius-card) border border-border bg-bg">
						{profilePath ? (
							<Image
								src={`https://image.tmdb.org/t/p/w185${profilePath}`}
								alt={name}
								fill
								sizes="64px"
								className="object-cover object-top"
							/>
						) : (
							<span className="grid h-full w-full place-items-center text-lg font-bold text-muted">
								{name.slice(0, 1)}
							</span>
						)}
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-display text-base font-bold leading-tight text-fg">
							{name}
						</p>
						{character && (
							<p className="mt-0.5 truncate text-[11px] font-semibold text-accent">
								{character}
							</p>
						)}
						{loading ? (
							<Skeleton className="mt-1.5 h-2 w-20" />
						) : (
							preview?.knownForDepartment && (
								<p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted">
									{preview.knownForDepartment}
								</p>
							)
						)}
					</div>
					<Link
						href={profileHref}
						tabIndex={-1}
						aria-label={`Open ${name} profile`}
						className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-white/5 text-fg transition-colors hover:border-accent hover:text-accent"
					>
						<ArrowUpRight className="size-4" />
					</Link>
				</div>

				{loading ? (
					<div className="mt-3 flex flex-wrap gap-3">
						<Skeleton className="h-3 w-28" />
						<Skeleton className="h-3 w-24" />
					</div>
				) : (
					(preview?.birthday || preview?.placeOfBirth) && (
						<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-fg-secondary">
							{preview?.birthday && (
								<span className="inline-flex items-center gap-1">
									<Cake className="size-3 text-muted" />
									{dateOf(preview.birthday)}
									{age !== null && <span className="text-muted">· {age}</span>}
								</span>
							)}
							{preview?.placeOfBirth && (
								<span className="inline-flex items-center gap-1">
									<MapPin className="size-3 text-muted" />
									{preview.placeOfBirth}
								</span>
							)}
						</div>
					)
				)}

				{loading ? (
					<div className="mt-3 space-y-1.5">
						<Skeleton className="h-2.5 w-full" />
						<Skeleton className="h-2.5 w-full" />
						<Skeleton className="h-2.5 w-full" />
						<Skeleton className="h-2.5 w-2/3" />
					</div>
				) : (
					preview?.biography && (
						<p className="mt-3 line-clamp-4 text-[11.5px] leading-relaxed text-fg-secondary">
							{preview.biography}
						</p>
					)
				)}

				{(loading || (preview && preview.knownFor.length > 0)) && (
					<div className="mt-3 border-t border-border/70 pt-3">
						<p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted">
							Known for
						</p>
						<div className="group/known-row relative mt-2">
							<div
								ref={knownRef}
								className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-1"
							>
								{loading
									? Array.from({ length: 4 }, (_, index) => (
											<div
												key={index}
												className="w-[calc((100%-1.5rem)/4)] shrink-0 snap-start"
											>
												<Skeleton className="aspect-2/3 w-full" />
												<Skeleton className="mt-1 h-2 w-full" />
												<Skeleton className="mt-0.5 h-2 w-1/2" />
											</div>
										))
									: preview?.knownFor.map((credit) => (
											<Link
												key={`${credit.mediaType}-${credit.id}`}
												href={`/watch/${credit.mediaType}/${credit.id}`}
												tabIndex={-1}
												className="group/credit w-[calc((100%-1.5rem)/4)] shrink-0 snap-start"
											>
												<span className="relative block aspect-2/3 overflow-hidden rounded-md border border-border bg-bg">
													{credit.posterPath && (
														<Image
															src={`https://image.tmdb.org/t/p/w185${credit.posterPath}`}
															alt={credit.title}
															fill
															sizes="80px"
															className="object-cover transition duration-300 group-hover/credit:scale-105"
														/>
													)}
												</span>
												<span className="mt-1 block truncate text-[9.5px] font-semibold leading-tight text-fg-secondary group-hover/credit:text-accent">
													{credit.title}
												</span>
												{credit.year && (
													<span className="block text-[9px] text-muted">
														{credit.year}
													</span>
												)}
											</Link>
										))}
							</div>
							{!loading && (preview?.knownFor.length ?? 0) > 4 && (
								<>
									<button
										type="button"
										tabIndex={-1}
										aria-label="Scroll known for left"
										onClick={() => scrollKnown(-1)}
										className="absolute left-0 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-border bg-black/80 text-fg opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:border-accent hover:text-accent group-hover/known-row:opacity-100"
									>
										<ChevronLeft className="size-3.5" />
									</button>
									<button
										type="button"
										tabIndex={-1}
										aria-label="Scroll known for right"
										onClick={() => scrollKnown(1)}
										className="absolute right-0 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-border bg-black/80 text-fg opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:border-accent hover:text-accent group-hover/known-row:opacity-100"
									>
										<ChevronRight className="size-3.5" />
									</button>
								</>
							)}
						</div>
					</div>
				)}

				<Link
					href={profileHref}
					tabIndex={-1}
					className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-semibold text-fg-secondary transition-colors hover:border-accent hover:text-accent"
				>
					<User className="size-3.5" /> Full profile
				</Link>
			</div>
		</motion.div>
	);
}
