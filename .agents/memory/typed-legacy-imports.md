---
name: Typed imports from legacy JavaScript
description: TypeScript declaration patterns for preserving existing JavaScript and JSX modules at app boundaries.
---

When preserving `.jsx` source, include the `.jsx` suffix in the TypeScript import so a `declare module '*.jsx'` declaration applies. For a specific `.js` module, use a companion `.d.ts` that directly exports the module's type; a wildcard ambient declaration in that same-named file can be resolved as an empty module and produce TS2306.

**Why:** This workspace only typechecked after the JSX wildcard declaration and the Express app's direct module declaration were separated.

**How to apply:** At TypeScript boundaries around preserved JavaScript, match the import specifier and declaration shape, then rerun the package typecheck.