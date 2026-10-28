# Rule file — Motion and animation

Cinevo is cinematic. A new or changed UI element that does not move is a bug: every screen,
card, list and control ships with an entrance and interactive feedback.

1. **Library.** `motion` is installed. Client components import `{ motion, AnimatePresence }`
   from `motion/react`. Tailwind transitions and CSS keyframes cover simple hover and state
   changes; no second animation library.
2. **Entrance.** Content fades, slides or scales in on mount and on scroll into view; lists
   and grids stagger.
3. **Hover and press.** Every interactive element has a pointer transition — scale, lift,
   glow or colour.
4. **Mount and layout.** `AnimatePresence` for mount/unmount; `layout` for reordering.
5. **Micro-interactions.** Loaders, toggles, dropdowns, overlays, skeletons and feedback
   states animate.
6. **Feel.** Spring or ease-out, 150–400ms, subtle stagger. Animate `transform` and `opacity`
   only; never width, height or another layout-triggering property.
7. **Reduced motion.** Non-essential motion is gated behind `prefers-reduced-motion`.
