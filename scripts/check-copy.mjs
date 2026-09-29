// Dev utility: scan the repo for corrupted copy (CJK glyphs, glued words, stray symbols).
// Run with: node scripts/check-copy.mjs
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED = new Set([...'áéíóúüñÁÉÍÓÚÜÑ¿¡—–·“”‘’…'.split('')]);

const SUSPECT_WORDS = ['Eat 5', 'TheProgesterone', 'weigh-weigh', 'zh_cn'];

const roots = process.argv.slice(2);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|json|md|html|css)$/.test(entry.name)) files.push(full);
  }
}

for (const root of roots) {
  if (fs.statSync(root).isFile()) files.push(root);
  else walk(root);
}

let issues = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const found = new Set();

  for (const char of content) {
    const code = char.codePointAt(0);
    if (code > 127 && !ALLOWED.has(char)) found.add(`glyph ${char} U+${code.toString(16)}`);
  }

  for (const word of SUSPECT_WORDS) {
    if (content.includes(word)) found.add(`suspect ${word.trim()}`);
  }

  // A pipe glued to a word inside a string literal is a corruption artifact.
  const literals = [...content.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)];
  for (const match of literals) {
    const literal = match[1] ?? match[2] ?? '';
    if (/\|\s*[A-Za-z]/.test(literal) || /\s\|\s*/.test(literal)) {
      found.add(`pipe inside text: "${literal.slice(0, 40)}"`);
    }
    if (/[|*]{2,}/.test(literal)) found.add('placeholder brackets in text');
  }

  if (found.size > 0) {
    issues += 1;
    console.log(`\n${path.relative(process.cwd(), file)}`);
    for (const item of found) console.log(`  - ${item}`);
  }
}

console.log(issues === 0 ? '\nCopy check: OK' : `\nCopy check: ${issues} file(s) need review`);
