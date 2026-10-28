"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { getTitlePreviewAction } from "@/app/actions/tmdb-actions";
import { useTrailer } from "@/components/TrailerProvider";
import type { TMDBMedia } from "@/lib/tmdb";
import PreviewPanel from "./PreviewPanel";
import type { TitlePreview } from "./types";
import { useHoverPopover } from "./useHoverPopover";

const previewCache = new Map<string, TitlePreview | null>();
const previewRequests = new Map<string, Promise<TitlePreview | null>>();
const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function loadPreview(
	mediaType: "movie" | "tv",
	id: number,
): Promise<TitlePreview | null> {
	const key = `${mediaType}:${id}`;
	if (previewCache.has(key))
		return Promise.resolve(previewCache.get(key) ?? null);
	const pending = previewRequests.get(key);
	if (pending) return pending;
	const request = getTitlePreviewAction(String(id), mediaType)
		.then((result) => {
			const data = result.success ? result.data : null;
			previewCache.set(key, data);
			return data;
		})
		.catch(() => null)
		.finally(() => previewRequests.delete(key));
	previewRequests.set(key, request);
	return request;
}

interface TitleHoverCardProps {
	item: TMDBMedia;
	mediaType: "movie" | "tv";
	href: string;
	enabled?: boolean;
	className?: string;
	children: ReactNode;
}

export default function TitleHoverCard({
	item,
	mediaType,
	href,
	enabled = true,
	className = "",
	children,
}: TitleHoverCardProps) {
	const mountedRef = useRef(true);
	const [preview, setPreview] = useState<TitlePreview | null>(null);
	const [loading, setLoading] = useState(false);
	const mounted = useSyncExternalStore(
		subscribeToNothing,
		getClientSnapshot,
		getServerSnapshot,
	);
	const reduceMotion = Boolean(useReducedMotion());
	const { openTrailer } = useTrailer();

	const resolvedType: "movie" | "tv" =
		item.media_type === "tv"
			? "tv"
			: item.media_type === "movie"
				? "movie"
				: mediaType;

	const load = useCallback(() => {
		const key = `${resolvedType}:${item.id}`;
		const cached = previewCache.get(key);
		if (cached !== undefined) {
			setPreview(cached);
			setLoading(false);
			return;
		}
		setLoading(true);
		loadPreview(resolvedType, item.id).then((data) => {
			if (mountedRef.current) {
				setPreview(data);
				setLoading(false);
			}
		});
	}, [item.id, resolvedType]);

	const { hostRef, panelRef, layout, schedule, closeSoon, keepOpen, dismiss } =
		useHoverPopover({ enabled, estimatedBody: 400, onOpen: load });

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	return (
		<div
			ref={hostRef}
			className={className}
			onPointerEnter={schedule}
			onPointerLeave={closeSoon}
			onPointerDown={dismiss}
		>
			{children}
			{mounted &&
				createPortal(
					<AnimatePresence>
						{layout && (
							<PreviewPanel
								key="title-preview"
								item={item}
								mediaType={resolvedType}
								href={href}
								preview={preview}
								loading={loading}
								width={layout.width}
								left={layout.left}
								top={layout.top}
								originX={layout.originX}
								originY={layout.originY}
								panelRef={panelRef}
								reduceMotion={reduceMotion}
								onTrailer={() =>
									openTrailer({
										id: String(item.id),
										mediaType: resolvedType,
										title: item.title || item.name || "",
										rating: item.vote_average,
										date: item.release_date || item.first_air_date,
									})
								}
								onPointerEnter={() => keepOpen()}
								onPointerMove={keepOpen}
								onPointerLeave={closeSoon}
								// Portal events bubble through the React tree, so a click
								// inside the panel would otherwise hit the card's dismiss
								// handler first.
								onPointerDown={(event) => event.stopPropagation()}
							/>
						)}
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
}
