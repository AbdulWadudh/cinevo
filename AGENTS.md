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
