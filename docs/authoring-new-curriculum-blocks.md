# Authoring New Curriculum Blocks: Architectural Specification & Faculty Guide
**MedQuests Medical Education Platform**  
*Document Version: 1.0.0 — SPEC-010 Clean Multi-Block Architecture*  
*Standard: Apple Executive Board Engineering Guidelines (Clean Architecture, SOLID, Zero-Downtime, 100% UI/UX Reliability)*

---

## 1. Executive Summary & Architectural Vision

The MedQuests Multi-Block Curriculum Architecture enables the platform to host multiple independent medical organ system blocks (e.g., Cardiovascular System `cvs`, Central Nervous System `cns`, Respiratory System `res`, etc.) simultaneously. Each block encapsulates its own:
- **Hierarchical Taxonomy**: Subjects (e.g., Anatomy, Physiology, Histology, Pathology, Pharmacology) → Chapters → Topics.
- **Bilingual Identity**: Complete English and Arabic (`en` & `ar`) localization for all block titles, descriptions, subjects, chapters, and topics.
- **Isolated Question Bank**: Lazy-loaded, code-split JSON artifacts with zero startup overhead for other blocks.
- **AI Copilot Persona & Specialized Clinical Tools**: Domain-specific Socratic faculty mentor personas (e.g., Clinical Cardiologist vs. Socratic Neuroscience Mentor) and gated autonomous tools (e.g., Pressure-Volume loops restricted to CVS).
- **Independent Learner History**: Block-isolated attempt tracking, SM-2 spaced repetition cards, and chapter mastery scores, while preserving the user's global streak.

---

## 2. Invariants & Quality Standards (`TI-1` Through `TI-9`)

Every new curriculum block must strictly satisfy the 9 Taxonomy Invariants enforced at build time via `npm run blocks:validate`:

| Invariant | Name | Rule & Validation Contract |
| :--- | :--- | :--- |
| **`TI-1`** | **Manifest Structure** | `content/<blockId>/manifest.json` must conform strictly to `BlockManifestSchema` (`zod`). |
| **`TI-2`** | **Block ID Match** | Directory slug `content/<blockId>/` must match `manifest.block.id` exactly (lowercase slug, 2–12 chars: `^[a-z][a-z0-9]{1,11}$`). |
| **`TI-3`** | **Bilingual Completeness** | Block, Subject, Chapter, and Topic `name` fields must contain both non-empty English (`en`) and Arabic (`ar`) strings. |
| **`TI-4`** | **Presentation Glyphs** | `manifest.block.presentation.glyph` must be a valid Lucide icon name (`heart`, `brain`, `lungs`, `dna`, `microscope`, `stethoscope`, `activity`, `flask-conical`). |
| **`TI-5`** | **Accent Tokens** | `manifest.block.presentation.accent` must be an approved CSS color token (`rose`, `violet`, `sky`, `emerald`, `amber`, `indigo`, `purple`, `teal`). |
| **`TI-6`** | **Hierarchy Integrity** | Every chapter must point to a valid `subjectId` declared in the block; every topic must point to a valid `chapterId` in that chapter. |
| **`TI-7`** | **Unique Identifiers** | All subject IDs, chapter IDs, and topic IDs must be globally unique across the entire catalog. |
| **`TI-8`** | **Zero Question Orphans** | Every question in `bank.v1.json` must have valid `subjectId`, `chapterId`, and `topicId` mapped in the manifest. |
| **`TI-9`** | **Psychometric Standards** | Every question must have exactly 4 choices (`a`, `b`, `c`, `d`), exactly 1 correct answer, choice entropy across options, and in-depth clinical rationales for all 4 options. |

---

## 3. Step-by-Step Block Authoring Guide

### Step 1: Create the Content Pack Directory

Create a dedicated folder for your block under `content/` with the designated lowercase slug:

```bash
mkdir -p content/cns/dist
```

### Step 2: Author `manifest.json`

Create `content/<blockId>/manifest.json`. Below is the canonical gold-standard template:

```json
{
  "schemaVersion": 1,
  "block": {
    "id": "cns",
    "code": "Block 207",
    "name": {
      "en": "Central Nervous System",
      "ar": "الجهاز العصبي المركزي"
    },
    "shortName": "CNS",
    "description": {
      "en": "Integrated Central Nervous System Block: Neuroanatomy, Neurophysiology, Neurohistology, Neuropathology, Microbiology & Neuropharmacology",
      "ar": "مجمع الجهاز العصبي المركزي: التشريح العصبي، الفسيولوجيا العصبية، الهستولوجيا، الباثولوجيا، الميكروبيولوجيا والفارماكولوجيا"
    },
    "status": "beta",
    "catalogOrder": 2,
    "presentation": {
      "glyph": "brain",
      "accent": "violet"
    },
    "aiProfileId": "cns-faculty-v1"
  },
  "subjects": [
    {
      "id": "anatomy",
      "name": {
        "en": "CNS Neuroanatomy & Embryology",
        "ar": "تشريح وأجنة الجهاز العصبي المركزي"
      },
      "order": 1
    },
    {
      "id": "physiology",
      "name": {
        "en": "CNS Neurophysiology",
        "ar": "فسيولوجيا الجهاز العصبي"
      },
      "order": 2
    }
  ],
  "chapters": [
    {
      "id": "cns-ana-cortex",
      "subjectId": "anatomy",
      "name": {
        "en": "Cerebral Cortex & White Matter Pathways",
        "ar": "القشرة المخية ومسارات المادة البيضاء"
      },
      "order": 1,
      "sourceIds": ["cns-lecture-01-cortex.pdf"]
    }
  ],
  "topics": [
    {
      "id": "cns-ana-cortex-broca-wernicke",
      "chapterId": "cns-ana-cortex",
      "name": {
        "en": "Broca, Wernicke & Language Circuits",
        "ar": "مناطق بروكا وفيرنيكه ودوائر اللغة"
      },
      "order": 1
    }
  ]
}
```

### Step 3: Initialize the Question Bank

Initialize an empty question bank array in `content/<blockId>/dist/bank.v1.json`:

```json
[]
```

When authoring questions (via **Question Studio** or the **AI Question Ingestion Lab**), ensure each question conforms to the schema:

```json
{
  "id": "q-cns-ana-0001",
  "blockId": "cns",
  "subjectId": "anatomy",
  "chapterId": "cns-ana-cortex",
  "topicId": "cns-ana-cortex-broca-wernicke",
  "concept": "Conduction Aphasia & Arcuate Fasciculus Lesion",
  "type": "single-best-answer",
  "stem": "A 62-year-old right-handed man presents with sudden inability to repeat spoken sentences...",
  "choices": [
    { "id": "a", "text": "Arcuate fasciculus damage", "isCorrect": true, "rationale": "Correct. Conduction aphasia is characterized by fluent speech and preserved comprehension with impaired repetition due to disruption of the arcuate fasciculus." },
    { "id": "b", "text": "Inferior frontal gyrus infarction", "isCorrect": false, "rationale": "Incorrect. Involves Broca's area, resulting in non-fluent expressive aphasia." },
    { "id": "c", "text": "Superior temporal gyrus ischemia", "isCorrect": false, "rationale": "Incorrect. Involves Wernicke's area, causing fluent aphasia with impaired comprehension." },
    { "id": "d", "text": "Corpus callosum anterior commisure", "isCorrect": false, "rationale": "Incorrect. Results in interhemispheric disconnection syndromes (alexia without agraphia), not conduction aphasia." }
  ],
  "explanation": "Conduction aphasia results from damage to the arcuate fasciculus connecting Wernicke and Broca areas...",
  "difficulty": 2,
  "cognitiveLevel": "understanding",
  "highYield": true,
  "origin": "authored-grounded",
  "evidence": [
    {
      "chunkId": "chk-cns-neuro-01",
      "sourceName": "Kandel's Principles of Neural Science, 6th Ed.",
      "location": "Chapter 59 (Language & Aphasias), p. 1354",
      "quote": "Damage to the arcuate fasciculus causes conduction aphasia characterized by normal comprehension and fluent speech but severely impaired repetition.",
      "kind": "text"
    }
  ],
  "status": "active",
  "bankVersion": 1
}
```

### Step 4: Register in `ViteBlockPackSource.ts`

Open `src/infrastructure/curriculum/ViteBlockPackSource.ts` and declare the eager manifest and lazy bank imports:

```typescript
// 1. Eager manifest import (<= 8 KB gz)
import cnsManifest from '../../../content/cns/manifest.json';

// 2. Add to manifest registry
this.manifests.set('cns' as BlockId, cnsManifest as unknown as BlockManifest);

// 3. Register code-split chunk loader
this.bankLoaders.set('cns' as BlockId, () =>
  import('../../../content/cns/dist/bank.v1.json').then((m) => m.default as unknown as readonly Question[])
);
```

### Step 5: Register AI Copilot Profile

In `src/domain/curriculum/BlockAiProfileRegistry.ts`, define your block's specialized clinical AI persona:

```typescript
export const DEFAULT_AI_PROFILES: Record<string, BlockAiProfile> = {
  // ...
  'cns-faculty-v1': {
    profileId: 'cns-faculty-v1',
    personaLabel: 'Socratic Neuroscience & Clinical Neurology Faculty Mentor',
    specialtyLabel: 'Clinical Neurology & Neuroanatomy',
    boardContext: 'USMLE Step 1, SMLE Neurology, and MBBS Neurosciences Block Examination',
    toolsetIds: ['neuro-localization', 'cranial-nerve-map'],
  },
};
```

### Step 6: Edge D1 Registry & Dark Launch Deployment

Add the block to Cloudflare D1 via an idempotent migration (e.g. `src/worker/migrations/0007_curriculum_blocks.sql`):

```sql
INSERT OR IGNORE INTO curriculum_blocks (id, code, short_name, name_en, name_ar, status, catalog_order)
VALUES ('cns', 'Block 207', 'CNS', 'Central Nervous System', 'الجهاز العصبي المركزي', 'beta', 2);

INSERT OR IGNORE INTO bank_revisions (block_id, revision_number, updated_at)
VALUES ('cns', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
```

#### Lifecycle Rollout Policy:
1. **`draft`**: Visible only in local development / staging environments.
2. **`beta` (Dark Launch)**: Visible and authorable only by users with `faculty-reviewer` or `admin` roles. Students see no disruption and cannot access the block.
3. **`published` (General Availability)**: Automatically revealed to all students in the Block Switcher within the 5-minute cache resolution window.
4. **`archived`**: Read-only historical block. Attempts preserved; question mutations rejected with `409 Conflict`.

---

## 4. Verification Quality Checklist

Before opening a pull request or promoting a block to `published`:

- [ ] **Run Taxonomy Validation**:
  ```bash
  npm run blocks:validate
  ```
  *Must exit with 0 errors and 0 warnings.*

- [ ] **Run Full Test Suite**:
  ```bash
  npm test
  ```
  *All 60+ test suites must pass (100% green).*

- [ ] **Verify Production Build & Chunk Code-Splitting**:
  ```bash
  npm run build
  ```
  *Verify `content/<blockId>/dist/bank.v1.json` is emitted as an isolated asynchronous chunk.*

- [ ] **Check Technical Debt Ratchet**:
  ```bash
  npm run blocks:ratchet
  ```
  *Ensure hardcoded literals do not exceed the baseline limit.*

---

*MedQuests Engineering Team — Apple-Grade Quality, 100% Reliability, Zero-Downtime Architecture.*
