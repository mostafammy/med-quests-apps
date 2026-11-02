import { describe, it, expect, beforeEach } from 'vitest';
import {
  CurriculumTaxonomyRegistry,
} from '../CurriculumTaxonomyRegistry.ts';
import {
  CurriculumClassificationAgent,
} from '../CurriculumClassificationAgent.ts';

describe('CurriculumTaxonomyRegistry (SOLID Registry & Dynamic Hierarchy)', () => {
  let registry: CurriculumTaxonomyRegistry;

  beforeEach(() => {
    registry = CurriculumTaxonomyRegistry.getInstance();
    registry.resetToCanonical();
  });

  it('initializes with canonical CVS taxonomy (4 subjects and 11 chapters)', () => {
    const subjects = registry.getSubjects();
    const chapters = registry.getChapters();

    expect(subjects.length).toBe(4);
    expect(chapters.length).toBe(11);
    expect(registry.hasSubject('anatomy')).toBe(true);
    expect(registry.hasSubject('physiology')).toBe(true);
    expect(registry.hasSubject('histology')).toBe(true);
    expect(registry.hasSubject('microbiology')).toBe(true);
    expect(registry.hasSubject('pharmacology')).toBe(false);
  });

  it('filters chapters by subjectId', () => {
    const anatomyChapters = registry.getChapters('anatomy');
    expect(anatomyChapters.length).toBeGreaterThan(0);
    anatomyChapters.forEach((ch) => expect(ch.subjectId).toBe('anatomy'));

    const physiologyChapters = registry.getChapters('physiology');
    expect(physiologyChapters.length).toBeGreaterThan(0);
    physiologyChapters.forEach((ch) => expect(ch.subjectId).toBe('physiology'));
  });

  it('dynamically registers a new subject and notifies listeners', () => {
    let notified = false;
    const unsubscribe = registry.subscribe(() => {
      notified = true;
    });

    const newSubj = registry.registerSubject({
      id: 'pharmacology',
      name: 'Cardiovascular Pharmacology',
    });

    expect(newSubj.id).toBe('pharmacology');
    expect(registry.hasSubject('pharmacology')).toBe(true);
    expect(registry.getSubjects().length).toBe(5);
    expect(notified).toBe(true);

    unsubscribe();
  });

  it('dynamically registers a new chapter under a registered subject', () => {
    registry.registerSubject({
      id: 'pathology',
      name: 'Cardiovascular Pathology',
    });

    const newChapter = registry.registerChapter({
      id: 'cvs-pat-infarction',
      name: 'Myocardial Infarction & Ischemia',
      subjectId: 'pathology',
    });

    expect(newChapter.id).toBe('cvs-pat-infarction');
    expect(registry.hasChapter('cvs-pat-infarction')).toBe(true);
    const patChapters = registry.getChapters('pathology');
    expect(patChapters.length).toBe(1);
    expect(patChapters[0].id).toBe('cvs-pat-infarction');
  });

  it('resetToCanonical cleanly rolls back dynamic registrations', () => {
    registry.registerSubject({
      id: 'genetics',
      name: 'Cardiovascular Genetics',
    });
    expect(registry.hasSubject('genetics')).toBe(true);

    registry.resetToCanonical();
    expect(registry.hasSubject('genetics')).toBe(false);
    expect(registry.getSubjects().length).toBe(4);
  });
});

describe('CurriculumClassificationAgent (Auto-Classification & Gap Detection)', () => {
  let registry: CurriculumTaxonomyRegistry;
  let agent: CurriculumClassificationAgent;

  beforeEach(() => {
    registry = CurriculumTaxonomyRegistry.getInstance();
    registry.resetToCanonical();
    agent = new CurriculumClassificationAgent(registry);
  });

  it('classifies cardiac embryology question to canonical anatomy development chapter', () => {
    const result = agent.classify(
      'A newborn presents with cyanosis. Cardiac ultrasound reveals failure of the septum primum and septum secundum to fuse.',
      'A. Patent ductus arteriosus\nB. Atrial septal defect\nC. Tetralogy of Fallot\nD. Ventricular septal defect',
      'Atrial septation involves sequential growth of septum primum and septum secundum.'
    );

    expect(result.blockId).toBe('cvs');
    expect(result.blockName).toContain('Cardiovascular System');
    expect(result.subjectId).toBe('anatomy');
    expect(result.chapterId).toBe('cvs-ana-heart-dev');
    expect(result.isNewDomainSuggested).toBe(false);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
  });

  it('classifies murmur question to canonical physiology cardiac cycle chapter', () => {
    const result = agent.classify(
      'A 62-year-old male presents with a harsh crescendo-decrescendo systolic murmur at the right upper sternal border with radiation to the carotids.',
      'A. Mitral regurgitation\nB. Aortic stenosis\nC. Aortic regurgitation\nD. Mitral valve prolapse',
      'Aortic stenosis produces a classic systolic ejection murmur radiating to carotid arteries.'
    );

    expect(result.subjectId).toBe('physiology');
    expect(result.chapterId).toBe('cvs-phy-cardiac-cycle');
    expect(result.isNewDomainSuggested).toBe(false);
  });

  it('detects unmapped pharmacology domain and generates dynamic curriculum expansion proposals', () => {
    const result = agent.classify(
      'A patient with acute decompensated heart failure is prescribed carvedilol and lisinopril. Which beta-blocker receptor mechanism explains the improvement in ejection fraction?',
      'A. Beta-1 agonism\nB. Non-selective beta blockade with alpha-1 antagonism\nC. Muscarinic M2 stimulation\nD. ACE enzyme upregulation',
      'Carvedilol provides non-selective beta blockade along with alpha-1 receptor antagonism.'
    );

    expect(result.isNewDomainSuggested).toBe(true);
    expect(result.subjectId).toBe('pharmacology');
    expect(result.newSubjectProposal).toBeDefined();
    expect(result.newSubjectProposal?.id).toBe('pharmacology');
    expect(result.newChapterProposal).toBeDefined();
    expect(result.newChapterProposal?.id).toBe('cvs-pha-cardiac-drugs');
  });

  it('detects unmapped pathology domain for myocardial infarction and acute aortic syndromes', () => {
    const result = agent.classify(
      'Autopsy examination of a 55-year-old male who died suddenly reveals transmural necrosis and acute coronary thrombosis with fibrous cap rupture.',
      'A. Myocardial infarction\nB. Dilated cardiomyopathy\nC. Hypertrophic cardiomyopathy\nD. Myocarditis',
      'Coronary plaque rupture with thrombus formation leads to acute transmural myocardial necrosis.'
    );

    expect(result.isNewDomainSuggested).toBe(true);
    expect(result.subjectId).toBe('pathology');
    expect(result.newSubjectProposal?.id).toBe('pathology');
    expect(result.newChapterProposal?.id).toBe('cvs-pat-ischemic-aortic');
  });

  it('integrates dynamically once proposed subject is approved and registered', () => {
    // 1. First run flags gap
    const initialResult = agent.classify(
      'A patient with atrial fibrillation receives amiodarone. Which ion channel is primarily blocked?',
      'A. Sodium\nB. Potassium\nC. Calcium\nD. Chloride',
      'Amiodarone is a Class III antiarrhythmic that primarily prolongs repolarization via potassium channel blockade.'
    );
    expect(initialResult.isNewDomainSuggested).toBe(true);

    // 2. Administrator approves the proposal
    registry.registerSubject({
      id: initialResult.newSubjectProposal!.id,
      name: initialResult.newSubjectProposal!.name,
    });
    registry.registerChapter({
      id: initialResult.newChapterProposal!.id,
      name: initialResult.newChapterProposal!.name,
      subjectId: initialResult.newChapterProposal!.subjectId,
    });

    // 3. Second run directly recognizes the registered curriculum branch without flagging gap
    const postApprovalResult = agent.classify(
      'Which beta-blocker is cardioselective and primarily blocks beta-1 receptors in the heart: metoprolol or propranolol?',
      'A. Metoprolol\nB. Propranolol\nC. Timolol\nD. Nadolol',
      'Metoprolol is a cardioselective beta-1 adrenergic antagonist.'
    );
    expect(postApprovalResult.isNewDomainSuggested).toBe(false);
    expect(postApprovalResult.subjectId).toBe('pharmacology');
    expect(postApprovalResult.chapterId).toBe('cvs-pha-cardiac-drugs');
  });
});
