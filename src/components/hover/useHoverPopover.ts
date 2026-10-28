"use client";

import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

const OPEN_DELAY_MS = 450;
const CLOSE_DELAY_MS = 260;

interface HoverPopoverOptions {
	enabled?: boolean;
	minWidth?: number;
	maxWidth?: number;
	widthFactor?: number;
	headerRatio?: number;
	estimatedBody: number;
	onOpen?: () => void;
}

export interface HoverPopoverLayout {
	width: number;
	left: number;
	top: number;
	originX: number;
	originY: number;
}

export interface HoverPopoverState {
	hostRef: RefObject<HTMLDivElement | null>;
	panelRef: RefObject<HTMLDivElement | null>;
	layout: HoverPopoverLayout | null;
	schedule: () => void;
	closeSoon: (event?: ReactPointerEvent) => void;
	keepOpen: (event?: ReactPointerEvent) => void;
	dismiss: () => void;
}

function layoutFor(
	rect: DOMRect,
	minWidth: number,
	maxWidth: number,
	widthFactor: number,
	headerRatio: number,
	estimatedBody: number,
): HoverPopoverLayout {
	const width = Math.min(
		maxWidth,
		Math.max(minWidth, Math.round(rect.width * widthFactor)),
	);
	const height = width * headerRatio + estimatedBody;
	const left = Math.min(
		Math.max(8, rect.left - (width - rect.width) / 2),
		Math.max(8, window.innerWidth - width - 8),
	);
	const top = Math.min(
		Math.max(8, rect.top - 16),
		Math.max(8, window.innerHeight - height - 8),
	);
	const originX = Math.min(
		100,
		Math.max(0, ((rect.left + rect.width / 2 - left) / width) * 100),
	);
	const originY = Math.min(
		100,
		Math.max(0, ((rect.top + rect.height / 2 - top) / height) * 100),
	);
	return { width, left, top, originX, originY };
}

export function useHoverPopover({
	enabled = true,
	minWidth = 320,
	maxWidth = 420,
	widthFactor = 1.6,
	headerRatio = 0.5625,
	estimatedBody,
	onOpen,
}: HoverPopoverOptions): HoverPopoverState {
	const hostRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const pointerRef = useRef<{ x: number; y: number } | null>(null);
	const openTimer = useRef<number | null>(null);
	const closeTimer = useRef<number | null>(null);
	const [rect, setRect] = useState<DOMRect | null>(null);

	const clearOpenTimer = useCallback(() => {
		if (openTimer.current !== null) {
			window.clearTimeout(openTimer.current);
			openTimer.current = null;
		}
	}, []);

	const clearCloseTimer = useCallback(() => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);

	const schedule = useCallback(() => {
		if (!enabled) return;
		if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
			return;
		if (window.innerWidth < 900) return;
		clearCloseTimer();
		clearOpenTimer();
		onOpen?.();
		openTimer.current = window.setTimeout(() => {
			const media =
				hostRef.current?.querySelector<HTMLElement>("[data-hover-media]");
			const target = media ?? hostRef.current;
			if (target) setRect(target.getBoundingClientRect());
		}, OPEN_DELAY_MS);
	}, [enabled, onOpen, clearCloseTimer, clearOpenTimer]);

	// The panel is portalled above the card, so it mounts under a stationary
	// pointer and never receives `pointerenter`. Ask the hit-test who is under
	// the pointer before closing, or reaching for the panel would dismiss it.
	const pointerOverPanel = useCallback(() => {
		const panel = panelRef.current;
		const point = pointerRef.current;
		if (!panel || !point) return false;
		const hit = document.elementFromPoint(point.x, point.y);
		return Boolean(hit && panel.contains(hit));
	}, []);

	const dismiss = useCallback(() => {
		clearOpenTimer();
		clearCloseTimer();
		setRect(null);
	}, [clearCloseTimer, clearOpenTimer]);

	const closeSoon = useCallback(
		(event?: ReactPointerEvent) => {
			if (event) pointerRef.current = { x: event.clientX, y: event.clientY };
			clearOpenTimer();
			clearCloseTimer();
			if (pointerOverPanel()) return;
			closeTimer.current = window.setTimeout(() => {
				if (pointerOverPanel()) return;
				setRect(null);
			}, CLOSE_DELAY_MS);
		},
		[clearCloseTimer, clearOpenTimer, pointerOverPanel],
	);

	const keepOpen = useCallback(
		(event?: ReactPointerEvent) => {
			if (event) pointerRef.current = { x: event.clientX, y: event.clientY };
			clearCloseTimer();
		},
		[clearCloseTimer],
	);

	useEffect(() => {
		if (!rect) return;
		const track = (event: PointerEvent) => {
			pointerRef.current = { x: event.clientX, y: event.clientY };
		};
		window.addEventListener("pointermove", track, { passive: true });
		return () => window.removeEventListener("pointermove", track);
	}, [rect]);

	useEffect(() => {
		if (!rect) return;
		const close = (event?: Event) => {
			if (
				event?.target instanceof Node &&
				panelRef.current?.contains(event.target)
			)
				return;
			setRect(null);
		};
		window.addEventListener("scroll", close, true);
		window.addEventListener("resize", close);
		return () => {
			window.removeEventListener("scroll", close, true);
			window.removeEventListener("resize", close);
		};
	}, [rect]);

	useEffect(() => {
		if (!rect) return;
		const onFocusOut = (event: FocusEvent) => {
			const next = event.relatedTarget;
			if (
				next instanceof Node &&
				(hostRef.current?.contains(next) || panelRef.current?.contains(next))
			) {
				return;
			}
			dismiss();
		};
		const onWindowBlur = () => dismiss();
		const onVisibility = () => {
			if (document.hidden) dismiss();
		};
		document.addEventListener("focusout", onFocusOut, true);
		window.addEventListener("blur", onWindowBlur);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			document.removeEventListener("focusout", onFocusOut, true);
			window.removeEventListener("blur", onWindowBlur);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [rect, dismiss]);

	useEffect(
		() => () => {
			if (openTimer.current !== null) window.clearTimeout(openTimer.current);
			if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
		},
		[],
	);

	return {
		hostRef,
		panelRef,
		layout: rect
			? layoutFor(
					rect,
					minWidth,
					maxWidth,
					widthFactor,
					headerRatio,
					estimatedBody,
				)
			: null,
		schedule,
		closeSoon,
		keepOpen,
		dismiss,
	};
}
