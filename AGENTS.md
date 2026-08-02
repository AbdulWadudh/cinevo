<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Motion & Animation — use it everywhere, heavily

Cinevo is a cinematic, premium product. **Every** new or changed UI element should
move. Treat animation as a default, not a finishing touch — static UI is a bug here.

- **Library:** use [`motion`](https://motion.dev) (already a dependency) for component
  animation in client components — `import { motion, AnimatePresence } from "motion/react"`.
  Use Tailwind transitions / CSS keyframes for simple hover and state changes.
- **Apply broadly:**
  - **Entrance:** fade/slide/scale content in on mount and on scroll into view
    (stagger lists and grids).
  - **Hover & press:** scale, lift, glow, and color transitions on every interactive
    element (cards, buttons, links, icons).
  - **Layout & route changes:** animate mounts/unmounts with `AnimatePresence`; animate
    reordering with `layout`.
  - **Micro-interactions:** loaders, toggles, dropdowns, modals/overlays, skeletons,
    and feedback states (added-to-wishlist, copied, etc.) should all be animated.
- **Feel:** prefer spring or ease-out curves, short durations (150–400ms), and subtle
  stagger. Keep it smooth and intentional — animate `transform`/`opacity` (GPU-friendly),
  avoid animating layout-thrashing properties.
- **Accessibility:** respect `prefers-reduced-motion` — gate non-essential motion behind it.

When in doubt, add motion. A new screen, card, list, or control should never ship
without an entrance animation and interactive hover/press feedback.

# Codebase Control & Alignment

The user retains complete control over code style, structure, and design decisions. Antigravity must:

- Ensure the user is fully aligned before proceeding with code changes.
- Follow the approved implementation plan exactly.
- Adhere strictly to the requested codebase patterns and style guidelines without imposing arbitrary deviations.
- **Changelog Consultation:** Always read the `CHANGELOG.md` file first before writing code or suggesting new features. This helps you understand what systems are already implemented (e.g. watch progress sync, spatial D-pad navigation, PWA settings, brand portals) and prevents duplicating existing work.
- **Changelog Maintenance:** Update `CHANGELOG.md` in the same change that ships the work — never as a follow-up. Record what the code actually does, not what was intended: if an entry becomes untrue (a control moved, a behaviour was replaced), correct it rather than leaving it to rot. Genuine bugs fixed along the way belong under `Fixed` with the cause, not buried inside a feature bullet. Keep `README.md` in step when a change adds a user-facing feature, a new script, or alters setup steps.

# Hover Interactions & Touch

Hover is a pointer-only affordance — it does not exist on touch. Any control
revealed by hover must have a touch-reachable equivalent, or the feature is
simply missing on phones.

- Never hide a **primary** action behind hover. Favourite, play, and anything
  destructive stay visible at all times on small screens.
- Secondary/admin actions may collapse on desktop, but on touch they must be
  either always visible or reachable from a tap-opened sheet or menu.
- Tap targets are at least **44×44px** on touch; the compact desktop sizes
  (`size-6`, `p-1.5`) are too small for a finger.

**Gate on input capability, never on width.** `md:` describes how wide the
viewport is, which says nothing about whether the device can hover. An iPad in
landscape is 1024–1366px CSS pixels — comfortably past `md` — so width-based
gating hands a tablet the mouse-only UI and the controls become unreachable.
A touch laptop is the mirror image: wide *and* touch-capable, but it has a
real pointer and should get the hover UI.

Use the pointer media features instead (Tailwind v4 ships variants for them):

| Variant              | Media query                    | Matches                          |
| -------------------- | ------------------------------ | -------------------------------- |
| `pointer-fine:`      | `(pointer: fine)`              | mouse / trackpad / stylus        |
| `pointer-coarse:`    | `(pointer: coarse)`            | finger — phones, tablets, iPad   |
| `any-pointer-fine:`  | `(any-pointer: fine)`          | *some* precise input is attached |

- `hover:` is already wrapped in `@media (hover: hover)` by Tailwind v4, so
  hover *styles* are safe on their own. It's the visibility gating that has to
  be pointer-based.
- `pointer:` reflects the **primary** input, so an iPad with a Magic Keyboard
  correctly reports `fine` and gets the pointer UI. That's the behaviour we
  want — follow the primary pointer, not the presence of a touchscreen.

# Scroll Containment

A long list belongs to its panel, not to the page. Whenever a section can hold
an unbounded number of entries — a paginated table, the station catalogue, a
report queue, search results — cap its height and give **that container** the
scrollbar. The page must not grow with the data.

- Bound the scrolling element (`max-h-[60vh]`, or a `calc()` against the
  viewport) and give it `overflow-y-auto` **and** `overscroll-contain`, so
  reaching the end of the list doesn't start scrolling the page behind it.
- Everything that frames the list — panel header, search box, filter tabs,
  pagination — stays *outside* the scroll container and therefore stays on
  screen. Controls scrolled out of reach are exactly the bug this prevents:
  paging through 25 rows shouldn't mean scrolling 1,800px to find "next page".
- Reset the container to the top when its contents are replaced (page change,
  filter change, new query), or page 2 opens halfway down.
- Leave room for the scrollbar (`pr-1`) so it doesn't sit on top of row content.
- Wide content (tables, code, long URLs) scrolls sideways inside its own
  `overflow-x-auto` container; the page body never scrolls horizontally.

`/radio` already applies this at screen level — the masthead, section tabs and
category chips are fixed furniture and the station grid owns the only
scrollbar. Any panel that can fill up gets the same treatment.

# React Hooks & Code Standards

- Always wrap functions in `useCallback` when they are passed as dependencies to `useEffect` or other hooks to prevent cascading triggers and maintain reference stability.
- Adhere to ESLint rules like `react-hooks/exhaustive-deps` without exceptions.

# Tailwind CSS v4 Code Conventions

- Prefer native/utility values over arbitrary values:
  - Write `aspect-video` instead of `aspect-[16/9]`.
  - Write `bg-linear-to-b` instead of `bg-gradient-to-b` (using the new Tailwind v4 syntax for linear gradients).
  - Write opacity fractions directly: e.g. `bg-white/10` instead of `bg-white/[0.1]`, `border-white/4` instead of `border-white/[0.04]`, and `w-40` instead of `w-[160px]`.

# Franchise / Studio Theming & Consistency

- **Scroll Consistency:** Ensure themed franchise portals maintain their visual identity across the entire height of the page. Use tinted background bases (e.g., very dark themed solid backgrounds like `bg-[#0c0202]` overlayed with a top linear-to-b transparent gradient) rather than gradients that fade away to solid black.
- **Dynamic Action Styling:** Always dynamic-theme interactive components (such as "Load More" buttons, pagination spinners, movie tags, active back buttons, play button overlays) to use the active franchise's accent colors rather than defaulting to the global red accent.
