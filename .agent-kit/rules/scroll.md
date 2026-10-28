# Rule file — Scroll containment

A long list belongs to its panel, not to the page. The page must not grow with the data.

1. **Bound the scrolling element** (`max-h-[60vh]` or a `calc()` against the viewport) and
   give it `overflow-y-auto` **and** `overscroll-contain`.
2. **Keep the frame outside the container.** Panel header, search box, filter tabs and
   pagination stay on screen; paging 25 rows never means scrolling 1,800px to "next page".
3. **Reset the container to the top** when its contents are replaced — page change, filter
   change, new query.
4. **Leave room for the scrollbar** (`pr-1`) so it does not sit on row content.
5. **Wide content scrolls sideways in its own `overflow-x-auto` container**; the page body
   never scrolls horizontally.
6. **`/radio` is the reference:** masthead, section tabs and category chips are fixed
   furniture; the station grid owns the only scrollbar.
