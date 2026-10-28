"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from "react";
import { stackBounds } from "./bounds";
import {
  SIZER_STYLE,
  SLOT_CLASS,
  SLOT_STYLE,
  STAGE_STYLE,
  THEMES,
  clamp,
} from "./constants";
import { createSwapEngine } from "./engine";
import type {
  CardSwapHandle,
  CardSwapProps,
  Settings,
  SwapApi,
} from "./types";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const CardSwap = forwardRef<CardSwapHandle, CardSwapProps>(
  (
    {
      width = 460,
      height = 340,
      cardDistance = 60,
      verticalDistance = 70,
      depth = 90,
      skewAmount = 6,
      visibleCards = 4,
      delay = 4000,
      autoplay = true,
      pauseOnHover = true,
      draggable = true,
      speed = 1,
      bounce = 0.35,
      parallax = 0.5,
      hoverSpread = 0.12,
      dim = 0.5,
      cardRadius = 18,
      intro = true,
      theme = "dark",
      onCardClick,
      onChange,
      className = "",
      children,
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
    const shadeRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const apiRef = useRef<SwapApi | null>(null);
    const settingsRef = useRef<Settings>(null as unknown as Settings);

    const cards = useMemo<ReactElement[]>(
      () => Children.toArray(children).filter(isValidElement),
      [children],
    );
    const count = cards.length;
    const cardWidth = Math.max(40, Number(width) || 460);
    const cardHeight = Math.max(40, Number(height) || 340);
    const visible = clamp(Math.round(visibleCards), 1, Math.max(1, count));

    const bounds = useMemo(
      () =>
        stackBounds({
          width: cardWidth,
          height: cardHeight,
          cardDistance,
          verticalDistance,
          depth: Math.max(0, depth),
          skewAmount,
          visible,
          hoverSpread,
        }),
      [
        cardWidth,
        cardHeight,
        cardDistance,
        verticalDistance,
        depth,
        skewAmount,
        visible,
        hoverSpread,
      ],
    );

    useIsomorphicLayoutEffect(() => {
      settingsRef.current = {
        width: cardWidth,
        height: cardHeight,
        dx: cardDistance,
        dy: verticalDistance,
        dz: Math.max(0, depth),
        skew: skewAmount,
        visible,
        delay,
        autoplay,
        pauseOnHover,
        draggable,
        speed: clamp(speed, 0.1, 4),
        bounce: clamp(bounce, 0, 1),
        parallax: clamp(parallax, 0, 1),
        hoverSpread: Math.max(0, hoverSpread),
        dim: clamp(dim, 0, 1),
        intro,
        bounds,
        onCardClick,
        onChange,
      };
    });

    useImperativeHandle(
      ref,
      () => ({
        next: () => apiRef.current?.next(),
        prev: () => apiRef.current?.prev(),
      }),
      [],
    );

    useIsomorphicLayoutEffect(() => {
      const root = rootRef.current;
      const stage = stageRef.current;
      if (!root || !stage || !count) return undefined;
      const engine = createSwapEngine({
        root,
        stage,
        slotRefs,
        shadeRefs,
        settingsRef,
        count,
      });
      apiRef.current = engine;
      return () => {
        engine.destroy();
        apiRef.current = null;
      };
    }, [count]);

    useIsomorphicLayoutEffect(() => {
      apiRef.current?.refresh();
    });

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        apiRef.current?.next();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        apiRef.current?.prev();
      }
    };

    const rootStyle = {
      ...(THEMES[theme] ?? THEMES.dark),
      "--swap-w": `${cardWidth}px`,
      "--swap-h": `${cardHeight}px`,
      "--swap-ox": `${bounds.originX}px`,
      "--swap-oy": `${bounds.originY}px`,
      "--swap-stage-w": `${bounds.width}px`,
      "--swap-stage-h": `${bounds.height}px`,
      "--swap-ratio": `${bounds.width} / ${bounds.height}`,
      "--swap-radius": `${Math.max(0, cardRadius)}px`,
    } as CSSProperties;

    if (!count) return null;

    return (
      <div
        ref={rootRef}
        className={`group/swap relative h-full w-full touch-pan-y outline-none [-webkit-tap-highlight-color:transparent] ${className}`.trim()}
        style={rootStyle}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Card stack"
        onKeyDown={onKeyDown}
      >
        <div className="pointer-events-none max-h-full overflow-hidden" aria-hidden="true">
          <span className="block w-full" style={SIZER_STYLE} />
        </div>
        <div
          ref={stageRef}
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={STAGE_STYLE}
        >
          {cards.map((card, index) => (
            <div
              key={index}
              ref={(node) => {
                slotRefs.current[index] = node;
              }}
              className={SLOT_CLASS}
              style={SLOT_STYLE}
              data-swap-index={index}
            >
              {card}
              <span
                ref={(node) => {
                  shadeRefs.current[index] = node;
                }}
                className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] opacity-0"
                style={{ background: "var(--swap-shade)" }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
);

CardSwap.displayName = "CardSwap";

export default CardSwap;
