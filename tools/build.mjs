// Build: data/words.json → public/words.gen.js, enforcing the charter.
// The charter: a machine that recovers truth from words may not itself fake one.
// So every entry MUST declare a register and cite a source; every "folk"
// (beautiful-but-false) entry MUST carry both the folk reading and the truth.
// Run `npm run build` after any edit, then deploy.
import { readFileSync, writeFileSync } from "node:fs";
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

const byReg = {};
for (const w of lex.words) byReg[w.register] = (byReg[w.register] || 0) + 1;
const folk = lex.words.filter(w => w.caution === "folk").length;
console.log(`words.gen.js: v${lex.version} — ${lex.words.length} unfoldings (` +
  Object.entries(byReg).map(([r, n]) => `${n} ${r}`).join(", ") + `, of which ${folk} flagged folk)`);
