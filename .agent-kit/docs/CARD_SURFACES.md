# Card surfaces

Every media card in the app, its owner and whether it carries the reusable decay border.
The border is `src/components/media/DecayBorder.tsx`: Theme Studio → Card effect → Decay
draws a 1–12px accent ring masked by an SVG-noise alpha mask, blended with the poster.
A shared 10fps drift plus the pointer position move the mask.

**Load it when** — a change touches a media card and you need to know every place the card
treatment lives. When the owner says "all the cards", wire the `no` rows here and flip them.

| Surface | Owner | Decay border |
|---|---|---|
| Home poster rows | `src/components/dashboard/MediaCarousel.tsx` (`PosterCard`) | yes |
| Home See All grid | `src/components/dashboard/MediaCarousel.tsx` (full-screen grid) | no |
| Genre rail | `src/components/dashboard/GenreSection.tsx` | yes |
| Continue Watching | `src/components/dashboard/ContinueWatching.tsx` | yes |
| Daily Five (revealed card) | `src/components/dashboard/DailyFive.tsx` | yes |
| Cast portraits | `src/components/watch/CastSection.tsx` | yes |
| More Like This | `src/components/watch/detail/SimilarTitles.tsx` | yes |
| Person Known For | `src/app/person/[id]/page.tsx` | yes |
| Wishlist grid | `src/components/wishlist/WishlistGrid.tsx` | no |
| Search results | `src/components/search/SearchClient.tsx` | no |
| Browse grid | `src/components/dashboard/BrowseSection.tsx` | no |
| History | `src/components/history/HistoryClient.tsx` | no |
| Personal hub | `src/components/dashboard/PersonalHub.tsx` | no |
| Top 10 row | `src/components/dashboard/TopTenRow.tsx` | no |
| Reveal / Mystery | `src/components/reveal/HoloCard.tsx`, `src/components/reveal/RevealClient.tsx` | no |
| Clone detail cards | `src/components/experience/DetailPage.tsx` | no |
| Hero slides | `src/components/dashboard/HeroCarousel.tsx`, `SwapCard.tsx` | hero CardSwap, not decay |
| Brand rail | `src/components/dashboard/BrandRail.tsx` | brand tiles, not media |
| Radio stations | `src/components/radio/StationCard.tsx` | non-media |
| Profile/admin panels | `src/components/profile/PanelCard.tsx` and friends | non-media |
