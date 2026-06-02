"use client";

import React from "react";
import Link from "next/link";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";

/** Bring a focused element comfortably into view (centers horizontally in rows). */
function scrollIntoView(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

interface FocusableLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Extra classes applied only while focused (on top of the global ring). */
  focusClassName?: string;
  onClick?: () => void;
  focusKey?: string;
}

/** A D-pad-focusable Next.js link. Enter follows the link. */
export function FocusableLink({ href, children, className = "", focusClassName = "", onClick, focusKey }: FocusableLinkProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => { onClick?.(); ref.current?.click(); },
    onFocus: () => scrollIntoView(ref.current),
  });
  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      className={`tv-focusable ${className} ${focused ? `tv-focused ${focusClassName}` : ""}`}
    >
      {children}
    </Link>
  );
}

interface FocusableButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  className?: string;
  focusClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/** A D-pad-focusable button. Enter triggers onPress. */
export function FocusableButton({ children, onPress, className = "", focusClassName = "", ariaLabel, disabled }: FocusableButtonProps) {
  const { ref, focused } = useFocusable({
    focusable: !disabled,
    onEnterPress: () => { if (!disabled) onPress(); },
    onFocus: () => scrollIntoView(ref.current),
  });
  return (
    <button
      ref={ref}
      onClick={() => !disabled && onPress()}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`tv-focusable ${className} ${focused ? `tv-focused ${focusClassName}` : ""}`}
    >
      {children}
    </button>
  );
}

interface FocusSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Stable key so focus can return to this section. */
  focusKey?: string;
  /** Restore focus to the last-focused child when the section regains focus. */
  saveChild?: boolean;
}

/**
 * Wraps a group of focusable items (e.g. a carousel row or the nav bar) in a
 * Norigin focus context so arrow keys move within it and between siblings.
 */
export function FocusSection({ children, className = "", focusKey, saveChild = true }: FocusSectionProps) {
  const { ref, focusKey: resolvedKey } = useFocusable({
    focusKey,
    saveLastFocusedChild: saveChild,
    trackChildren: true,
  });
  return (
    <FocusContext.Provider value={resolvedKey}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </FocusContext.Provider>
  );
}
