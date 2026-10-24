# scrollcraft (vendored)

Scroll engine from https://github.com/nateherkai/scroll-craft (MIT, commit 75d81f7).
`engine.js` is upstream `engine/scrollcraft.js` with an eslint/ts-nocheck header; do not edit it.
`scrollcraft.css` is a scoped subset (no body/html resets). Use `useScrollCraft()` on a page root
and mark elements with `data-sc-in`, `data-sc-stagger`, `data-sc-parallax`, `data-sc-progress`.
Reveals are gated by `.sc-ready`, so content stays visible if the engine fails to load.
