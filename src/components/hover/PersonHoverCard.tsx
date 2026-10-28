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
import { getPersonPreviewAction } from "@/app/actions/tmdb-actions";
import PersonPreviewPanel from "./PersonPreviewPanel";
import type { PersonPreview } from "./types";
import { useHoverPopover } from "./useHoverPopover";

const previewCache = new Map<number, PersonPreview | null>();
const previewRequests = new Map<number, Promise<PersonPreview | null>>();
const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function loadPreview(personId: number): Promise<PersonPreview | null> {
	if (previewCache.has(personId))
		return Promise.resolve(previewCache.get(personId) ?? null);
	const pending = previewRequests.get(personId);
	if (pending) return pending;
	const request = getPersonPreviewAction(String(personId))
		.then((result) => {
			const data = result.success ? result.data : null;
			previewCache.set(personId, data);
			return data;
		})
		.catch(() => null)
		.finally(() => previewRequests.delete(personId));
	previewRequests.set(personId, request);
	return request;
}

interface PersonHoverCardProps {
	personId: number;
	name: string;
	character?: string;
	profilePath: string | null;
	enabled?: boolean;
	className?: string;
	children: ReactNode;
}

export default function PersonHoverCard({
	personId,
	name,
	character = "",
	profilePath,
	enabled = true,
	className = "",
	children,
}: PersonHoverCardProps) {
	const mountedRef = useRef(true);
	const [preview, setPreview] = useState<PersonPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const mounted = useSyncExternalStore(
		subscribeToNothing,
		getClientSnapshot,
		getServerSnapshot,
	);
	const reduceMotion = Boolean(useReducedMotion());

	const load = useCallback(() => {
		const cached = previewCache.get(personId);
		if (cached !== undefined) {
			setPreview(cached);
			setLoading(false);
			return;
		}
		setLoading(true);
		loadPreview(personId).then((data) => {
			if (mountedRef.current) {
				setPreview(data);
				setLoading(false);
			}
		});
	}, [personId]);

	const { hostRef, panelRef, layout, schedule, closeSoon, keepOpen, dismiss } =
		useHoverPopover({
			enabled,
			headerRatio: 0,
			estimatedBody: 360,
			onOpen: load,
		});

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
							<PersonPreviewPanel
								key="person-preview"
								personId={personId}
								name={name}
								character={character}
								profilePath={profilePath}
								preview={preview}
								loading={loading}
								width={layout.width}
								left={layout.left}
								top={layout.top}
								originX={layout.originX}
								originY={layout.originY}
								panelRef={panelRef}
								reduceMotion={reduceMotion}
								onPointerEnter={() => keepOpen()}
								onPointerMove={keepOpen}
								onPointerLeave={closeSoon}
								onPointerDown={(event) => event.stopPropagation()}
							/>
						)}
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
}
