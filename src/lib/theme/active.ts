import { cookies } from "next/headers";
import { cache } from "react";
import {
  DEFAULT_CARD_EFFECT_ID,
  DEFAULT_CARD_DISTANCE,
  DEFAULT_DECAY_RING,
  DEFAULT_HERO_EFFECT_ID,
  isCardEffectId,
  isCardDistance,
  isDecayRing,
  isHeroEffectId,
} from "./card-effects";
import {
  DEFAULT_DETAIL_LAYOUT_ID,
  isDetailLayoutId,
} from "./detail-layouts";
import { DEFAULT_EXPERIENCE_ID, EXPERIENCE_IDS } from "./experiences";
import {
  normalizeThemeDelta,
  readSkipFingerprint,
  THEME_SKIP_COOKIE,
  themeChoicesMatch,
  themeFingerprint,
  type ThemeChoice,
} from "./mismatch";
import { CUSTOMIZABLE_THEME_KEYS, DEFAULT_THEME_ID, themePresets } from "./presets";
import { getSiteTheme } from "./site";
import {
  getSsrThemeState,
  isTrustedThemeCookie,
  parseThemeCookie,
  THEME_COOKIE,
} from "./studio/cookie";

/**
 * Single source of truth for "which theme and experience is this request in?".
 * The root layout paints it and the home page composes against it, so the two
 * can never disagree about which site shell is being rendered. `cache` keeps
 * the published row to one read per request instead of one per caller.
 */
export const getActiveThemeState = cache(async () => {
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(THEME_COOKIE)?.value;
  const personalTheme = parseThemeCookie(rawTheme, DEFAULT_THEME_ID);
  const hasPersonalTheme =
    Boolean(rawTheme) &&
    isTrustedThemeCookie(personalTheme, themePresets, DEFAULT_THEME_ID);
  // An explicit choice in the studio outranks the published default: a saved
  // theme is the visitor's, and ignoring it made every manual change revert on
  // reload. With no saved choice the published site theme applies.
  // The row is read either way so the mismatch notice knows what is published.
  const siteTheme = await getSiteTheme();
  const initialTheme = hasPersonalTheme
    ? personalTheme
    : siteTheme
      ? {
          id: siteTheme.themeId,
          d: siteTheme.delta,
          def: DEFAULT_THEME_ID,
          x: siteTheme.experience,
        }
      : { id: DEFAULT_THEME_ID, x: DEFAULT_EXPERIENCE_ID };

  const resolved = getSsrThemeState(
    initialTheme,
    themePresets,
    DEFAULT_THEME_ID,
    CUSTOMIZABLE_THEME_KEYS,
    EXPERIENCE_IDS,
    DEFAULT_EXPERIENCE_ID,
  );

  // A saved layout is the visitor's; without one the published default applies,
  // and only then the shipped layout.
  const detailLayout =
    hasPersonalTheme && isDetailLayoutId(personalTheme.l)
      ? personalTheme.l
      : siteTheme?.detailLayout ?? DEFAULT_DETAIL_LAYOUT_ID;
  const cardEffect =
    hasPersonalTheme && isCardEffectId(personalTheme.ce)
      ? personalTheme.ce
      : siteTheme?.cardEffect ?? DEFAULT_CARD_EFFECT_ID;
  const heroEffect =
    hasPersonalTheme && isHeroEffectId(personalTheme.he)
      ? personalTheme.he
      : siteTheme?.heroEffect ?? DEFAULT_HERO_EFFECT_ID;
  const decayRing =
    hasPersonalTheme && isDecayRing(personalTheme.cr)
      ? personalTheme.cr
      : siteTheme?.decayRing ?? DEFAULT_DECAY_RING;
  const cardDistance =
    hasPersonalTheme && isCardDistance(personalTheme.cd)
      ? personalTheme.cd
      : siteTheme?.cardDistance ?? DEFAULT_CARD_DISTANCE;

  const published: ThemeChoice | null = siteTheme
    ? {
        themeId: siteTheme.themeId,
        experience: siteTheme.experience,
        delta: normalizeThemeDelta(siteTheme.delta),
      }
    : null;
  const fingerprint = published ? themeFingerprint(published) : null;
  const skippedFingerprint = readSkipFingerprint(cookieStore.get(THEME_SKIP_COOKIE)?.value);
  const personalChoice: ThemeChoice = {
    themeId: resolved.themeId,
    experience: resolved.experience,
    // Compare what is actually painted, after the cookie's keys were filtered.
    delta: normalizeThemeDelta(resolved.delta),
  };

  return {
    ...resolved,
    detailLayout,
    cardEffect,
    heroEffect,
    decayRing,
    cardDistance,
    published: published && fingerprint ? { ...published, fingerprint } : null,
    // A skip only silences the revision the visitor actually saw: republishing
    // changes the fingerprint, so the notice comes back on its own.
    showMismatch: Boolean(
      hasPersonalTheme &&
        published &&
        fingerprint &&
        fingerprint !== skippedFingerprint &&
        !themeChoicesMatch(personalChoice, published),
    ),
  };
});
