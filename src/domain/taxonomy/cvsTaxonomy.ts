import { Taxonomy } from '../model/types.ts';

export const CVS_TAXONOMY: Taxonomy = {
  block: {
    id: 'cvs',
    name: 'Cardiovascular System',
    shortName: 'CVS',
    code: 'Block 206',
    description: 'Integrated Cardiovascular Block: Anatomy, Embryology, Histology & Microbiology',
    subjectIds: ['anatomy', 'histology', 'microbiology'],
  },
  subjects: [
    { id: 'anatomy', blockId: 'cvs', name: 'CVS Anatomy & Embryology', order: 1 },
    { id: 'histology', blockId: 'cvs', name: 'CVS Histology', order: 2 },
    { id: 'microbiology', blockId: 'cvs', name: 'CVS Microbiology', order: 3 },
  ],
  chapters: [
    // Anatomy
    {
      id: 'cvs-ana-heart-mediastinum',
      blockId: 'cvs',
      subjectId: 'anatomy',
      name: 'Heart & Mediastinum',
      order: 1,
      sourceIds: ['SRC-CVS-ANA-01'],
    },
    {
      id: 'cvs-ana-heart-dev',
      blockId: 'cvs',
      subjectId: 'anatomy',
      name: 'Development of the Heart',
      order: 2,
      sourceIds: ['SRC-CVS-ANA-02'],
    },
    {
      id: 'cvs-ana-fetal-circ-bv',
      blockId: 'cvs',
      subjectId: 'anatomy',
      name: 'Fetal Circulation & Vascular Development',
      order: 3,
      sourceIds: ['SRC-CVS-ANA-03'],
    },
    // Histology
    {
      id: 'cvs-his-heart',
      blockId: 'cvs',
      subjectId: 'histology',
      name: 'Histology of the Heart (L3)',
      order: 4,
      sourceIds: ['SRC-CVS-HIS-01'],
    },
    {
      id: 'cvs-his-blood-vessels',
      blockId: 'cvs',
      subjectId: 'histology',
      name: 'Histology of Blood Vessels (L24 & L25)',
      order: 5,
      sourceIds: ['SRC-CVS-HIS-02'],
    },
    // Microbiology
    {
      id: 'cvs-mic-rheumatic-fever',
      blockId: 'cvs',
      subjectId: 'microbiology',
      name: 'Rheumatic Fever (L1)',
      order: 6,
      sourceIds: ['SRC-CVS-MIC-01'],
    },
    {
      id: 'cvs-mic-infective-endocarditis',
      blockId: 'cvs',
      subjectId: 'microbiology',
      name: 'Infective Endocarditis (L2)',
      order: 7,
      sourceIds: ['SRC-CVS-MIC-01'],
    },
    {
      id: 'cvs-mic-viral-myocarditis',
      blockId: 'cvs',
      subjectId: 'microbiology',
      name: 'Viral Myocarditis (L3)',
      order: 8,
      sourceIds: ['SRC-CVS-MIC-01'],
    },
  ],
  topics: [
    // Anatomy - Heart & Mediastinum
    { id: 'cvs-ana-pericardium', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Pericardium & Sinuses', order: 1 },
    { id: 'cvs-ana-chambers-ra-rv', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Right Atrium & Right Ventricle', order: 2 },
    { id: 'cvs-ana-chambers-la-lv', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Left Atrium & Left Ventricle', order: 3 },
    { id: 'cvs-ana-valves', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Cardiac Valves & Fibrous Skeleton', order: 4 },
    { id: 'cvs-ana-coronary-circulation', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Coronary Arteries & Cardiac Veins', order: 5 },
    { id: 'cvs-ana-conducting-system', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Conducting System & Innervation', order: 6 },
    { id: 'cvs-ana-great-vessels', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Great Vessels, Azygos & Thoracic Duct', order: 7 },
    { id: 'cvs-ana-mediastinum-nerves', blockId: 'cvs', chapterId: 'cvs-ana-heart-mediastinum', name: 'Mediastinal Nerves (Phrenic, Vagus, Sympathetic)', order: 8 },

    // Anatomy - Heart Development
    { id: 'cvs-ana-heart-tube-folding', blockId: 'cvs', chapterId: 'cvs-ana-heart-dev', name: 'Cardiogenic Area & Heart Tube Looping', order: 9 },
    { id: 'cvs-ana-atrial-septation', blockId: 'cvs', chapterId: 'cvs-ana-heart-dev', name: 'Atrial Septation & Sinus Venosus', order: 10 },
    { id: 'cvs-ana-ventricular-septation', blockId: 'cvs', chapterId: 'cvs-ana-heart-dev', name: 'Interventricular & Bulbus Cordis Septation', order: 11 },
    { id: 'cvs-ana-great-arteries-dev', blockId: 'cvs', chapterId: 'cvs-ana-heart-dev', name: 'Truncus Partitioning & Semilunar Valves', order: 12 },
    { id: 'cvs-ana-congenital-heart-anomalies', blockId: 'cvs', chapterId: 'cvs-ana-heart-dev', name: 'Congenital Anomalies (ASD, VSD, TGA, Fallot)', order: 13 },

    // Anatomy - Fetal Circulation & Vascular Development
    { id: 'cvs-ana-aortic-arches', blockId: 'cvs', chapterId: 'cvs-ana-fetal-circ-bv', name: 'Aortic Arches Derivatives & Anomalies', order: 14 },
    { id: 'cvs-ana-veins-dev', blockId: 'cvs', chapterId: 'cvs-ana-fetal-circ-bv', name: 'Cardinal, Vitelline & Umbilical Veins (SVC/IVC)', order: 15 },
    { id: 'cvs-ana-fetal-circulation-shunts', blockId: 'cvs', chapterId: 'cvs-ana-fetal-circ-bv', name: 'Fetal Shunts & Circulatory Changes at Birth', order: 16 },

    // Histology - Heart
    { id: 'cvs-his-heart-wall-layers', blockId: 'cvs', chapterId: 'cvs-his-heart', name: 'Endocardium, Myocardium & Epicardium', order: 17 },
    { id: 'cvs-his-purkinje-conduction', blockId: 'cvs', chapterId: 'cvs-his-heart', name: 'Purkinje Fibres & Intercalated Discs', order: 18 },
    { id: 'cvs-his-cardiac-skeleton-valves', blockId: 'cvs', chapterId: 'cvs-his-heart', name: 'Cardiac Skeleton & Valve Histology', order: 19 },

    // Histology - Blood Vessels
    { id: 'cvs-his-vessel-layers', blockId: 'cvs', chapterId: 'cvs-his-blood-vessels', name: 'Tunica Intima, Media & Adventitia', order: 20 },
    { id: 'cvs-his-elastic-muscular-arteries', blockId: 'cvs', chapterId: 'cvs-his-blood-vessels', name: 'Elastic Arteries, Muscular Arteries & Veins', order: 21 },
    { id: 'cvs-his-capillaries-endothelium', blockId: 'cvs', chapterId: 'cvs-his-blood-vessels', name: 'Capillary Types & Endothelial Functions', order: 22 },
    { id: 'cvs-his-specialized-vessels', blockId: 'cvs', chapterId: 'cvs-his-blood-vessels', name: 'Carotid Sinus, Carotid Body & Umbilical Vessels', order: 23 },

    // Microbiology - Rheumatic Fever
    { id: 'cvs-mic-rf-etiology-mimicry', blockId: 'cvs', chapterId: 'cvs-mic-rheumatic-fever', name: 'GAS, M Protein & Molecular Mimicry', order: 24 },
    { id: 'cvs-mic-rf-jones-criteria', blockId: 'cvs', chapterId: 'cvs-mic-rheumatic-fever', name: 'Clinical Features, Pancarditis & JONES Criteria', order: 25 },
    { id: 'cvs-mic-rf-diagnosis-prevention', blockId: 'cvs', chapterId: 'cvs-mic-rheumatic-fever', name: 'Diagnosis (ASO) & Secondary Prophylaxis', order: 26 },

    // Microbiology - Infective Endocarditis
    { id: 'cvs-mic-ie-pathogens', blockId: 'cvs', chapterId: 'cvs-mic-infective-endocarditis', name: 'Microbial Etiology (Viridans, S. aureus, Enterococci)', order: 27 },
    { id: 'cvs-mic-ie-pathogenesis-lesions', blockId: 'cvs', chapterId: 'cvs-mic-infective-endocarditis', name: 'Vegetations, Duke Criteria & Peripheral Stigmata', order: 28 },

    // Microbiology - Viral Myocarditis
    { id: 'cvs-mic-myocarditis-causes', blockId: 'cvs', chapterId: 'cvs-mic-viral-myocarditis', name: 'Viral Pathogens (Coxsackie B, Adenovirus, Parvo B19)', order: 29 },
    { id: 'cvs-mic-myocarditis-clinic-diag', blockId: 'cvs', chapterId: 'cvs-mic-viral-myocarditis', name: 'Pathology, Cardiac Enzymes & Clinical Presentation', order: 30 },
  ],
};
