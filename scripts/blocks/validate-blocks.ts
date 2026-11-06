/**
 * Build-Time Taxonomy Integrity CLI Runner
 * Validates all content packs against TI-1 through TI-9
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TaxonomyIntegrityValidator } from '../../src/domain/curriculum/TaxonomyIntegrityValidator.ts';
import type { BlockManifest } from '../../src/domain/curriculum/schemas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const contentDir = path.join(rootDir, 'content');

console.log('🔍 [MedQuests] Validating Curriculum Block Packs against TI-1..TI-9...\n');

if (!fs.existsSync(contentDir)) {
  console.error(`❌ Content directory not found: ${contentDir}`);
  process.exit(1);
}

const blockDirs = fs
  .readdirSync(contentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const validator = new TaxonomyIntegrityValidator();
const loadedManifests: BlockManifest[] = [];
let totalErrors = 0;
let totalWarnings = 0;

for (const blockId of blockDirs) {
  const manifestPath = path.join(contentDir, blockId, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Block directory '${blockId}' has no manifest.json, skipping.`);
    continue;
  }

  try {
    const rawContent = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(rawContent);

    const result = validator.validateManifest(parsed);
    if (!result.ok) {
      console.error(`❌ Block '${blockId}' failed manifest validation:`);
      for (const v of result.violations) {
        console.error(`   [${v.invariant}] ${v.path}: ${v.message}`);
        totalErrors += 1;
      }
    } else {
      loadedManifests.push(result.value);
      console.log(`✅ Block '${blockId}' passed manifest validation (${result.value.block.name.en} - ${result.value.block.code})`);
      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.warn(`   ⚠️  [${w.invariant}] ${w.path}: ${w.message}`);
          totalWarnings += 1;
        }
      }

      // Check question bank if exists
      const bankPath = path.join(contentDir, blockId, 'dist', 'bank.v1.json');
      if (fs.existsSync(bankPath)) {
        try {
          const bankRaw = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
          if (Array.isArray(bankRaw)) {
            const { resolvable, orphans } = validator.partitionBank(result.value, bankRaw);
            if (orphans.length > 0) {
              console.error(`   ❌ [TI-8] Found ${orphans.length} orphan questions in '${bankPath}':`);
              orphans.slice(0, 5).forEach((q: any) => {
                console.error(`      - Question '${q.id}' (subj: '${q.subjectId}', chap: '${q.chapterId}', topic: '${q.topicId}')`);
              });
              if (orphans.length > 5) {
                console.error(`      ... and ${orphans.length - 5} more.`);
              }
              totalErrors += orphans.length;
            } else {
              console.log(`   📦 Bank verified: ${resolvable.length} questions mapped with zero orphans.`);
            }
          }
        } catch (bankErr: any) {
          console.error(`   ❌ Error reading bank.v1.json: ${bankErr.message}`);
          totalErrors += 1;
        }
      }
    }
  } catch (err: any) {
    console.error(`❌ Error parsing manifest for '${blockId}': ${err.message}`);
    totalErrors += 1;
  }
}

// Cross-pack catalog uniqueness check
if (loadedManifests.length > 1) {
  const catalogViolations = validator.validateCatalog(loadedManifests);
  if (catalogViolations.length > 0) {
    console.error(`\n❌ Catalog cross-pack validation failed:`);
    for (const v of catalogViolations) {
      console.error(`   [${v.invariant}] Block '${v.blockId}' ${v.path}: ${v.message}`);
      totalErrors += 1;
    }
  } else {
    console.log(`\n🌐 Catalog cross-pack integrity verified across ${loadedManifests.length} blocks.`);
  }
}

console.log('\n------------------------------------------------------------');
if (totalErrors > 0) {
  console.error(`🚨 Validation FAILED with ${totalErrors} error(s) and ${totalWarnings} warning(s).`);
  process.exit(1);
} else {
  console.log(`✨ All curriculum blocks passed validation successfully with ${totalWarnings} warning(s).`);
  process.exit(0);
}
