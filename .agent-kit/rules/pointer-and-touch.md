# Rule file — Hover, pointer and touch

Hover is a pointer-only affordance. A control that exists only under `hover:` does not exist
on a phone.

1. **Never hide a primary action behind hover.** Play, favourite and anything destructive
   stay visible at every width. Secondary actions collapse only if a tap-opened sheet or
   menu reaches them.
2. **Tap targets are at least 44×44px.** `size-6` and `p-1.5` are desktop-only sizes.
3. **Gate visibility on the pointer, never on width.** `md:` says nothing about hover: an
   iPad in landscape is past `md` and still has no pointer. Use `pointer-fine:`,
   `pointer-coarse:` and `any-pointer-fine:`.
4. **`hover:` is already wrapped in `@media (hover: hover)`** by Tailwind v4, so hover
   *styles* are safe alone; it is the show/hide that must follow the pointer.
5. **Follow the primary pointer.** An iPad with a Magic Keyboard reports `pointer: fine` and
   gets the pointer UI; a touch laptop has a real pointer and gets it too.
