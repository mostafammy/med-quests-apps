import { describe, it, expect } from 'vitest';
import { QuestionParsingAgent } from '../aiQuestionParser/QuestionParsingAgent.ts';
import { CurriculumTaxonomyRegistry } from '../../taxonomy/CurriculumTaxonomyRegistry.ts';
import { CrossModelVerificationPromptBuilder } from '../aiQuestionParser/CrossModelVerificationPromptBuilder.ts';

const RAW_18_ITEM_DIENCEPHALON_LIMBIC_BATCH = `
# MedQuests Global Question Bank Batch Verification (18 Items)
**Role**: Senior Medical Education & Clinical Curriculum Audit Committee (Cardiovascular Specialty).
**Instructions**: Audit each of the following 18 multiple-choice items independently. For every item, verify clinical accuracy, key correctness, and curriculum grounding within the specified Block, Subject, and Chapter:
1. Your independently determined single best answer (A, B, C, or D).
2. Confirmation whether the draft key is accurate or flawed.
3. Curriculum Scope Assessment: Whether the item fits the indicated Block, Subject, and Chapter.
4. Any subtle medical inaccuracies, distractor flaws, or length cue vulnerabilities.

---
## Question 1 of 18 [Concept: Diencephalon Subdivisions and Ventricular Relationship]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: During a neuroanatomy laboratory review, students are examining the deep median structures of a sagittal brain section. Which of the following correctly describes the anatomical location and primary components of the diencephalon?
**Choices**:
  (A) It lies between the right and left cerebral hemispheres around the third ventricle and comprises the thalamus, metathalamus, subthalamus, hypothalamus, and epithalamus.
  (B) It lies entirely within the posterior cranial fossa around the fourth ventricle and comprises the tectum, tegmentum, and basis pedunculi.
  (C) It occupies the floor of the lateral ventricle and is composed exclusively of the caudate nucleus, lentiform nucleus, and internal capsule.
  (D) It forms the roof of the lateral ventricle and consists of the corpus callosum, septum pellucidum, and fornix.
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The diencephalon surrounds the slit-like third ventricle in the midline between the two cerebral hemispheres. It consists of five major anatomical divisions: (1) thalamus, (2) metathalamus (medial and lateral geniculate bodies), (3) subthalamus, (4) hypothalamus, and (5) epithalamus.

---
## Question 2 of 18 [Concept: Thalamic Extremities and Interventricular Foramen Boundary]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: A 54-year-old patient undergoes an MRI of the brain demonstrating a colloid cyst at the interventricular foramen of Monro causing acute obstructive hydrocephalus. Anatomically, which part of the thalamus forms the posterior boundary of this foramen?
**Choices**:
  (A) The expanded posterior pulvinar of the thalamus
  (B) The narrow, rounded anterior end of the thalamus
  (C) The medial geniculate body of the metathalamus
  (D) The ventral anterior nucleus within the lateral nuclear group
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: The thalamus is a large ovoid mass of gray matter situated on each side of the third ventricle. Its narrow, rounded anterior extremity forms the posterior boundary of the interventricular foramen (foramen of Monro), connecting the lateral ventricle to the third ventricle. Its expanded posterior extremity forms the pulvinar.

---
## Question 3 of 18 [Concept: Relations of the Superior Surface of the Thalamus]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: A neurosurgeon is operating through a transventricular approach to access a lesion in the body of the lateral ventricle. Which structures directly cover and relate to the superior surface of the thalamus?
**Choices**:
  (A) Medially covered by the internal capsule, and laterally forming the superior lateral wall of the third ventricle
  (B) Medially covered by the tapetum of the corpus callosum, and laterally by the tail of the caudate nucleus
  (C) Medially covered by the tela choroidea and fornix, and laterally covered by ependyma forming part of the floor of the lateral ventricle
  (D) Medially continuous with the midbrain tegmentum, and laterally separated from the lentiform nucleus by the external capsule
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: The superior surface of the thalamus features two distinct regional relations: medially, it is roofed/covered by the tela choroidea of the third ventricle and the body of the fornix; laterally, it is bare of tela choroidea, covered only by ventricular ependyma, and contributes to the floor of the body/central part of the lateral ventricle.

---
## Question 4 of 18 [Concept: Medial, Inferior, and Lateral Surface Relations of the Thalamus]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: During a clinicopathological conference, a neurologist discusses the structural borders of the thalamus. Which of the following statements correctly identifies these anatomical boundaries?
**Choices**:
  (A) The inferior surface forms the roof of the fourth ventricle, while the lateral surface is directly fused with the insular cortex.
  (B) The medial surface is separated from the caudate nucleus by the external capsule, while the inferior surface forms the floor of the lateral ventricle.
  (C) The lateral surface forms the anterior wall of the third ventricle, while the inferior surface is separated from the midbrain by the pineal stalk.
  (D) The medial surface forms the superior part of the lateral wall of the third ventricle, while the lateral surface is separated from the lentiform nucleus by the internal capsule.
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The thalamic surfaces are key anatomical landmarks: medial surface = superior lateral wall of the third ventricle (connected across by interthalamic adhesion); lateral surface = bordered by the posterior limb of the internal capsule (separating it from the lentiform nucleus); inferior surface = blends into the midbrain tegmentum and subthalamus.

---
## Question 5 of 18 [Concept: Internal Medullary Lamina and Thalamic Nuclear Subdivision]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Histological sectioning of the thalamus reveals a vertical Y-shaped band of myelinated nerve fibers that divides the gray matter into three major nuclear masses. What is the name of this white matter septum, and which nuclear groups are associated with the limbic system?
**Choices**:
  (A) Internal medullary lamina; the anterior and medial nuclear groups are associated with the limbic system.
  (B) External medullary lamina; only the ventral lateral nuclear group is associated with the limbic system.
  (C) Stria medullaris thalami; the lateral dorsal and pulvinar nuclei are associated with the limbic system.
  (D) Stria terminalis; the ventral posterior medial and ventral posterior lateral nuclei are associated with the limbic system.
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The internal medullary lamina bifurcates anteriorly in a Y-shape, partitioning the thalamic gray matter into: (1) Anterior nuclear group (wedged between the limbs of the Y, linked to the mammillary bodies and cingulate gyrus in the limbic circuit), (2) Medial nuclear group (associated with the prefrontal cortex and limbic system), and (3) Lateral nuclear group (subdivided into ventral and dorsal tiers).

---
## Question 6 of 18 [Concept: Afferent Connections of Thalamic Motor Nuclei (VA and VL)]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: A neuroscientist investigates motor circuit loops connecting subcortical structures with the cerebral cortex. Which thalamic ventral nuclei receive afferents predominantly from the basal ganglia and the cerebellum?
**Choices**:
  (A) Ventral anterior receives fibers from the spinal lemniscus; ventral lateral receives fibers exclusively from the optic tract.
  (B) Ventral anterior receives fibers from the basal ganglia; ventral lateral receives fibers from both the cerebellum and basal nuclei.
  (C) Ventral anterior receives fibers from the medial lemniscus; ventral lateral receives fibers from the auditory radiation.
  (D) Ventral anterior receives fibers from the trigeminal lemniscus; ventral lateral receives fibers exclusively from the vestibular nuclei.
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: The motor tier of the ventral thalamic nuclei coordinates voluntary movement: (1) Ventral Anterior (VA) nucleus receives major inhibitory input from the globus pallidus and substantia nigra (basal ganglia) and projects to the premotor cortex. (2) Ventral Lateral (VL) nucleus receives major excitatory input from the deep cerebellar nuclei (dentate) as well as basal ganglia, projecting to the primary motor cortex (Brodmann area 4).

---
## Question 7 of 18 [Concept: Sensory Afferents to VPM and VPL Thalamic Nuclei]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: A 62-year-old man suffers a lacunar stroke involving the thalamus, resulting in loss of facial pain and temperature sensation as well as contralateral hemibody sensory loss. What specific sensory pathways terminate in the ventral posterior medial (VPM) and ventral posterior lateral (VPL) nuclei, respectively?
**Choices**:
  (A) VPM receives the lateral lemniscus; VPL receives the optic tract.
  (B) VPM receives the medial lemniscus; VPL receives the trigeminal lemniscus.
  (C) VPM receives the trigeminal lemniscus; VPL receives the medial and spinal lemnisci.
  (D) VPM receives the spinal lemniscus; VPL receives the olfactory tract.
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: The ventral posterior (VP) nucleus is the primary somatosensory relay of the thalamus: VPM (Medial = Mouth/face) receives the trigeminothalamic fibers (trigeminal lemniscus) and gustatory pathways; VPL (Lateral = Limbs/body) receives the medial lemniscus (dorsal column pathway) and spinal lemniscus (spinothalamic tract).

---
## Question 8 of 18 [Concept: Metathalamic Bodies and Functional Modalities]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Anatomical examination of the posterior diencephalon identifies two rounded eminences attached to the inferior surface of the posterior thalamus. What constitutes the metathalamus, and what are their respective functional modalities?
**Choices**:
  (A) Superior colliculus (relays visual reflexes) and inferior colliculus (relays auditory reflexes)
  (B) Medial geniculate body (relays visual information) and lateral geniculate body (relays auditory information)
  (C) Habenular nucleus (relays olfactory information) and pineal gland (relays somatosensory information)
  (D) Medial geniculate body (relays auditory information) and lateral geniculate body (relays visual information)
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The metathalamus consists of: (1) Medial Geniculate Body (MGB) — receives auditory input from the inferior colliculus via its brachium and projects to the primary auditory cortex (areas 41 and 42); (2) Lateral Geniculate Body (LGB) — receives visual input from the optic tract and projects via the optic radiation to the primary visual cortex (area 17).

---
## Question 9 of 18 [Concept: Subthalamus Location and Basal Ganglia Connections]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: application
**Stem**: A 68-year-old woman develops sudden, uncontrollable, violent flinging movements of her right upper and lower extremities (hemiballismus). A brain MRI confirms an acute infarct in the subthalamic nucleus. Where is the subthalamus situated anatomically, and what are its primary neural connections?
**Choices**:
  (A) Situated inferior to the thalamus between the thalamus and midbrain tegmentum; the subthalamic nucleus has important connections with the corpus striatum.
  (B) Situated superior to the corpus callosum; the subthalamic nucleus connects exclusively with the visual cortex.
  (C) Situated in the floor of the fourth ventricle; the subthalamic nucleus connects directly to the spinal cord dorsal horns.
  (D) Situated between the optic chiasma and lamina terminalis; the subthalamic nucleus connects exclusively with the olfactory bulb.
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The subthalamus represents the rostral continuation of the midbrain tegmentum into the diencephalon, lying ventral to the thalamus and lateral to the hypothalamus. Its primary component, the subthalamic nucleus (of Luys), plays a crucial role in the indirect pathway of the basal ganglia by exciting the globus pallidus internus.

---
## Question 10 of 18 [Concept: Anatomical Boundaries and Relations of the Hypothalamus]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: During a midline neurosurgical exploration of the sellar and suprasellar regions, the neurosurgeon identifies the boundaries of the hypothalamus. What are the cranial, caudal, superior, and anterior boundaries of this structure?
**Choices**:
  (A) Extends from the anterior commissure to the superior colliculi above the hypothalamic sulcus; merges caudally into the pons.
  (B) Extends from the optic chiasma to the caudal border of the mammillary bodies below the hypothalamic sulcus; related anteriorly to the preoptic area and merges caudally into the midbrain tegmentum.
  (C) Extends from the pineal gland to the olfactory trigone; bounded superiorly by the fornix and caudally by the pyramid.
  (D) Extends from the foramen of Monro to the aqueduct of Sylvius above the thalamic stria medullaris; merges caudally into the cerebellum.
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: The hypothalamus forms the floor and inferior part of the lateral walls of the third ventricle. Key borders include: anterior = preoptic area (lamina terminalis to anterior commissure); posterior = caudal border of mammillary bodies, blending into the midbrain tegmentum; superior = hypothalamic sulcus separating it from the thalamus; inferolateral = subthalamic region.

---
## Question 11 of 18 [Concept: Nuclei of the Anterior (Supraoptic) Hypothalamic Region]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: In the sagittal plane, the nuclei of the hypothalamus are categorized into three rostrocaudal regions. Which group of nuclei is situated within the anterior (supraoptic) region?
**Choices**:
  (A) Lateral, dorsomedial, ventromedial, and arcuate nuclei
  (B) Posterior nucleus, mammillary nuclei, and red nucleus
  (C) Supraoptic, paraventricular, suprachiasmatic, and anterior nuclei
  (D) Habenular nucleus, pineal body, and subthalamic nucleus
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: The anterior (supraoptic) region of the hypothalamus lies above the optic chiasm. Its nuclei include: (1) Supraoptic nucleus (synthesizes ADH/vasopressin), (2) Paraventricular nucleus (synthesizes oxytocin), (3) Suprachiasmatic nucleus (master pacemaker of circadian rhythms), and (4) Anterior hypothalamic nucleus (temperature regulation, heat dissipation/sweating).

---
## Question 12 of 18 [Concept: Tuberal and Posterior Hypothalamic Regions]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: A 45-year-old patient presents with hyperphagia, uncontrollable food craving, and rapid morbid weight gain following surgical resection of a craniopharyngioma. Damage to the ventromedial nucleus is suspected. In which anatomical sagittal zone of the hypothalamus is this nucleus located, and which other nuclei reside in that same region?
**Choices**:
  (A) Anterior (supraoptic) region; along with the suprachiasmatic and preoptic nuclei
  (B) Posterior (mammillary) region; along with the posterior nucleus and mammillary bodies
  (C) Epithalamic region; along with the habenula and pineal gland
  (D) Middle (tuberal) region; along with the lateral, dorsomedial, and arcuate nuclei
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The tuberal (middle) zone surrounds the tuber cinereum and infundibulum. It contains: (1) Ventromedial nucleus (satiety center; lesion causes obesity), (2) Lateral nucleus (hunger/feeding center; lesion causes anorexia), (3) Dorsomedial nucleus (GI stimulation), and (4) Arcuate nucleus (produces hypothalamic releasing/inhibitory hormones and dopamine).

---
## Question 13 of 18 [Concept: Epithalamic Anatomy and Pineal Stalk Commissures]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: An anatomical dissection of the epithalamus reveals the pineal gland and its stalk attached to the posterior diencephalon. Which commissural white matter tracts are contained within the superior and inferior laminae of the base of the pineal stalk?
**Choices**:
  (A) The superior part of the base contains the habenular commissure, and the inferior part contains the posterior commissure.
  (B) The superior part of the base contains the anterior commissure, and the inferior part contains the hippocampal commissure.
  (C) The superior part of the base contains the corpus callosum, and the inferior part contains the optic chiasma.
  (D) The superior part of the base contains the posterior commissure, and the inferior part contains the habenular commissure.
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The epithalamus comprises the two habenular trigones/nuclei, the habenular commissure, and the pineal body. The pineal stalk attaches the pineal gland to the posterior diencephalon; its hollow base forms the pineal recess of the third ventricle. The upper (superior) lamina contains the habenular commissure, while the lower (inferior) lamina contains the posterior commissure.

---
## Question 14 of 18 [Concept: Anatomical Position of the Habenular Nucleus]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: During an anatomy practical examination, an arrow points to a small group of nerve cells situated in the epithalamus immediately medial to the posterior surface of the thalamus. What is this nucleus?
**Choices**:
  (A) Red nucleus
  (B) Habenular nucleus
  (C) Subthalamic nucleus
  (D) Ventral posterior medial nucleus
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: The habenular nucleus resides within the habenular trigone, a small depressed triangular area situated just medial to the posterior end of the thalamus, above the superior colliculus. It receives afferents via the stria medullaris thalami from the septal nuclei and limbic system, projecting via the fasciculus retroflexus (habenulo-interpeduncular tract) to the interpeduncular nucleus.

---
## Question 15 of 18 [Concept: Major Structures of the Limbic System]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: Which of the following sets correctly enumerates the major anatomical structures constituting the limbic system as outlined in the neuroscience curriculum?
**Choices**:
  (A) Caudate nucleus, putamen, globus pallidus, subthalamic nucleus, and substantia nigra
  (B) Superior colliculus, inferior colliculus, red nucleus, and cerebral peduncles
  (C) Hippocampus, amygdala, mammillary body, cingulate gyrus, and anterior nucleus of the thalamus
  (D) Dentate nucleus, emboliform nucleus, globose nucleus, and fastigial nucleus
**Draft Key**: Option (C) [Author Provided]
**Draft Explanation**: The limbic system is dedicated to emotional behavior, memory consolidation, drive, and autonomic regulation. Its classical anatomical components form the circuit of Papez and allied structures: hippocampus, amygdaloid body, mammillary bodies, cingulate gyrus, and anterior thalamic nucleus.

---
## Question 16 of 18 [Concept: Components of the Hippocampal Formation]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: A histology professor demonstrates a coronal section through the medial temporal lobe, showing the trilaminar archicortex. Which three structures together constitute the hippocampal formation?
**Choices**:
  (A) Caudate nucleus, putamen, and globus pallidus
  (B) Amygdala, stria terminalis, and anterior commissure
  (C) Pineal gland, habenular trigone, and posterior commissure
  (D) Hippocampus, dentate gyrus, and subiculum
**Draft Key**: Option (D) [Author Provided]
**Draft Explanation**: The hippocampal formation consists of three contiguous cytoarchitectonic zones: (1) The Hippocampus proper (cornu Ammonis, CA1–CA4), (2) The Dentate gyrus (a serrated band of cortex characterized by a prominent granule cell layer), and (3) The Subiculum (the transition zone linking the three-layered hippocampus to the six-layered parahippocampal neocortex).

---
## Question 17 of 18 [Concept: Hippocampus Location, Ventricular Relation, and Cornu Ammonis Fields]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: understanding
**Stem**: An anatomical dissection of the inferior horn of the lateral ventricle reveals an elongated elevation along its floor. In coronal section, this structure exhibits a C-shaped profile termed cornu Ammonis. How is this structure divided histologically?
**Choices**:
  (A) Lies in the floor of the inferior horn of the lateral ventricle; divided into four fields (CA1, CA2, CA3, and CA4).
  (B) Lies in the roof of the anterior horn of the lateral ventricle; divided into three zones (putamen, globus pallidus, and claustrum).
  (C) Lies in the medial wall of the fourth ventricle; divided into two trigones (hypoglossal and vagal).
  (D) Lies in the lateral wall of the third ventricle; divided into anterior, middle, and posterior tuberal zones.
**Draft Key**: Option (A) [Author Provided]
**Draft Explanation**: The hippocampus is a curved sheet of three-layered archicortex in the floor of the temporal (inferior) horn of the lateral ventricle. Its ram's horn (cornu Ammonis) shape is categorized into fields CA1 to CA4: CA1 (Sommer's sector) is particularly sensitive to ischemia, while CA4 invaginates into the concavity of the dentate gyrus.

---
## Question 18 of 18 [Concept: Main Efferent Pathway of the Hippocampus (Fornix)]
**Curriculum Scope**: Block: CNS | Subject: CNS Anatomy | Chapter: Spinal Cord Structure & Ascending/Descending Tracts
**Difficulty**: 2/3 | **Cognitive**: recall
**Stem**: A 58-year-old chronic alcoholic presents with severe anterograde amnesia and confabulation (Korsakoff syndrome). Degeneration of the mammillary bodies is observed. What is the main efferent fiber bundle that projects from the hippocampus to the mammillary bodies?
**Choices**:
  (A) Stria terminalis
  (B) Fornix
  (C) Mammillothalamic tract
  (D) Internal capsule
**Draft Key**: Option (B) [Author Provided]
**Draft Explanation**: Alvear fibers from hippocampal pyramidal neurons gather to form the fimbria, which continues as the crus of the fornix. The two crura unite under the splenium of the corpus callosum to form the body of the fornix, which arches forward over the thalamus and bifurcates into the columns of the fornix, terminating predominantly in the medial mammillary nucleus of the hypothalamus.
`;

describe('CNS Diencephalon & Limbic System 18-Item Batch Decider & Audit', () => {
  it('correctly maps all 18 items to Diencephalon & Limbic System and NEVER to Spinal Cord Structure & Ascending/Descending Tracts', async () => {
    const agent = new QuestionParsingAgent();
    const result = await agent.parseRawQuestions({
      rawText: RAW_18_ITEM_DIENCEPHALON_LIMBIC_BATCH,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      targetBlockId: 'cns',
    });

    expect(result.items.length).toBe(18);

    for (const item of result.items) {
      expect(item.question.blockId).toBe('cns');
      expect(item.question.subjectId).toBe('anatomy');

      // Crucial verification: items must NEVER remain in Spinal Cord tracts!
      expect(item.question.chapterId).not.toBe('cns-ana-spinal-cord-tracts');
      expect(item.taxonomyClassification?.chapterId).not.toBe('cns-ana-spinal-cord-tracts');

      // They MUST be mapped to Diencephalon & Limbic System
      expect(item.question.chapterId).toBe('cns-ana-diencephalon-limbic-system');
      expect(item.taxonomyClassification?.chapterName).toBe('Diencephalon & Limbic System');
      expect(item.taxonomyClassification?.confidenceScore).toBeGreaterThanOrEqual(95);

      // Reclassification telemetry must be accurately recorded for UI rendering
      expect(item.isReclassified).toBe(true);
      expect(item.originalDraftTaxonomy?.chapterName).toBe(
        'Spinal Cord Structure & Ascending/Descending Tracts'
      );
      expect(item.originalDraftTaxonomy?.blockName).toBe('CNS');
      expect(item.originalDraftTaxonomy?.subjectName).toBe('CNS Anatomy');
    }
  });

  it('generates a clean CNS Audit Committee verification prompt with Chapter: Diencephalon & Limbic System', async () => {
    const agent = new QuestionParsingAgent();
    const result = await agent.parseRawQuestions({
      rawText: RAW_18_ITEM_DIENCEPHALON_LIMBIC_BATCH,
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      targetBlockId: 'cns',
    });

    const batchPrompt = CrossModelVerificationPromptBuilder.buildBatchQuestionsPrompt(result.items);

    // Audit role must reflect Central Nervous System specialty
    expect(batchPrompt).toContain('Central Nervous System Specialty');

    // All questions must be scoped to Diencephalon & Limbic System
    expect(batchPrompt).toContain('Chapter: Diencephalon & Limbic System');
    expect(batchPrompt).not.toContain('Chapter: Spinal Cord Structure & Ascending/Descending Tracts');
  });

  it('preserves clean concept titles extracted from brackets in headers', async () => {
    const agent = new QuestionParsingAgent();
    const result = await agent.parseRawQuestions({
      rawText: RAW_18_ITEM_DIENCEPHALON_LIMBIC_BATCH,
      targetBlockId: 'cns',
    });

    expect(result.items[0].question.concept).toBe(
      'Diencephalon Subdivisions and Ventricular Relationship'
    );
    expect(result.items[1].question.concept).toBe(
      'Thalamic Extremities and Interventricular Foramen Boundary'
    );
    expect(result.items[17].question.concept).toBe(
      'Main Efferent Pathway of the Hippocampus (Fornix)'
    );
  });
});
