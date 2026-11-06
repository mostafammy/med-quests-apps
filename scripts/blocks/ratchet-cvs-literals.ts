/**
 * Technical Debt Ratchet Script
 * Ensures hardcoded 'cvs' literals in src/ do not increase beyond baseline threshold
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const srcDir = path.join(rootDir, 'src');

// Baseline locked down after SPEC-010 multi-block refactoring (reduced from 491)
const BASELINE_MAX_ALLOWED = 130;

console.log('🛡️  [MedQuests] Checking Technical Debt Ratchet for hardcoded \'cvs\' literals...\n');

function scanDirectory(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
        files = files.concat(scanDirectory(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = scanDirectory(srcDir);
let totalLiteralsFound = 0;
const fileCounts: Array<{ file: string; count: number }> = [];

// Matches 'cvs', "cvs", or `cvs`
const literalRegex = /['"`]cvs['"`]/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const matches = content.match(literalRegex);
  if (matches) {
    const count = matches.length;
    totalLiteralsFound += count;
    fileCounts.push({
      file: path.relative(rootDir, file),
      count,
    });
  }
}

fileCounts.sort((a, b) => b.count - a.count);

console.log(`📊 Scanned ${files.length} production source files.`);
console.log(`🔎 Total hardcoded 'cvs' literals found: ${totalLiteralsFound}`);
console.log(`🎯 Ratchet Baseline Maximum Allowed: ${BASELINE_MAX_ALLOWED}\n`);

if (fileCounts.length > 0) {
  console.log('Top files with hardcoded \'cvs\' literals:');
  fileCounts.slice(0, 5).forEach((item) => {
    console.log(`   ${item.count.toString().padStart(3, ' ')}  ${item.file}`);
  });
  console.log('');
}

if (totalLiteralsFound > BASELINE_MAX_ALLOWED) {
  console.error(
    `❌ RATCHET BREACH: Found ${totalLiteralsFound} literals, exceeding the maximum allowed threshold of ${BASELINE_MAX_ALLOWED}.`
  );
  console.error('   Curriculum block decoupling policy requires that new code does not introduce hardcoded block IDs.');
  process.exit(1);
} else {
  console.log(
    `✅ Ratchet passed! Current literals (${totalLiteralsFound}) ≤ maximum threshold (${BASELINE_MAX_ALLOWED}).`
  );
  process.exit(0);
}
