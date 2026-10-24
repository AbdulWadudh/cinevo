import { tokensToCssString } from "./tokens";
import type { SsrThemeState } from "./cookie";
import type { BaseTokens } from "./types";

/**
 * Inlines the resolved token set into <head> before the body parses, so the
 * first painted frame already carries the saved palette.
 */
export function ThemeStyle<T extends BaseTokens>({
  themeState,
}: {
  themeState: SsrThemeState<T>;
}) {
  const css = `:root,html,html.dark{${tokensToCssString(themeState.activeTokens)}}`;
  return <style id="cinevo-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
