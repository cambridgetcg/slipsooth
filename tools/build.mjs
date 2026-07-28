// Build: data/words.json → public/words.gen.js, enforcing the charter.
// The charter: a machine that recovers truth from words may not itself fake one.
// So every entry MUST declare a register and cite a source; every "folk"
// (beautiful-but-false) entry MUST carry both the folk reading and the truth.
// Run `npm run build` after any edit, then deploy.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lex = JSON.parse(readFileSync(join(root, "data/words.json"), "utf8"));

const REGISTERS = new Set(["etymon", "glyph", "kingdom"]);
const problems = [];
const seen = new Set();

for (const w of lex.words) {
  const id = w.word || "(missing word)";
  if (!w.word) problems.push(`entry missing "word"`);
  if (seen.has(w.word)) problems.push(`${id}: duplicate word`);
  seen.add(w.word);
  if (!REGISTERS.has(w.register)) problems.push(`${id}: register must be one of ${[...REGISTERS].join("/")}`);
  if (!w.source) problems.push(`${id}: every unfolding must cite a source (the anti-fake rule)`);
  if (!w.lang) problems.push(`${id}: missing lang`);

  if (w.caution === "folk") {
    // a flagged false decomposition must carry BOTH the seductive folk reading and the real correction
    if (!w.folk || !Array.isArray(w.folk.parts) || !w.folk.gem) {
      problems.push(`${id}: caution:folk needs folk.parts + folk.gem (the beautiful-but-false reading)`);
    }
    if (!w.truth) problems.push(`${id}: caution:folk needs a "truth" — the real story it corrects to`);
  } else {
    if (!Array.isArray(w.parts) || !w.parts.length) problems.push(`${id}: needs parts[]`);
    if (!w.gem) problems.push(`${id}: needs a gem (the recovered truth)`);
    if (!w.literal) problems.push(`${id}: needs a literal reading`);
  }

  // a verified etymon may not be presented as certain if the source hedges — surface that as prose, not schema,
  // but at minimum kingdom entries must never masquerade as history:
  if (w.register === "kingdom" && /etymonline|OED|說文|漢典/i.test(w.source || "")) {
    problems.push(`${id}: kingdom register cites an academic source — kingdom lore must be labelled as coined, not history`);
  }
}

if (problems.length) {
  console.error("charter validation failed:\n  " + problems.join("\n  "));
  process.exit(1);
}

const payload = { version: lex.version, updated: lex.updated, note: lex.note, words: lex.words };
const js = `/* GENERATED from data/words.json v${lex.version} — do not edit by hand; run \`npm run build\`.
 * Charter: every unfolding cites its source; every folk reading is flagged and corrected.
 * A truth-recovery tool is not allowed to fake one. */
window.SLIPSOOTH = ${JSON.stringify(payload)};
`;
writeFileSync(join(root, "public/words.gen.js"), js);

// ── static per-word pages: the lexicon steps out of the JS bundle ────────────
// Same charter, second surface. Each page renders ONLY what data/words.json
// holds — word, parts, literal, gem, folk flag, truth, citation — as plain
// server-rendered HTML, so a crawler that never runs JS reads the same
// unfoldings a human does. Invent nothing; cite or don't ship.

const SITE = "https://slipsooth.pages.dev";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const REG_LABEL = { etymon: "verified etymology", glyph: "the character", kingdom: "kingdom · coined", folk: "folk · false" };

const slugOf = w => String(w).trim().toLowerCase()
  .replace(/[\/\s·]+/g, "-")
  .replace(/[^\p{L}\p{N}-]/gu, "")
  .replace(/-+/g, "-").replace(/(^-|-$)/g, "");

const slugs = new Map(); // slug → word
for (const w of lex.words) {
  const s = slugOf(w.word);
  if (!s) { console.error(`${w.word}: word slugs to nothing`); process.exit(1); }
  if (slugs.has(s)) { console.error(`${w.word}: slug "${s}" collides with ${slugs.get(s).word}`); process.exit(1); }
  slugs.set(s, w);
}

// citations: link the linkable (a bare domain/path like etymonline.com/word/x),
// keep the rest — Wiktionary, 說文解字, YOUSPEAK canon — as visible text.
const URL_RE = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s),;]*)?)/gi;
const citeHTML = source => String(source).split(URL_RE).map((bit, i) =>
  i % 2
    ? `<a href="${esc(/^https?:\/\//i.test(bit) ? bit : "https://" + bit)}" rel="noopener">${esc(bit)}</a>`
    : esc(bit)
).join("");

const partsHTML = parts => parts.map((p, i) =>
  `${i ? '<span class="plus">+</span>' : ""}<div class="part"><div class="f">${esc(p.form)}</div><div class="g">${esc(p.gloss)}</div></div>`
).join("");

const descOf = w => {
  const raw = w.caution === "folk"
    ? `Folk etymology, flagged and corrected. ${w.truth}`
    : `${w.literal}. ${w.gem}`;
  const flat = String(raw).replace(/\s+/g, " ").trim();
  return flat.length <= 158 ? flat : flat.slice(0, 157).replace(/\s+\S*$/u, "") + "…";
};

// the site's own visual language (public/index.html), trimmed to what a
// static reading page needs — same fonts, same palette, no JS anywhere.
const PAGE_CSS = `
  :root {
    --paper:#f2f1ea; --card:#fbfaf5; --sunk:#eceadf; --ink:#18180f; --ink-soft:#55554a;
    --faint:#8d8b7c; --rule:#dcdacd; --rule-soft:#e6e4d8; --stamp:#bd3a2c; --hl:#eac712;
    --hl-wash:rgba(234,199,18,.34);
    --etymon:#2b7690; --glyph:#367f52; --kingdom:#bd3a2c; --folk:#b07d1e;
    --shadow:0 1px 0 rgba(0,0,0,.04),0 18px 40px -28px rgba(0,0,0,.35);
    --serif:"Spectral",Georgia,serif; --display:"Bricolage Grotesque",system-ui,sans-serif; --mono:"JetBrains Mono",ui-monospace,monospace;
  }
  @media (prefers-color-scheme: dark){
    :root{ --paper:#15150e; --card:#1d1d15; --sunk:#12120c; --ink:#eceadc; --ink-soft:#b1ae9d; --faint:#77756a;
      --rule:#2c2b21; --rule-soft:#24241b; --stamp:#e0614f; --hl:#ecc824; --hl-wash:rgba(236,200,36,.16);
      --etymon:#58a7c4; --glyph:#61b583; --kingdom:#e0614f; --folk:#d6a648;
      --shadow:0 1px 0 rgba(255,255,255,.02),0 18px 44px -26px rgba(0,0,0,.7); }
  }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:var(--serif); font-size:17.5px; line-height:1.62; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
  body::before { content:""; position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.5;
    background-image:radial-gradient(var(--rule) .5px,transparent .5px); background-size:22px 22px; mix-blend-mode:multiply; }
  @media (prefers-color-scheme: dark){ body::before{ mix-blend-mode:screen; opacity:.25; } }
  main, header, footer { position:relative; z-index:1; }
  ::selection { background:var(--hl); color:#18180f; }
  .wrap { width:100%; max-width:920px; margin:0 auto; padding:0 24px; }
  a { color:var(--stamp); text-decoration:none; }
  a:hover { text-decoration:underline; }
  header .wrap { display:flex; align-items:center; justify-content:space-between; gap:10px; padding-top:22px; padding-bottom:18px; border-bottom:1px solid var(--rule); flex-wrap:wrap; }
  .brand { display:flex; align-items:baseline; gap:11px; font-family:var(--display); font-weight:800; font-size:20px; letter-spacing:-.02em; color:var(--ink); }
  .brand .tw { font-family:var(--mono); font-weight:400; font-size:10.5px; color:var(--faint); letter-spacing:.1em; text-transform:uppercase; }
  .pillbtn { border:1px solid var(--rule); border-radius:30px; padding:7px 12px; font-family:var(--mono); font-size:11px; color:var(--ink-soft); letter-spacing:.06em; display:inline-block; }
  .pillbtn:hover { border-color:var(--ink-soft); text-decoration:none; }
  .crumb { font-family:var(--mono); font-size:11.5px; letter-spacing:.06em; color:var(--faint); margin:34px 0 18px; }
  .card { background:var(--card); border:1px solid var(--rule); border-radius:14px; box-shadow:var(--shadow); overflow:hidden; margin:0 0 26px; }
  .card .top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 24px; border-bottom:1px solid var(--rule-soft); flex-wrap:wrap; }
  .badge { font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; border-radius:5px; padding:4px 9px; color:#fff; white-space:nowrap; }
  .badge.etymon { background:var(--etymon); } .badge.glyph { background:var(--glyph); }
  .badge.kingdom { background:var(--kingdom); } .badge.folk { background:var(--folk); color:#18180f; }
  .top .lang { font-family:var(--mono); font-size:10.5px; color:var(--faint); letter-spacing:.1em; text-transform:uppercase; }
  h1.head-word { font-family:var(--display); font-weight:800; font-size:clamp(2rem,6vw,3.2rem); letter-spacing:-.03em; padding:26px 24px 6px; margin:0; line-height:1; }
  .zh h1.head-word { font-family:var(--serif); font-weight:600; letter-spacing:0; }
  .parts { display:flex; align-items:stretch; gap:12px; flex-wrap:wrap; padding:8px 24px 4px; }
  .part { background:var(--sunk); border:1px solid var(--rule-soft); border-radius:10px; padding:12px 16px; min-width:96px; }
  .part .f { font-family:var(--display); font-weight:700; font-size:1.35rem; letter-spacing:-.01em; color:var(--ink); }
  .zh .part .f { font-family:var(--serif); font-weight:600; }
  .part .g { font-family:var(--mono); font-size:11px; color:var(--ink-soft); margin-top:4px; line-height:1.4; }
  .plus { align-self:center; font-family:var(--display); font-weight:700; font-size:1.4rem; color:var(--faint); }
  .literal { padding:12px 24px 2px; font-family:var(--mono); font-size:12.5px; letter-spacing:.02em; color:var(--stamp); }
  .literal::before { content:"→ "; opacity:.6; }
  .gem { padding:14px 24px 26px; font-size:clamp(1.08rem,2.2vw,1.32rem); line-height:1.5; color:var(--ink); max-width:64ch; }
  .src { padding:0 24px 22px; font-family:var(--mono); font-size:11px; color:var(--faint); line-height:1.5; }
  .src .lab { opacity:.7; }
  .src a { color:var(--ink-soft); text-decoration:underline; }
  .folk-label { font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--folk); padding:16px 24px 0; }
  .folk-gem { padding:8px 24px 4px; font-size:1.06rem; line-height:1.5; color:var(--ink-soft); font-style:italic; max-width:64ch; }
  .truth { margin:14px 24px 24px; padding:16px 20px; border-left:3px solid var(--stamp); background:var(--sunk); border-radius:0 10px 10px 0; }
  .truth .t { font-family:var(--mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--stamp); margin-bottom:8px; }
  .truth p { margin:0; font-size:1rem; line-height:1.55; color:var(--ink); }
  .backline { font-size:.98rem; color:var(--ink-soft); margin:0 0 10px; }
  h1.shelf-h { font-family:var(--display); font-weight:700; font-size:clamp(1.8rem,4.5vw,2.6rem); letter-spacing:-.02em; margin:0; line-height:1.05; }
  .sec-note { font-family:var(--mono); font-size:11.5px; color:var(--faint); margin:10px 0 24px; }
  ul.shelf { list-style:none; margin:0 0 26px; padding:0; display:flex; flex-direction:column; gap:10px; }
  ul.shelf li { background:var(--card); border:1px solid var(--rule); border-radius:11px; box-shadow:var(--shadow); }
  ul.shelf a { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; padding:15px 18px; color:var(--ink); }
  ul.shelf a:hover { text-decoration:none; border-color:var(--stamp); }
  ul.shelf .w { font-family:var(--display); font-weight:700; font-size:1.2rem; letter-spacing:-.01em; }
  ul.shelf li.zh .w { font-family:var(--serif); font-weight:600; }
  ul.shelf .r { font-family:var(--mono); font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; display:flex; align-items:center; gap:5px; color:var(--faint); }
  ul.shelf .r .d { width:6px; height:6px; border-radius:50%; display:inline-block; }
  ul.shelf .lit { font-size:.92rem; color:var(--ink-soft); font-style:italic; }
  footer { border-top:1px solid var(--rule); margin-top:60px; padding:34px 0 58px; color:var(--faint); font-size:13.5px; }
  footer .wrap { display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; align-items:center; }
  footer .mono { font-family:var(--mono); font-size:11px; letter-spacing:.03em; }
  footer b { color:var(--ink-soft); font-weight:600; }
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />`;

const shell = ({ title, desc, canonical, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${esc(canonical)}" />
${FONTS}
<style>${PAGE_CSS}</style>
</head>
<body>
<header>
  <div class="wrap">
    <a class="brand" href="/">slipsooth <span class="tw">captioneer's twin</span></a>
    <a class="pillbtn" href="/words/">the shelf — all words</a>
  </div>
</header>
<main>
  <div class="wrap">
${body}
  </div>
</main>
<footer>
  <div class="wrap">
    <div><b>slipsooth</b> — the truth folded into a word. verisleight's mirror-twin.</div>
    <div class="mono"><a href="/">the desk</a> · <a href="https://captioneer.io">captioneer</a> · <a href="https://github.com/cambridgetcg/slipsooth">open source ↗</a></div>
  </div>
</footer>
</body>
</html>
`;

const wordPage = (w, slug) => {
  const reg = w.caution === "folk" ? "folk" : w.register;
  const zh = (w.lang === "zh" || w.lang === "yue") ? " zh" : "";
  const inner = w.caution === "folk"
    ? `<div class="folk-label">the story everyone tells</div>
    <div class="parts">${partsHTML(w.folk.parts)}</div>
    ${w.folk.literal ? `<div class="literal">${esc(w.folk.literal)}</div>` : ""}
    <div class="folk-gem">${esc(w.folk.gem)}</div>
    <div class="truth"><div class="t">but read it straight</div><p>${esc(w.truth)}</p></div>`
    : `<div class="parts">${partsHTML(w.parts)}</div>
    <div class="literal">${esc(w.literal)}</div>
    <div class="gem">${esc(w.gem)}</div>`;
  const body = `    <p class="crumb"><a href="/">the desk</a> · <a href="/words/">the shelf</a> · ${esc(w.word)}</p>
    <article class="card${zh}">
      <div class="top"><span class="badge ${reg}">${esc(REG_LABEL[reg] || reg)}</span><span class="lang">${esc(w.lang)}</span></div>
      <h1 class="head-word">${esc(w.word)}</h1>
      ${inner}
      <div class="src"><span class="lab">source ·</span> ${citeHTML(w.source)}</div>
    </article>
    <p class="backline"><a href="/">← back to the desk</a> to unfold it live, or browse <a href="/words/">every word on the shelf</a>.</p>`;
  return shell({
    title: `${w.word} · slipsooth — a word, read straight`,
    desc: descOf(w),
    canonical: `${SITE}/words/${encodeURIComponent(slug)}.html`,
    body,
  });
};

const collate = new Intl.Collator("en").compare;
const shelfItems = [...slugs.entries()].sort((a, b) => collate(a[1].word, b[1].word)).map(([slug, w]) => {
  const reg = w.caution === "folk" ? "folk" : w.register;
  const zh = (w.lang === "zh" || w.lang === "yue") ? ' class="zh"' : "";
  const lit = w.caution === "folk" ? (w.folk.literal || "") : w.literal;
  return `      <li${zh}><a href="/words/${encodeURIComponent(slug)}.html"><span class="w">${esc(w.word)}</span><span class="r"><span class="d" style="background:var(--${reg})"></span>${esc(REG_LABEL[reg] || reg)}</span><span class="lit">${esc(lit)}</span></a></li>`;
}).join("\n");

const indexPage = shell({
  title: "The shelf · slipsooth — every word, unfolded and cited",
  desc: `All ${lex.words.length} unfoldings in the slipsooth lexicon — verified etymologies, character compositions, kingdom coinages, and flagged folk etymologies. Every one cites its source; none is invented.`,
  canonical: `${SITE}/words/`,
  body: `    <p class="crumb"><a href="/">the desk</a> · the shelf</p>
    <h1 class="shelf-h">The shelf</h1>
    <p class="sec-note">${lex.words.length} unfoldings · every one sourced · folk readings flagged and corrected</p>
    <ul class="shelf">
${shelfItems}
    </ul>
    <p class="backline">A machine that recovers truth from words is not allowed to fake one — each page below cites its source, and the beautiful-but-false readings say so on their face. <a href="/">Back to the desk →</a></p>`,
});

const wordsDir = join(root, "public/words");
rmSync(wordsDir, { recursive: true, force: true });
mkdirSync(wordsDir, { recursive: true });
for (const [slug, w] of slugs) writeFileSync(join(wordsDir, `${slug}.html`), wordPage(w, slug));
writeFileSync(join(wordsDir, "index.html"), indexPage);

// sitemap: regenerated from what was actually emitted — / stays, /words/* follows the data.
const smEntries = [
  `  <url><loc>${SITE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  `  <url><loc>${SITE}/words/</loc><lastmod>${lex.updated}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
  ...[...slugs.keys()].map(slug =>
    `  <url><loc>${SITE}/words/${encodeURIComponent(slug)}.html</loc><lastmod>${lex.updated}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`),
];
writeFileSync(join(root, "public/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${smEntries.join("\n")}
</urlset>
`);

const byReg = {};
for (const w of lex.words) byReg[w.register] = (byReg[w.register] || 0) + 1;
const folk = lex.words.filter(w => w.caution === "folk").length;
console.log(`words.gen.js: v${lex.version} — ${lex.words.length} unfoldings (` +
  Object.entries(byReg).map(([r, n]) => `${n} ${r}`).join(", ") + `, of which ${folk} flagged folk)`);
console.log(`words/: ${slugs.size} static pages + index.html — the lexicon steps out of the JS bundle`);
console.log(`sitemap.xml: ${smEntries.length} urls`);
