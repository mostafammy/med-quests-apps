/**
 * Domain Service: CurriculumClassificationAgent
 * Evaluates raw question content against the active curriculum taxonomy,
 * autonomously mapping questions to the most accurate Subject and Chapter,
 * and proposing new curriculum branches when unmapped clinical domains are detected.
 *
 * Adheres to SOLID:
 * - Single Responsibility: Classifying questions and performing curriculum gap analysis.
 * - Open/Closed: Extensible keyword and heuristic rules with live taxonomy awareness.
 * - Dependency Inversion: Operates on ICurriculumTaxonomyRegistry.
 */

import type { SubjectId, ChapterId } from '../model/types.ts';
import {
  CurriculumTaxonomyRegistry,
  type ICurriculumTaxonomyRegistry,
} from './CurriculumTaxonomyRegistry.ts';

export interface TaxonomyClassificationResult {
  readonly blockId: string;
  readonly blockName: string;
  readonly subjectId: SubjectId;
  readonly subjectName: string;
  readonly chapterId: ChapterId;
  readonly chapterName: string;
  readonly confidenceScore: number; // 0 to 100
  readonly rationale: string;
  readonly isNewDomainSuggested: boolean;
  readonly newSubjectProposal?: {
    readonly id: string;
    readonly name: string;
    readonly rationale: string;
  };
  readonly newChapterProposal?: {
    readonly id: string;
    readonly name: string;
    readonly subjectId: string;
    readonly rationale: string;
  };
}

export interface BlockDescriptorContext {
  id: string;
  name: string;
  code?: string;
  shortName?: string;
}

export class CurriculumClassificationAgent {
  constructor(
    private readonly taxonomyRegistry: ICurriculumTaxonomyRegistry = CurriculumTaxonomyRegistry.getInstance()
  ) {}

  private createResult(
    params: Omit<TaxonomyClassificationResult, 'blockId' | 'blockName'>,
    customBlock?: BlockDescriptorContext
  ): TaxonomyClassificationResult {
    if (customBlock) {
      return {
        blockId: customBlock.id,
        blockName: `${customBlock.name} (${customBlock.shortName || customBlock.id.toUpperCase()}) - ${customBlock.code || 'Curriculum Block'}`,
        ...params,
      };
    }
    const block = this.taxonomyRegistry.getTaxonomy().block;
    return {
      blockId: block?.id || 'cvs',
      blockName: block
        ? `${block.name} (${block.shortName || 'CVS'}) - ${block.code || 'Block 206'}`
        : 'Cardiovascular System (CVS) - Block 206',
      ...params,
    };
  }

  /**
   * Classifies a question into the optimal Subject and Chapter,
   * detecting curriculum gaps if the content falls outside standard boundaries.
   */
  public classify(
    stem: string,
    choicesText = '',
    explanationText = '',
    targetDescriptor?: BlockDescriptorContext
  ): TaxonomyClassificationResult {
    const combined = `${stem} ${choicesText} ${explanationText}`.toLowerCase();

    const isExplicitCns = targetDescriptor?.id === 'cns';
    const isExplicitCvs = targetDescriptor?.id === 'cvs';

    const cnsKeywords = [
      'internal capsule',
      'projection fiber',
      'projection fibers',
      'corticospinal',
      'corticobulbar',
      'corticonuclear',
      'thalamocortical',
      'neural tube',
      'meninges',
      'cerebrospinal',
      'csf',
      'cerebral hemisphere',
      'cerebral cortex',
      'brainstem',
      'cerebellum',
      'basal ganglia',
      'lentiform',
      'putamen',
      'globus pallidus',
      'caudate',
      'thalamus',
      'substantia nigra',
      'cranial nerve',
      'optic radiation',
      'auditory radiation',
      'charcot',
      'lenticulostriate',
      'brodmann',
      'neuroanatomy',
      'supratentorial',
      'infratentorial',
      'spinal cord',
    ];

    const isCnsContent = !isExplicitCvs && (isExplicitCns || cnsKeywords.some((kw) => combined.includes(kw)));

    if (isCnsContent) {
      return this.classifyCns(combined, targetDescriptor, stem.toLowerCase());
    }

    // 1. GAP ANALYSIS: Check if content belongs to an unmapped specialty (e.g. Pharmacology or Pathology)
    const gapAssessment = this.detectCurriculumGaps(combined);
    const result = gapAssessment || this.matchAgainstRegisteredTaxonomy(combined);

    if (targetDescriptor) {
      return {
        ...result,
        blockId: targetDescriptor.id,
        blockName: `${targetDescriptor.name} (${targetDescriptor.shortName || targetDescriptor.id.toUpperCase()}) - ${targetDescriptor.code || 'Curriculum Block'}`,
      };
    }

    return result;
  }

  /**
   * Autonomous Central Nervous System (CNS - Block 207) Curriculum Classifier
   */
  private classifyCns(
    text: string,
    customBlock?: BlockDescriptorContext,
    stemText = ''
  ): TaxonomyClassificationResult {
    const blockDescriptor: BlockDescriptorContext = customBlock || {
      id: 'cns',
      name: 'Central Nervous System',
      code: 'Block 207',
      shortName: 'CNS',
    };

    // 0. Diencephalon & Limbic System (Anatomy)
    const diencephalonLimbicKeywords = [
      'diencephalon',
      'thalamus',
      'thalamic',
      'pulvinar',
      'metathalamus',
      'medial geniculate',
      'lateral geniculate',
      'geniculate body',
      'subthalamus',
      'subthalamic',
      'hemiballismus',
      'hypothalamus',
      'hypothalamic',
      'supraoptic',
      'paraventricular',
      'suprachiasmatic',
      'tuber cinereum',
      'tuberal',
      'ventromedial nucleus',
      'arcuate nucleus',
      'infundibulum',
      'mammillary',
      'epithalamus',
      'pineal',
      'habenula',
      'habenular',
      'stria medullaris',
      'limbic system',
      'limbic',
      'hippocampus',
      'hippocampal',
      'dentate gyrus',
      'subiculum',
      'cornu ammonis',
      'fornix',
      'fimbria',
      'pes hippocampi',
      'alveus',
      'papez circuit',
      'korsakoff',
      'craniopharyngioma',
      'internal medullary lamina',
      'foramen of monro',
    ];

    const isStemDiencephalonLimbic = diencephalonLimbicKeywords.some((kw) =>
      stemText.includes(kw)
    );
    const isTextDiencephalonLimbic = diencephalonLimbicKeywords.some((kw) =>
      text.includes(kw)
    );
    const isInternalCapsuleStemFocus =
      stemText.includes('internal capsule') ||
      stemText.includes('projection fiber') ||
      stemText.includes('projection fibers') ||
      stemText.includes('thalamocortical radiation') ||
      stemText.includes('thalamocortical radiations') ||
      stemText.includes('corticofugal') ||
      stemText.includes('capsular stroke') ||
      stemText.includes('capsular hemorrhage') ||
      stemText.includes('lenticulostriate') ||
      stemText.includes('charcot');

    if (
      !isInternalCapsuleStemFocus &&
      (isStemDiencephalonLimbic || isTextDiencephalonLimbic)
    ) {
      const hasRegisteredChap = this.taxonomyRegistry.hasChapter(
        'cns-ana-diencephalon-limbic-system',
        'cns'
      );
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-diencephalon-limbic-system',
          chapterName: 'Diencephalon & Limbic System',
          confidenceScore: 98,
          rationale:
            'Evaluates diencephalic subdivisions (thalamus, metathalamus, subthalamus, hypothalamus, epithalamus) and limbic system components (hippocampal formation, fornix, amygdala, Papez circuit).',
          isNewDomainSuggested: !hasRegisteredChap,
          newChapterProposal: !hasRegisteredChap
            ? {
                id: 'cns-ana-diencephalon-limbic-system',
                name: 'Diencephalon & Limbic System',
                subjectId: 'anatomy',
                rationale:
                  'Covers diencephalic subdivisions (thalamus, hypothalamus, epithalamus, subthalamus) and the limbic system (hippocampal formation, fornix, amygdala).',
              }
            : undefined,
        },
        blockDescriptor
      );
    }

    // 1. Projection Fibers & Internal Capsule (Anatomy)
    const internalCapsuleKeywords = [
      'internal capsule',
      'projection fiber',
      'projection fibers',
      'anterior limb',
      'posterior limb',
      'genu',
      'retrolentiform',
      'retrolenticular',
      'sublentiform',
      'sublenticular',
      'thalamocortical radiation',
      'thalamocortical radiations',
      'sensory radiation',
      'optic radiation',
      'auditory radiation',
      'corticofugal',
      'corticopontine',
      'frontopontine',
      'lenticulostriate',
      'charcot',
      'capsular stroke',
      'capsular hemorrhage',
      'lentiform nucleus',
    ];

    if (internalCapsuleKeywords.some((kw) => text.includes(kw))) {
      const hasRegisteredChap = this.taxonomyRegistry.hasChapter('cns-ana-white-matter-internal-capsule', 'cns');
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-white-matter-internal-capsule',
          chapterName: 'Cerebral White Matter & Internal Capsule',
          confidenceScore: 98,
          rationale:
            'Evaluates cerebral projection fibers, internal capsule nuclear boundaries, thalamocortical radiations, somatotopy, and capsular blood supply.',
          isNewDomainSuggested: !hasRegisteredChap,
          newChapterProposal: !hasRegisteredChap
            ? {
                id: 'cns-ana-white-matter-internal-capsule',
                name: 'Cerebral White Matter & Internal Capsule',
                subjectId: 'anatomy',
                rationale:
                  'Covers cerebral projection fibers, internal capsule boundaries, thalamocortical radiations, and capsular arterial supply.',
              }
            : undefined,
        },
        blockDescriptor
      );
    }

    // 2. Cerebral Hemispheres, Cortical Areas & Circle of Willis (Anatomy)
    if (
      text.includes('brodmann') ||
      text.includes('motor cortex') ||
      text.includes('precentral gyrus') ||
      text.includes('postcentral gyrus') ||
      text.includes('somatosensory cortex') ||
      text.includes('frontal lobe') ||
      text.includes('parietal lobe') ||
      text.includes('temporal lobe') ||
      text.includes('occipital lobe') ||
      text.includes('circle of willis') ||
      text.includes('middle cerebral artery') ||
      text.includes('anterior cerebral artery') ||
      text.includes('posterior cerebral artery') ||
      text.includes('aphasia') ||
      text.includes('broca') ||
      text.includes('wernicke')
    ) {
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-cerebral-cortex-vascular',
          chapterName: 'Cerebral Hemispheres, Cortical Areas & Circle of Willis',
          confidenceScore: 95,
          rationale:
            'Evaluates cortical localization, cerebral hemisphere functional areas, or Circle of Willis cerebral hemodynamics.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 3. Cerebellum & Basal Ganglia (Anatomy)
    if (
      text.includes('basal ganglia') ||
      text.includes('caudate') ||
      text.includes('putamen') ||
      text.includes('globus pallidus') ||
      text.includes('substantia nigra') ||
      text.includes('striatum') ||
      text.includes('parkinson') ||
      text.includes('huntington') ||
      text.includes('chorea') ||
      text.includes('cerebellum') ||
      text.includes('vermis') ||
      text.includes('purkinje') ||
      text.includes('ataxia')
    ) {
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-cerebellum-basal-ganglia',
          chapterName: 'Cerebellum, Basal Ganglia & Diencephalon',
          confidenceScore: 95,
          rationale: 'Evaluates extrapyramidal motor circuits, deep cerebellar nuclei, and coordination.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 4. Brainstem Levels & Cranial Nerve Nuclei (Anatomy)
    if (
      text.includes('brainstem') ||
      text.includes('midbrain') ||
      text.includes('pons') ||
      text.includes('medulla') ||
      text.includes('cranial nerve') ||
      text.includes('oculomotor') ||
      text.includes('trochlear') ||
      text.includes('trigeminal') ||
      text.includes('abducens') ||
      text.includes('facial nerve') ||
      text.includes('vestibulocochlear') ||
      text.includes('glossopharyngeal') ||
      text.includes('vagus') ||
      text.includes('hypoglossal') ||
      text.includes('solitary nucleus') ||
      text.includes('nucleus ambiguus') ||
      text.includes('wallenberg')
    ) {
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-brainstem-cranial-nerves',
          chapterName: 'Brainstem Levels & Cranial Nerve Nuclei',
          confidenceScore: 94,
          rationale: 'Evaluates brainstem cross-sectional anatomy, cranial nerve nuclei columns, and localized brainstem syndromes.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 5. Spinal Cord Structure & Ascending/Descending Tracts (Anatomy)
    if (
      text.includes('spinal cord') ||
      text.includes('dorsal column') ||
      text.includes('gracilis') ||
      text.includes('cuneatus') ||
      text.includes('spinothalamic') ||
      text.includes('anterior horn') ||
      text.includes('substantia gelatinosa') ||
      text.includes('brown-sequard') ||
      text.includes('syringomyelia')
    ) {
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-spinal-cord-tracts',
          chapterName: 'Spinal Cord Structure & Ascending/Descending Tracts',
          confidenceScore: 94,
          rationale: 'Evaluates spinal cord tracts, ascending sensory pathways, and spinal cord hemisection deficits.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 6. Neural Tube, Meninges & CSF Dynamics (Anatomy)
    if (
      text.includes('neural tube') ||
      text.includes('spina bifida') ||
      text.includes('anencephaly') ||
      text.includes('meninges') ||
      text.includes('dura mater') ||
      text.includes('arachnoid') ||
      text.includes('pia mater') ||
      text.includes('csf') ||
      text.includes('cerebrospinal fluid') ||
      text.includes('choroid plexus') ||
      text.includes('hydrocephalus') ||
      text.includes('foramen of monro') ||
      text.includes('aqueduct of sylvius') ||
      text.includes('foramen of magendie') ||
      text.includes('luschka')
    ) {
      return this.createResult(
        {
          subjectId: 'anatomy',
          subjectName: 'CNS Neuroanatomy & Embryology',
          chapterId: 'cns-ana-embryology-meninges-csf',
          chapterName: 'Neural Tube, Meninges & CSF Dynamics',
          confidenceScore: 96,
          rationale: 'Direct correlation with CNS embryology, meningeal coverings, ventricular circulation, and CSF hydrodynamics.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 7. Neurophysiology
    if (
      text.includes('resting potential') ||
      text.includes('action potential') ||
      text.includes('synaptic') ||
      text.includes('neurotransmitter') ||
      text.includes('gaba') ||
      text.includes('glutamate') ||
      text.includes('eeg') ||
      text.includes('rem sleep') ||
      text.includes('somatosensory') ||
      text.includes('pain modulation')
    ) {
      return this.createResult(
        {
          subjectId: 'physiology',
          subjectName: 'CNS Neurophysiology',
          chapterId: 'cns-phy-excitable-synaptic',
          chapterName: 'Membrane Potentials & Synaptic Transmission',
          confidenceScore: 92,
          rationale: 'Evaluates neurophysiological membrane kinetics, excitability, and synaptic transmission.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 8. Neurohistology
    if (
      text.includes('astrocyte') ||
      text.includes('oligodendrocyte') ||
      text.includes('microglia') ||
      text.includes('schwann') ||
      text.includes('myelin') ||
      text.includes('node of ranvier') ||
      text.includes('ependyma')
    ) {
      return this.createResult(
        {
          subjectId: 'histology',
          subjectName: 'CNS Neurohistology',
          chapterId: 'cns-his-glial-cells',
          chapterName: 'CNS Neurohistology & Glial Architecture',
          confidenceScore: 93,
          rationale: 'Evaluates microscopic neurocellular architecture and neuroglial subtypes.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 9. Neuropathology / Microbiology
    if (
      text.includes('meningitis') ||
      text.includes('encephalitis') ||
      text.includes('glioblastoma') ||
      text.includes('meningioma') ||
      text.includes('multiple sclerosis') ||
      text.includes('alzheimer') ||
      text.includes('prion')
    ) {
      return this.createResult(
        {
          subjectId: 'pathology-micro',
          subjectName: 'CNS Pathology & Microbiology',
          chapterId: 'cns-pat-neurodegenerative-infections',
          chapterName: 'CNS Infections & Neurodegenerative Pathology',
          confidenceScore: 92,
          rationale: 'Evaluates central nervous system infections, inflammatory demyelination, or neuropathology.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // 10. Neuropharmacology
    if (
      text.includes('antiepileptic') ||
      text.includes('phenytoin') ||
      text.includes('carbamazepine') ||
      text.includes('valproate') ||
      text.includes('levodopa') ||
      text.includes('haloperidol') ||
      text.includes('benzodiazepine')
    ) {
      return this.createResult(
        {
          subjectId: 'pharmacology',
          subjectName: 'CNS Neuropharmacology',
          chapterId: 'cns-pha-neuro-drugs',
          chapterName: 'CNS Neuropharmacology & Synaptic Modulators',
          confidenceScore: 93,
          rationale: 'Evaluates neurological and psychiatric pharmacotherapy.',
          isNewDomainSuggested: false,
        },
        blockDescriptor
      );
    }

    // Default CNS Anatomy to Cerebral Hemispheres, Cortical Areas & Circle of Willis
    return this.createResult(
      {
        subjectId: 'anatomy',
        subjectName: 'CNS Neuroanatomy & Embryology',
        chapterId: 'cns-ana-cerebral-cortex-vascular',
        chapterName: 'Cerebral Hemispheres, Cortical Areas & Circle of Willis',
        confidenceScore: 82,
        rationale: 'Grounded within general CNS neuroanatomy and cortical vascular territories.',
        isNewDomainSuggested: false,
      },
      blockDescriptor
    );
  }

  /**
   * Detects whether the question content describes a curriculum domain
   * not adequately covered in standard anatomy/histology/microbiology/physiology.
   */
  private detectCurriculumGaps(text: string): TaxonomyClassificationResult | null {
    const hasPharmacologySubject = this.taxonomyRegistry.hasSubject('pharmacology');
    const hasPathologySubject = this.taxonomyRegistry.hasSubject('pathology');

    // Pharmacology triggers
    const pharmaTerms = [
      'beta-blocker',
      'metoprolol',
      'atenolol',
      'ace inhibitor',
      'lisinopril',
      'enalapril',
      'angiotensin',
      'digoxin',
      'amiodarone',
      'nitroglycerin',
      'furosemide',
      'statin',
      'atorvastatin',
      'clopidogrel',
      'warfarin',
      'heparin',
      'calcium channel blocker',
      'amlodipine',
      'verapamil',
      'diltiazem',
      'pharmacotherapy',
      'receptor antagonist',
    ];

    const isPharma = pharmaTerms.some((t) => text.includes(t));
    if (isPharma && !hasPharmacologySubject) {
      return this.createResult({
        subjectId: 'pharmacology',
        subjectName: 'CVS Pharmacology (Proposed)',
        chapterId: 'cvs-pha-cardiac-drugs',
        chapterName: 'Cardiovascular Pharmacotherapy & Receptor Mechanisms (Proposed)',
        confidenceScore: 92,
        rationale: 'Question assesses cardiovascular drug mechanisms and pharmacokinetics, which warrants a dedicated CVS Pharmacology curriculum branch.',
        isNewDomainSuggested: true,
        newSubjectProposal: {
          id: 'pharmacology',
          name: 'CVS Pharmacology',
          rationale: 'High-yield board exams frequently test cardiovascular pharmacotherapy (antiarrhythmics, inotropes, antihypertensives).',
        },
        newChapterProposal: {
          id: 'cvs-pha-cardiac-drugs',
          name: 'Cardiovascular Pharmacotherapy & Receptor Mechanisms',
          subjectId: 'pharmacology',
          rationale: 'Covers autonomic receptor ligands, antiarrhythmic classes I-IV, and heart failure medications.',
        },
      });
    }

    // Pathology triggers
    const pathologyTerms = [
      'atherosclerosis',
      'myocardial infarction',
      'transmural necrosis',
      'fibrous cap',
      'troponin elevation',
      'coronary thrombosis',
      'aortic aneurysm',
      'aortic dissection',
      'cardiac tamponade',
      'dressler syndrome',
    ];

    const isPathology = pathologyTerms.some((t) => text.includes(t));
    if (isPathology && !hasPathologySubject) {
      return this.createResult({
        subjectId: 'pathology',
        subjectName: 'CVS Pathology (Proposed)',
        chapterId: 'cvs-pat-ischemic-aortic',
        chapterName: 'Ischemic Heart Disease & Vascular Pathology (Proposed)',
        confidenceScore: 89,
        rationale: 'Question evaluates gross/microscopic cardiac pathology and acute vascular syndromes, ideal for a distinct CVS Pathology subject.',
        isNewDomainSuggested: true,
        newSubjectProposal: {
          id: 'pathology',
          name: 'CVS Pathology',
          rationale: 'Cardiovascular pathology (MI, atherosclerosis, aneurysms, vasculitides) forms a core USMLE/Board testing pillar.',
        },
        newChapterProposal: {
          id: 'cvs-pat-ischemic-aortic',
          name: 'Ischemic Heart Disease & Vascular Pathology',
          subjectId: 'pathology',
          rationale: 'Integrates acute coronary syndromes, infarction morphology, and acute aortic syndromes.',
        },
      });
    }

    return null;
  }

  /**
   * Matches question text against existing active chapters and subjects.
   */
  private matchAgainstRegisteredTaxonomy(text: string): TaxonomyClassificationResult {
    const subjects = this.taxonomyRegistry.getSubjects();
    const chapters = this.taxonomyRegistry.getChapters();

    // Dynamically Registered Disciplines (e.g. Pharmacology, Pathology)
    if (this.taxonomyRegistry.hasSubject('pharmacology')) {
      const pharmaTerms = [
        'beta-blocker',
        'metoprolol',
        'atenolol',
        'ace inhibitor',
        'lisinopril',
        'enalapril',
        'angiotensin',
        'digoxin',
        'amiodarone',
        'nitroglycerin',
        'furosemide',
        'statin',
        'atorvastatin',
        'clopidogrel',
        'warfarin',
        'heparin',
        'calcium channel blocker',
        'amlodipine',
        'verapamil',
        'diltiazem',
        'pharmacotherapy',
        'receptor antagonist',
        'propranolol',
      ];
      if (pharmaTerms.some((t) => text.includes(t))) {
        const phaChapters = this.taxonomyRegistry.getChapters('pharmacology');
        const chosenChap = phaChapters.find((c) => c.id === 'cvs-pha-cardiac-drugs') || phaChapters[0];
        const subj = subjects.find((s) => s.id === 'pharmacology');
        if (subj && chosenChap) {
          return this.createResult({
            subjectId: subj.id,
            subjectName: subj.name,
            chapterId: chosenChap.id,
            chapterName: chosenChap.name,
            confidenceScore: 95,
            rationale: 'Question evaluates cardiovascular drug mechanisms within the registered Pharmacology curriculum.',
            isNewDomainSuggested: false,
          });
        }
      }
    }

    if (this.taxonomyRegistry.hasSubject('pathology')) {
      const pathologyTerms = [
        'atherosclerosis',
        'myocardial infarction',
        'transmural necrosis',
        'fibrous cap',
        'troponin elevation',
        'coronary thrombosis',
        'aortic aneurysm',
        'aortic dissection',
        'cardiac tamponade',
        'dressler syndrome',
      ];
      if (pathologyTerms.some((t) => text.includes(t))) {
        const patChapters = this.taxonomyRegistry.getChapters('pathology');
        const chosenChap = patChapters.find((c) => c.id === 'cvs-pat-ischemic-aortic') || patChapters[0];
        const subj = subjects.find((s) => s.id === 'pathology');
        if (subj && chosenChap) {
          return this.createResult({
            subjectId: subj.id,
            subjectName: subj.name,
            chapterId: chosenChap.id,
            chapterName: chosenChap.name,
            confidenceScore: 94,
            rationale: 'Question evaluates cardiovascular pathology within the registered Pathology curriculum.',
            isNewDomainSuggested: false,
          });
        }
      }
    }

    // Embryology / Anatomy
    if (
      text.includes('embryo') ||
      text.includes('septum primum') ||
      text.includes('septum secundum') ||
      text.includes('bulbus cordis') ||
      text.includes('truncus') ||
      text.includes('foramen ovale') ||
      text.includes('congenital')
    ) {
      const devChap = chapters.find((c) => c.id === 'cvs-ana-heart-dev') || chapters[0];
      const subj = subjects.find((s) => s.id === devChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: devChap.id,
        chapterName: devChap.name,
        confidenceScore: 97,
        rationale: 'Direct correlation with cardiovascular embryological development and congenital septation.',
        isNewDomainSuggested: false,
      });
    }

    if (
      text.includes('aortic arch') ||
      text.includes('ductus arteriosus') ||
      text.includes('ductus venosus') ||
      text.includes('umbilical vein') ||
      text.includes('fetal circulation')
    ) {
      const fetalChap = chapters.find((c) => c.id === 'cvs-ana-fetal-circ-bv') || chapters[0];
      const subj = subjects.find((s) => s.id === fetalChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: fetalChap.id,
        chapterName: fetalChap.name,
        confidenceScore: 95,
        rationale: 'Direct alignment with fetal circulation and vascular arch branch development.',
        isNewDomainSuggested: false,
      });
    }

    if (
      text.includes('pericardium') ||
      text.includes('fossa ovalis') ||
      text.includes('coronary artery') ||
      text.includes('mediastinum') ||
      text.includes('phrenic nerve') ||
      text.includes('right atrium') ||
      text.includes('left ventricle')
    ) {
      const grossChap = chapters.find((c) => c.id === 'cvs-ana-heart-mediastinum') || chapters[0];
      const subj = subjects.find((s) => s.id === grossChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: grossChap.id,
        chapterName: grossChap.name,
        confidenceScore: 94,
        rationale: 'Question evaluates gross cardiac anatomy, mediastinal structures, and coronary anatomy.',
        isNewDomainSuggested: false,
      });
    }

    // Histology
    if (
      text.includes('intercalated disc') ||
      text.includes('purkinje') ||
      text.includes('endocardium') ||
      text.includes('myocardium') ||
      text.includes('epicardium') ||
      text.includes('tunica media') ||
      text.includes('tunica intima') ||
      text.includes('internal elastic lamina')
    ) {
      const isVessel = text.includes('tunica') || text.includes('arteriole') || text.includes('capillary');
      const histChap =
        chapters.find((c) => (isVessel ? c.id === 'cvs-his-blood-vessels' : c.id === 'cvs-his-heart')) ||
        chapters[0];
      const subj = subjects.find((s) => s.id === histChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: histChap.id,
        chapterName: histChap.name,
        confidenceScore: 96,
        rationale: 'Evaluates microscopic tissue architecture and specialized vascular histology.',
        isNewDomainSuggested: false,
      });
    }

    // Microbiology
    if (
      text.includes('rheumatic fever') ||
      text.includes('streptococcus') ||
      text.includes('jones criteria') ||
      text.includes('aso titer') ||
      text.includes('endocarditis') ||
      text.includes('duke criteria') ||
      text.includes('coxsackie') ||
      text.includes('myocarditis')
    ) {
      let micChap = chapters.find((c) => c.subjectId === 'microbiology');
      if (text.includes('rheumatic')) {
        micChap = chapters.find((c) => c.id === 'cvs-mic-rheumatic-fever') || micChap;
      } else if (text.includes('endocarditis')) {
        micChap = chapters.find((c) => c.id === 'cvs-mic-infective-endocarditis') || micChap;
      } else if (text.includes('myocarditis') || text.includes('viral')) {
        micChap = chapters.find((c) => c.id === 'cvs-mic-viral-myocarditis') || micChap;
      }
      const finalChap = micChap || chapters[0];
      const subj = subjects.find((s) => s.id === finalChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: finalChap.id,
        chapterName: finalChap.name,
        confidenceScore: 95,
        rationale: 'Question evaluates cardiovascular infectious diseases and post-streptococcal sequelae.',
        isNewDomainSuggested: false,
      });
    }

    // Physiology
    if (
      text.includes('action potential') ||
      text.includes('phase 0') ||
      text.includes('phase 4') ||
      text.includes('sa node') ||
      text.includes('av node') ||
      text.includes('refractory period') ||
      text.includes('qt interval') ||
      text.includes('arrhythmia')
    ) {
      const elecChap = chapters.find((c) => c.id === 'cvs-phy-electrophysiology') || chapters[0];
      const subj = subjects.find((s) => s.id === elecChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: elecChap.id,
        chapterName: elecChap.name,
        confidenceScore: 96,
        rationale: 'Cardiovascular electrophysiology, nodal automaticity, and action potential kinetics.',
        isNewDomainSuggested: false,
      });
    }

    if (
      text.includes('murmur') ||
      text.includes('sound') ||
      text.includes('s1') ||
      text.includes('s2') ||
      text.includes('s3') ||
      text.includes('s4') ||
      text.includes('isovolumetric') ||
      text.includes('wiggers') ||
      text.includes('stenosis') ||
      text.includes('regurgitation')
    ) {
      const cycleChap = chapters.find((c) => c.id === 'cvs-phy-cardiac-cycle') || chapters[0];
      const subj = subjects.find((s) => s.id === cycleChap.subjectId) || subjects[0];
      return this.createResult({
        subjectId: subj.id,
        subjectName: subj.name,
        chapterId: cycleChap.id,
        chapterName: cycleChap.name,
        confidenceScore: 94,
        rationale: 'Valve mechanics, cardiac cycle phases, and heart sound auscultation.',
        isNewDomainSuggested: false,
      });
    }

    // Default to Hemodynamics & BP Regulation
    const bpChap = chapters.find((c) => c.id === 'cvs-phy-hemodynamics-bp') || chapters[0];
    const subj = subjects.find((s) => s.id === bpChap.subjectId) || subjects[0];
    return this.createResult({
      subjectId: subj.id,
      subjectName: subj.name,
      chapterId: bpChap.id,
      chapterName: bpChap.name,
      confidenceScore: 88,
      rationale: 'Hemodynamic regulation, vascular resistance, and blood pressure reflex physiology.',
      isNewDomainSuggested: false,
    });
  }
}

export const curriculumClassificationAgent = new CurriculumClassificationAgent();
