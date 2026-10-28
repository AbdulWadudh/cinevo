import Image from "next/image";
import Link from "next/link";
import TitleHoverCard from "@/components/hover/TitleHoverCard";
import WishlistHeart from "@/components/wishlist/WishlistHeart";
import DecayBorder from "@/components/media/DecayBorder";
import type { TMDBMedia } from "@/lib/tmdb";

interface SimilarTitlesProps {
	items: TMDBMedia[];
	mediaType: "movie" | "tv";
	heading?: string;
	limit?: number;
	className?: string;
}

export default function SimilarTitles({
	items,
	mediaType,
	heading = "More Like This",
	limit = 18,
	className = "",
}: SimilarTitlesProps) {
	if (items.length === 0) return null;

	return (
		<section className={`px-6 md:px-12 pt-12 ${className}`.trim()}>
			<div className="mb-5 flex items-end justify-between gap-4">
				<h2 className="font-display text-xl font-bold md:text-2xl">
					{heading}
				</h2>
				<span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
					{items.length} titles
				</span>
			</div>
			<div className="scrollbar-hide flex snap-x gap-4 overflow-x-auto pb-4">
				{items.slice(0, limit).map((item) => {
					const title = item.title || item.name || "";
					const year = (item.release_date || item.first_air_date || "").slice(
						0,
						4,
					);
					const href = `/watch/${item.media_type || mediaType}/${item.id}`;
					return (
						<TitleHoverCard
							key={item.id}
							item={item}
							mediaType={mediaType}
							href={href}
							className="group w-32.5 flex-none snap-start sm:w-40"
						>
							<Link href={href} className="block cursor-pointer">
								<div
									data-hover-media=""
									className="relative aspect-2/3 w-full overflow-hidden rounded-lg border border-white/4 bg-surface"
								>
									<Image
										src={
											item.poster_path
												? `https://image.tmdb.org/t/p/w300${item.poster_path}`
												: "https://picsum.photos/seed/similar/300/450"
										}
										alt={title}
										fill
										sizes="(max-width: 640px) 130px, 160px"
										className="object-cover transition duration-400 group-hover:scale-105"
									/>
									<DecayBorder />
									<WishlistHeart
										item={item}
										mediaType={mediaType}
										className="pointer-fine:min-[900px]:hidden"
									/>
									{item.vote_average > 0 && (
										<span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-gold backdrop-blur-sm">
											{item.vote_average.toFixed(1)}
										</span>
									)}
								</div>
								<div className="px-0.5 pt-2">
									<div className="truncate text-xs font-semibold text-fg transition-colors group-hover:text-accent">
										{title}
									</div>
									<div className="mt-0.5 text-[10px] text-muted">{year}</div>
								</div>
							</Link>
						</TitleHoverCard>
					);
				})}
			</div>
		</section>
	);
}
