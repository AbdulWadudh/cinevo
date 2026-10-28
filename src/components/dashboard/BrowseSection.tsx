"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getMoviesByGenreAction } from "@/app/actions/tmdb-actions";
import type { TMDBMedia } from "@/lib/tmdb";
import GenreBar from "./GenreBar";
import MediaCarousel from "./MediaCarousel";

interface BrowseSectionProps {
	initialTrending: TMDBMedia[];
}

export default function BrowseSection({ initialTrending }: BrowseSectionProps) {
	const searchParams = useSearchParams();

	const [selectedGenreId, setSelectedGenreId] = useState("");
	const [customGenre, setCustomGenre] = useState<{
		name: string;
		id: string;
	} | null>(null);
	const [genreMovies, setGenreMovies] = useState<TMDBMedia[] | null>(null);
	const [isPending, startTransition] = useTransition();

	// Query-parameter updates win over local state; adjust during render so the
	// first paint already shows the requested genre.
	const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
	if (searchParams !== prevSearchParams) {
		setPrevSearchParams(searchParams);
		const genreId = searchParams?.get("genre");
		const genreName = searchParams?.get("genreName");
		if (genreId) {
			setSelectedGenreId(genreId);
			if (genreName) setCustomGenre({ name: genreName, id: genreId });
		} else {
			setSelectedGenreId("");
		}
	}

	useEffect(() => {
		if (selectedGenreId === "") return;
		startTransition(async () => {
			const res = await getMoviesByGenreAction(selectedGenreId);
			if (res.success && res.data) setGenreMovies(res.data);
		});
	}, [selectedGenreId]);

	const movies =
		selectedGenreId === "" ? initialTrending : (genreMovies ?? initialTrending);

	return (
		<div className="w-full">
			{/* Interactive Genre Chips */}
			<GenreBar
				selectedGenreId={selectedGenreId}
				onGenreSelect={setSelectedGenreId}
				customGenre={customGenre}
			/>

			{/* Sliding Horizontal Carousel Results */}
			{isPending ? (
				/* Loading Skeleton Carousel */
				<div className="px-6 md:px-12 mb-12 animate-pulse flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="flex-none w-[140px] sm:w-[180px]">
							<div className="aspect-[2/3] w-full bg-surface-hover rounded-xl mb-2" />
							<div className="h-4 bg-surface-hover rounded w-3/4 mb-1" />
							<div className="h-3 bg-surface-hover rounded w-1/2" />
						</div>
					))}
				</div>
			) : (
				<div className="-mt-4">
					{/* No heading of its own — the page's "Explore Categories" h2 names it. */}
					<MediaCarousel
						label="Explore Categories"
						items={movies}
						mediaType="movie"
					/>
				</div>
			)}
		</div>
	);
}
