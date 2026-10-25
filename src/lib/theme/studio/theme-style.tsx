import { fontStylesheetHref } from "./fonts";
import { tokensToCssString, tokensToCssVars } from "./tokens";
import type { SsrThemeState } from "./cookie";
import type { BaseTokens } from "./types";

/**
 * Inlines the resolved token set into <head> before the body parses, so the
 * first painted frame already carries the saved palette.
 *
 * The blocking script writes the tokens straight onto <html> — inline custom
 * properties outrank every stylesheet no matter when Next injects its CSS
 * chunks, which is what makes this flash-proof rather than merely early. The
 * `<style>` stays as the no-JS fallback; its doubled `:root` raises specificity
 * above the `:root` block Tailwind emits for `@theme`.
 */
export function ThemeStyle<T extends BaseTokens>({
  themeState,
}: {
  themeState: SsrThemeState<T>;
}) {
  const css = `:root:root,html.dark:root{${tokensToCssString(themeState.activeTokens)}}`;

  const payload = JSON.stringify(tokensToCssVars(themeState.activeTokens))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const script = `(function(){var t=${payload};var s=document.documentElement.style;for(var k in t){s.setProperty(k,t[k])}})();`;

  // next/font already bundles the shipped faces; a themed family is fetched
  // here instead of after hydration so text never swaps mid-paint.
  const fontHrefs = Array.from(
    new Set(
      [
        fontStylesheetHref(themeState.activeTokens.fontHeading),
        fontStylesheetHref(themeState.activeTokens.fontBody),
      ].filter((href): href is string => Boolean(href)),
    ),
  );

  return (
    <>
      <script
        id="cinevo-theme-script"
        dangerouslySetInnerHTML={{ __html: script }}
      />
      <style id="cinevo-theme" dangerouslySetInnerHTML={{ __html: css }} />
      {fontHrefs.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </>
  );
}
