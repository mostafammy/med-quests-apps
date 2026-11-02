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

export class CurriculumClassificationAgent {
  constructor(
    private readonly taxonomyRegistry: ICurriculumTaxonomyRegistry = CurriculumTaxonomyRegistry.getInstance()
  ) {}

  private createResult(
    params: Omit<TaxonomyClassificationResult, 'blockId' | 'blockName'>
  ): TaxonomyClassificationResult {
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
    explanationText = ''
  ): TaxonomyClassificationResult {
    const combined = `${stem} ${choicesText} ${explanationText}`.toLowerCase();

    // 1. GAP ANALYSIS: Check if content belongs to an unmapped specialty (e.g. Pharmacology or Pathology)
    const gapAssessment = this.detectCurriculumGaps(combined);
    if (gapAssessment) {
      return gapAssessment;
    }

    // 2. CANONICAL CLASSIFICATION: Match against active registered taxonomy
    return this.matchAgainstRegisteredTaxonomy(combined);
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
