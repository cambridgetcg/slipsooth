# slipsooth

**A word, read straight.** Drop a word in and slipsooth unfolds the truth folded inside it — the parts, the literal shape, the buried gem. It cites every unfolding, and it will never invent one.

Live: **[slipsooth.pages.dev](https://slipsooth.pages.dev)** · Captioneer's twin — **[captioneer.io](https://captioneer.io)**

---

## The idea

The people who made words folded meaning inside them — 學問 is literally 學 (learn) + 問 (ask); *entertain* is Latin *inter* + *tenēre*, "to hold each other"; *matrix* is the womb, not the prison. Then a few thousand years of use forgot. Slipsooth reads the word straight and hands the fold back.

It is **captioneer's twin**:

- **captioneer** catches the lie folded into a *sentence* (verisleight — truth arranged to mislead).
- **slipsooth** recovers the truth folded into a *word* (slipsooth — truth a slip or a drift accidentally digs back up).

One is defence, one is recovery. Both live by the same rule.

## The charter

**A machine that recovers truth from words is not allowed to fake one.** A made-up etymology is exactly the verisleight this tool exists to catch. So:

- Every unfolding declares a **register** and **cites a source**.
- If it can't be sourced, slipsooth says *"I can't source that"* rather than hand you a lie that reads well.
- The **folk** entries are the proof of good faith: `sincere`, `sirloin`, `明`, `忙` are beautiful decompositions that are **false** — kept on purpose, flagged, and corrected with the real story.

## Registers

| Badge | Means |
|---|---|
| **etymon** | Verified word etymology — cited (etymonline / Wiktionary). |
| **glyph** | Single-character composition (六書) — how the strokes were built. |
| **kingdom** | A YOUSPEAK coinage or the kingdom's own lore — labelled as *made*, never as history. |
| **folk** | Beautiful, and false. Shown, flagged, corrected. |

The v0.1 seed (17 unfoldings) was fact-checked against etymonline, Wiktionary, and 說文解字 on 2026-07-12. Two claims were corrected in the process and kept honest: 學問 is a compound *word*, not a 六書 character; 明 is canonically 月 (moon) + 囧 (window), "moonlight through a lattice" — the familiar 日+月 "sun and moon" is a later reanalysis, a slipsooth the character lived through itself.

## Build

```sh
npm run build     # validate the charter, regenerate public/words.gen.js
npm run deploy    # build + cloudflare pages deploy (maintainers)
```

No dependencies. The unfolder runs entirely in the browser. The lexicon (`data/words.json`) is the ground truth; the page is a consumer.

## Layout

```
data/words.json     the lexicon — one entry per word, register + source required
tools/build.mjs     validates the charter, emits public/words.gen.js
public/index.html   the surface (client-side unfolder)
public/words.gen.js GENERATED — do not edit by hand
```

## Add a word

Every entry needs a real, citable source. Folk entries need both the seductive false reading and the true correction. Open a PR against `data/words.json`; `npm run build` enforces the charter. A word without a citation does not ship.

Part of the kingdom — [the cathedral](https://ai-love.cc) · [captioneer](https://captioneer.io). It catches **verisleight** and leaves you **orthophanes** — the rightness made plainly visible.
