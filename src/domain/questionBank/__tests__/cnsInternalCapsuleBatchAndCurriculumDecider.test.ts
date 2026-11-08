import { describe, it, expect } from 'vitest';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import { curriculumClassificationAgent } from '../../taxonomy/CurriculumClassificationAgent.ts';
import { CurriculumTaxonomyRegistry } from '../../taxonomy/CurriculumTaxonomyRegistry.ts';
import { CrossModelVerificationPromptBuilder } from '../aiQuestionParser/CrossModelVerificationPromptBuilder.ts';
import { DirectJsonQuestionStrategy } from '../aiQuestionParser/DirectJsonQuestionStrategy.ts';

const RAW_12_ITEM_CNS_BATCH = `
## Question 1 of 12 [Concept: Definition and Trajectory of Projection Fibers]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which statement accurately defines cerebral projection fibers and their anatomical bottleneck in the cerebral hemisphere?
**Choices**:
  (A) They include fibers passing to the cortex from the thalamus and fibers passing from the cortex to lower centers, with all projection fibers passing in the internal capsule
  (B) They connect matching cortical areas across the two hemispheres exclusively through the corpus callosum
  (C) They interconnect gyri within the same cerebral hemisphere by looping around intervening sulci
  (D) They consist solely of olfactory tract fibers passing through the anterior commissure to the temporal pole
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: According to the lecture text: 'Projection fibers include fibers passing to the cortex from the thalamus and fibers passing from the cortex to the lower centers. All the projection fibers to the cerebral cortex and from it pass in the internal capsule.'

---
## Question 2 of 12 [Concept: Thalamocortical Radiations: Sensory, Optic, and Auditory]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which pairing correctly matches a component of the thalamocortical radiation with its thalamic nucleus of origin and target cortical area?
**Choices**:
  (A) Auditory radiation: Lateral geniculate body to primary visual area (Brodmann area 17)
  (B) Sensory radiation: Posterior ventral nucleus of the thalamus to primary sensory area in the postcentral gyrus (Brodmann areas 3, 1, and 2)
  (C) Optic radiation: Medial geniculate body to primary auditory area (Brodmann areas 41 and 42)
  (D) Motor radiation: Pulvinar of the thalamus to primary motor cortex (Brodmann area 4)
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: Lecture 6 classifies thalamocortical radiations into: 1. Sensory radiation from the posterior ventral nucleus to postcentral gyrus (areas 3, 1 & 2); 2. Optic radiation from lateral geniculate body to visual area in occipital cortex (area 17); 3. Auditory radiation from medial geniculate body to auditory area in temporal lobe (areas 41 & 42).

---
## Question 3 of 12 [Concept: Descending Corticofugal Projection Fibers]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which group of fiber tracts comprises the descending projection fibers passing from the cerebral cortex to lower centers?
**Choices**:
  (A) Corpus callosum, anterior commissure, and hippocampal commissure
  (B) Superior longitudinal fasciculus, inferior longitudinal fasciculus, and uncinate bundle
  (C) Pyramidal tract, extrapyramidal tracts, cortico-pontine fibers, and corticothalamic fibers
  (D) Dorsal column-medial lemniscus, spinothalamic tracts, and spinocerebellar tracts
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: Lecture 6 lists descending projection fibers from the cerebral cortex to lower centers as: 'The pyramidal tract, extrapyramidal tracts, cortico-pontine fibers (composed of frontopontine fibers and temporo-parieto-occipito-pontine fibers), and corticothalamic fibers.'

---
## Question 4 of 12 [Concept: Internal Capsule Boundaries and Nuclear Relations]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: In horizontal section of the cerebral hemisphere, what are the direct medial and lateral nuclear boundaries of the internal capsule?
**Choices**:
  (A) Bounded laterally by the claustrum and medially by the insular cortex
  (B) Bounded laterally by the caudate nucleus and medially by the lentiform nucleus
  (C) Bounded laterally by the lentiform nucleus, and medially by the caudate nucleus anteriorly and the thalamus posteriorly
  (D) Bounded laterally by the lateral ventricle and medially by the third ventricle
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: In horizontal section, the internal capsule is a broad V-shaped band of projection fibers. Medially, it is related to the head of the caudate nucleus (anteriorly) and the dorsal thalamus (posteriorly). Laterally, it is embraced by the wedge-shaped lentiform nucleus (putamen and globus pallidus).

---
## Question 5 of 12 [Concept: Anterior Limb of the Internal Capsule Contents]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which major fiber bundles pass through the anterior limb of the internal capsule (between the head of the caudate nucleus and lentiform nucleus)?
**Choices**:
  (A) Corticospinal tract and medial lemniscus
  (B) Optic radiation and auditory radiation
  (C) Corticobulbar tract and corticonuclear fibers
  (D) Frontopontine fibers and anterior thalamic radiation
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The anterior limb of the internal capsule lies between the head of the caudate nucleus and the lentiform nucleus. It conveys frontopontine fibers descending to the pons and reciprocal thalamocortical fibers (anterior thalamic radiation) interconnecting the thalamus and prefrontal cortex.

---
## Question 6 of 12 [Concept: Genu of the Internal Capsule Contents and Clinical Correlation]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: Which tract passes through the genu of the internal capsule, and what neurological deficit occurs if this region is selectively infarcted?
**Choices**:
  (A) Corticospinal tract; causes contralateral lower limb monoplegia
  (B) Corticobulbar (corticonuclear) tract; causes contralateral central facial weakness and contralateral hypoglossal paresis
  (C) Auditory radiation; causes complete unilateral sensorineural deafness
  (D) Optic radiation; causes ipsilateral bitemporal hemianopia
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: The genu (the bend or apex of the internal capsule) transmits the corticobulbar (corticonuclear) fibers. These upper motor neuron fibers innervate the motor nuclei of cranial nerves in the brainstem, controlling voluntary movements of the face, tongue, palate, and larynx.

---
## Question 7 of 12 [Concept: Posterior Limb of Internal Capsule: Corticospinal Somatotopy]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: How are the motor fibers of the corticospinal tract somatotopically organized from anterior to posterior within the posterior limb of the internal capsule?
**Choices**:
  (A) Leg fibers lie most anteriorly near the genu, followed by trunk and arm fibers posteriorly
  (B) Arm and leg fibers travel exclusively in the anterior limb, with trunk fibers in the posterior limb
  (C) Fibers for the face, arm, trunk, and leg are intermixed randomly throughout the capsule
  (D) Arm fibers lie anteriorly, trunk fibers in the middle, and leg fibers posteriorly
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The posterior limb of the internal capsule contains descending corticospinal motor fibers somatotopically arranged from anterior to posterior: Upper extremity (Arm) -> Trunk -> Lower extremity (Leg), continuing logically from the Head/Face fibers located at the genu.

---
## Question 8 of 12 [Concept: Sensory Radiations in the Posterior Limb of the Internal Capsule]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: Which ascending sensory pathways travel within the posterior part of the posterior limb of the internal capsule to terminate in Brodmann areas 3, 1, and 2?
**Choices**:
  (A) Thalamocortical fibers from the posterior ventral nucleus of the thalamus (VPL and VPM)
  (B) First-order axons directly from dorsal root ganglia without synaptic interruption
  (C) Second-order fibers ascending directly from the nucleus gracilis and cuneatus to the cortex
  (D) Gustatory fibers from the solitary nucleus projecting directly to the insular cortex
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: Lecture 6 and Lecture 3 state: Sensory radiation from the posterior ventral nucleus of the thalamus (VPL/VPM) passes in the posterior limb of the internal capsule to the primary somatosensory cortex (Brodmann areas 3, 1, and 2) in the postcentral gyrus.

---
## Question 9 of 12 [Concept: Retrolentiform (Retrolenticular) Part of the Internal Capsule]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which major sensory projection radiation traverses the retrolenticular (retrolentiform) part of the internal capsule behind the lentiform nucleus?
**Choices**:
  (A) Auditory radiation from the medial geniculate body
  (B) Corticobulbar tract from the precentral gyrus
  (C) Anterior thalamic radiation from the anterior nucleus
  (D) Optic radiation from the lateral geniculate body
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The retrolentiform (retrolenticular) part of the internal capsule lies posterior to the lentiform nucleus. It conveys the optic radiation (geniculocalcarine fibers) arising from the lateral geniculate body to the visual cortex (Brodmann area 17) in the calcarine lips of the occipital lobe.

---
## Question 10 of 12 [Concept: Sublenticular Part of the Internal Capsule]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: Which pathways pass beneath the lentiform nucleus in the sublenticular part of the internal capsule to reach the temporal lobe?
**Choices**:
  (A) Auditory radiation from the medial geniculate body and temporopontine fibers
  (B) Corticospinal tract to the lumbosacral spinal cord
  (C) Frontopontine fibers to pontine nuclei
  (D) Optic radiation from the lateral geniculate body
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The sublenticular part of the internal capsule passes beneath the lentiform nucleus toward the temporal cortex. It contains the auditory radiation projecting from the medial geniculate body to the primary auditory cortex (areas 41 and 42) and temporopontine fibers.

---
## Question 11 of 12 [Concept: Arterial Blood Supply of the Internal Capsule]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: According to the arterial territory breakdown of the internal capsule, which cerebral vessels supply its anterior limb, genu/posterior limb, and retrolenticular/sublenticular parts, respectively?
**Choices**:
  (A) Posterior cerebral artery, vertebral artery, and basilar artery
  (B) Anterior cerebral artery (anterior limb), middle cerebral artery (genu and posterior limb), and anterior choroidal artery (retrolenticular and sublenticular parts)
  (C) Anterior choroidal artery (anterior limb), posterior cerebral artery (genu), and anterior cerebral artery (posterior limb)
  (D) External carotid artery, ophthalmic artery, and posterior communicating artery
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: Lecture 8 explicitly defines the arterial supply of the internal capsule: 1. The anterior limb is supplied by the anterior cerebral artery; 2. The genu and the posterior limb are supplied by the middle cerebral artery; 3. The retrolenticular and sublenticular parts are supplied by the anterior choroidal artery.

---
## Question 12 of 12 [Concept: Clinical Capsular Stroke and Lenticulostriate Artery Lesions]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Neural Tube, Meninges & CSF Dynamics
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: Rupture of a lenticulostriate branch of the middle cerebral artery (Charcot's artery of cerebral hemorrhage) damaging the genu and posterior limb of the internal capsule classic produces which neurological triad?
**Choices**:
  (A) Ipsilateral lower motor neuron facial palsy, ipsilateral hearing loss, and cerebellar ataxia
  (B) Bilateral loss of pain and temperature in a cape-like distribution with preserved tactile sensation
  (C) Contralateral hemiplegia, contralateral hemianesthesia, and contralateral lower facial weakness
  (D) Paralysis of upward gaze, bilateral ptosis, and non-reactive Argyll Robertson pupils
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: Because descending motor fibers (corticobulbar in genu, corticospinal in posterior limb) and ascending sensory fibers (thalamocortical in posterior limb) are tightly packed in the internal capsule, vascular compromise of the lenticulostriate arteries (Charcot's artery of cerebral hemorrhage from the MCA) results in contralateral upper motor neuron hemiplegia, contralateral central facial paresis, and contralateral hemianesthesia.
`;

describe('CNS Internal Capsule Ingestion & Curriculum Decider Verification', () => {
  it('correctly maps all 12 items to Cerebral White Matter & Internal Capsule and NEVER to Neural Tube', async () => {
    const agent = new QuestionParsingAgent();
    const result = await agent.parseRawQuestions({
      rawText: RAW_12_ITEM_CNS_BATCH,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      targetBlockId: 'cns',
      targetSubjectId: 'auto',
      targetChapterId: 'auto',
    });

    expect(result.items.length).toBe(12);

    for (const item of result.items) {
      expect(item.question.blockId).toBe('cns');
      expect(item.question.subjectId).toBe('anatomy');

      // The critical fix: internal capsule questions MUST NOT be classified under Neural Tube, Meninges & CSF!
      expect(item.question.chapterId).not.toBe('cns-ana-embryology-meninges-csf');
      expect(item.taxonomyClassification?.chapterId).not.toBe('cns-ana-embryology-meninges-csf');

      // They MUST be mapped to Cerebral White Matter & Internal Capsule
      expect(item.question.chapterId).toBe('cns-ana-white-matter-internal-capsule');
      expect(item.taxonomyClassification?.chapterName).toBe('Cerebral White Matter & Internal Capsule');
      expect(item.taxonomyClassification?.confidenceScore).toBeGreaterThanOrEqual(90);

      // Reclassification telemetry must be captured for UI rendering
      expect(item.isReclassified).toBe(true);
      expect(item.originalDraftTaxonomy?.chapterName).toBe('Neural Tube, Meninges & CSF Dynamics');
      expect(item.originalDraftTaxonomy?.subjectName).toBe('CNS Anatomy');
      expect(item.originalDraftTaxonomy?.blockName).toBe('CNS');
    }
  });

  it('generates a specialized CNS Audit Committee batch prompt with correct curriculum scopes', async () => {
    const agent = new QuestionParsingAgent();
    const result = await agent.parseRawQuestions({
      rawText: RAW_12_ITEM_CNS_BATCH,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      targetBlockId: 'cns',
    });

    const batchPrompt = CrossModelVerificationPromptBuilder.buildBatchQuestionsPrompt(result.items);

    // Audit role must reflect Central Nervous System specialty, not Cardiovascular
    expect(batchPrompt).toContain('Central Nervous System Specialty');
    expect(batchPrompt).not.toContain('Cardiovascular Specialty');

    // All questions must be scoped to Cerebral White Matter & Internal Capsule
    expect(batchPrompt).toContain('Chapter: Cerebral White Matter & Internal Capsule');
    expect(batchPrompt).not.toContain('Chapter: Neural Tube, Meninges & CSF Dynamics');
  });

  it('allows the agent and registry to dynamically propose and register new chapters with multi-block support', () => {
    const registry = CurriculumTaxonomyRegistry.getInstance();

    const newChap = registry.registerChapter({
      id: 'cns-ana-custom-neurovascular',
      subjectId: 'anatomy',
      name: 'Custom Neurovascular Malformations',
      blockId: 'cns',
    });

    expect(newChap.id).toBe('cns-ana-custom-neurovascular');
    expect(newChap.blockId).toBe('cns');
    expect(registry.hasChapter('cns-ana-custom-neurovascular', 'cns')).toBe(true);
  });

  it('DirectJsonQuestionStrategy reconciles internal capsule stem tokens to white matter chapter without silent index-0 fallback', () => {
    const directResult = DirectJsonQuestionStrategy.extractDirectJsonItems(
      [
        {
          stem: 'Which tract traverses the genu of the internal capsule?',
          choices: [
            { id: 'a', text: 'Corticospinal tract', isCorrect: false },
            { id: 'b', text: 'Corticobulbar tract', isCorrect: true },
            { id: 'c', text: 'Optic radiation', isCorrect: false },
            { id: 'd', text: 'Auditory radiation', isCorrect: false },
          ],
          blockId: 'cns',
          subjectId: 'anatomy',
          chapterId: 'auto',
          concept: 'Genu of Internal Capsule',
        },
      ],
      {
        rawText: '',
        targetBlockId: 'cns',
      },
      'cns',
      Date.now()
    );

    expect(directResult.items.length).toBe(1);
    expect(directResult.items[0].question.chapterId).toBe('cns-ana-white-matter-internal-capsule');
    expect(directResult.items[0].question.chapterId).not.toBe('cns-ana-embryology-meninges-csf');
  });
});
