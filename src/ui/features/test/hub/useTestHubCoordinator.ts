/**
 * useTestHubCoordinator
 *
 * Dedicated custom hook encapsulating all state management, URL synchronization,
 * block memento persistence, dynamic question count derivation, and session launch
 * orchestration for TestHub.
 *
 * Follows the Single Responsibility Principle: Separation of Intent from Mechanism.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveTaxonomy, useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import { defaultBlockMementoStore } from '../../../../infrastructure/curriculum/LocalStorageBlockMementoStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useStatsStore } from '../../../../application/stores/useStatsStore.ts';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { TestMode, RepetitionFilter } from './types.ts';

export function useTestHubCoordinator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { questions } = useQuestionStore();
  const {
    refreshStats,
    getScopeCoverage,
    answeredQuestionIds,
    correctQuestionIds,
    mistakeQuestionIds,
    resetSubjectStats,
  } = useStatsStore();
  const { t } = useLocaleStore();
  const taxonomy = useActiveTaxonomy();
  const { activeBlockId } = useBlockContextStore();

  // Mode & configuration state
  const [selectedMode, setSelectedMode] = useState<TestMode>('practice');
  const [repetitionFilter, setRepetitionFilter] = useState<RepetitionFilter>('unanswered');
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    const subParam = searchParams.get('subject');
    if (subParam) {
      const match = taxonomy.subjects.find(
        (s) => s.id.toLowerCase() === subParam.toLowerCase() || s.name.toLowerCase().includes(subParam.toLowerCase())
      );
      if (match) return match.id;
    }
    const memento = defaultBlockMementoStore.load(activeBlockId);
    if (
      memento?.testHub?.subjectId &&
      (memento.testHub.subjectId === 'all' || taxonomy.subjects.some((s) => s.id === memento.testHub.subjectId))
    ) {
      return memento.testHub.subjectId;
    }
    return 'all';
  });

  const [selectedChapter, setSelectedChapter] = useState<string>(() => {
    const memento = defaultBlockMementoStore.load(activeBlockId);
    if (
      memento?.testHub?.chapterId &&
      (memento.testHub.chapterId === 'all' || taxonomy.chapters.some((c) => c.id === memento.testHub.chapterId))
    ) {
      return memento.testHub.chapterId;
    }
    return 'all';
  });

  const [questionCount, setQuestionCount] = useState<number | 'all'>(() => {
    const memento = defaultBlockMementoStore.load(activeBlockId);
    return memento?.testHub?.count ?? 20;
  });

  const [highYieldOnly, setHighYieldOnly] = useState<boolean>(() => {
    const memento = defaultBlockMementoStore.load(activeBlockId);
    return memento?.testHub?.highYieldOnly ?? false;
  });

  const [timedSprint, setTimedSprint] = useState<boolean>(false);
  const [showResetBankModal, setShowResetBankModal] = useState<boolean>(false);

  // Refresh attempts from IndexedDB on mount & question changes
  useEffect(() => {
    refreshStats(questions, activeBlockId);
  }, [questions, refreshStats, activeBlockId]);

  // 1. Sync when curriculum block changes (e.g. user toggles CVS <-> CNS)
  const prevBlockIdRef = useRef(activeBlockId);
  useEffect(() => {
    if (prevBlockIdRef.current !== activeBlockId) {
      prevBlockIdRef.current = activeBlockId;
      const memento = defaultBlockMementoStore.load(activeBlockId);
      if (
        memento?.testHub?.subjectId &&
        (memento.testHub.subjectId === 'all' || taxonomy.subjects.some((s) => s.id === memento.testHub.subjectId))
      ) {
        setSelectedSubject(memento.testHub.subjectId);
        setSelectedChapter(
          memento.testHub.chapterId &&
          (memento.testHub.chapterId === 'all' || taxonomy.chapters.some((c) => c.id === memento.testHub.chapterId))
            ? memento.testHub.chapterId
            : 'all'
        );
        setQuestionCount(memento.testHub.count ?? 20);
        setHighYieldOnly(memento.testHub.highYieldOnly ?? false);
      } else {
        setSelectedSubject('all');
        setSelectedChapter('all');
      }
    }
  }, [activeBlockId, taxonomy.subjects, taxonomy.chapters]);

  // 2. Sync when URL search parameter (?subject=...) changes
  const subParam = searchParams.get('subject');
  const prevSubParamRef = useRef(subParam);
  useEffect(() => {
    if (subParam && subParam !== prevSubParamRef.current) {
      prevSubParamRef.current = subParam;
      const match = taxonomy.subjects.find(
        (s) => s.id.toLowerCase() === subParam.toLowerCase() || s.name.toLowerCase().includes(subParam.toLowerCase())
      );
      if (match) {
        setSelectedSubject(match.id);
        setSelectedChapter('all');
      }
    }
  }, [subParam, taxonomy.subjects]);

  // 3. Fallback: Reconcile if selectedSubject or selectedChapter became invalid for active taxonomy
  useEffect(() => {
    if (selectedSubject !== 'all' && !taxonomy.subjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject('all');
      setSelectedChapter('all');
    }
  }, [selectedSubject, taxonomy.subjects]);

  // 4. Persist user filter choices to block memento
  useEffect(() => {
    defaultBlockMementoStore.save({
      blockId: activeBlockId,
      testHub: {
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        count: questionCount,
        highYieldOnly,
      },
      reviewTab: null,
      savedAtIso: new Date().toISOString(),
    });
  }, [activeBlockId, selectedSubject, selectedChapter, questionCount, highYieldOnly]);

  // Filter available chapters by selected subject
  const availableChapters = useMemo(() => {
    return selectedSubject === 'all'
      ? taxonomy.chapters
      : taxonomy.chapters.filter((c) => c.subjectId === selectedSubject);
  }, [selectedSubject, taxonomy.chapters]);

  // Curriculum scope coverage metrics
  const scopeCoverage = useMemo(() => {
    return getScopeCoverage(questions, {
      subjectId: selectedSubject,
      chapterId: selectedChapter,
      highYieldOnly,
    });
  }, [questions, selectedSubject, selectedChapter, highYieldOnly, answeredQuestionIds, correctQuestionIds, mistakeQuestionIds, getScopeCoverage]);

  // Dynamic question counts based on filter criteria & repetition scope
  const matchingQuestionCount = useMemo(() => {
    if (selectedMode === 'mock') return 50;
    if (selectedMode === 'rapid') return Math.min(scopeCoverage.total, 15);
    if (repetitionFilter === 'unanswered') return scopeCoverage.unanswered;
    if (repetitionFilter === 'incorrect') return scopeCoverage.incorrect;
    return scopeCoverage.total;
  }, [selectedMode, repetitionFilter, scopeCoverage]);

  // Effective question count for the active session configuration
  const effectiveQuestionCount = useMemo(() => {
    if (questionCount === 'all') {
      return matchingQuestionCount;
    }
    return Math.min(matchingQuestionCount, questionCount);
  }, [questionCount, matchingQuestionCount]);

  // Dynamic human-readable label for the currently targeted category
  const selectedCategoryLabel = useMemo(() => {
    if (selectedChapter !== 'all') {
      const ch = taxonomy.chapters.find((c) => c.id === selectedChapter);
      if (ch) return ch.name;
    }
    if (selectedSubject !== 'all') {
      const sub = taxonomy.subjects.find((s) => s.id === selectedSubject);
      if (sub) return sub.name;
    }
    return t.test.allSubjects.replace('{blockName}', taxonomy.block.name);
  }, [selectedSubject, selectedChapter, taxonomy, t]);

  // Subject statistics for badge counters
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: questions.length };
    taxonomy.subjects.forEach((s) => {
      counts[s.id] = questions.filter((q) => q && q.subjectId === s.id).length;
    });
    return counts;
  }, [questions, taxonomy.subjects]);

  // Master launch handler
  const handleLaunchSession = (
    overrideCount?: number | 'all',
    overrideMode?: TestMode,
    overrideFilter?: RepetitionFilter
  ) => {
    const targetMode = overrideMode || selectedMode;
    const effectiveCountMode = overrideCount !== undefined ? overrideCount : questionCount;
    const activeFilter = overrideFilter || repetitionFilter;

    if (targetMode === 'mock') {
      navigate('/session/mock-exam', {
        state: {
          mode: 'mock',
          subjectId: 'all',
          chapterId: 'all',
          questionCount: 50,
          timeLimitMinutes: 120,
        },
      });
      return;
    }

    if (targetMode === 'rapid') {
      navigate('/session/rapid-sprint', {
        state: {
          mode: 'rapid',
          subjectId: selectedSubject,
          chapterId: selectedChapter,
          questionCount: Math.min(scopeCoverage.total, 15),
          timeLimitMinutes: 15,
          highYieldOnly: true,
        },
      });
      return;
    }

    // Practice mode
    let targetPoolIds: string[] | undefined = undefined;
    let targetPoolCount = scopeCoverage.total;

    if (activeFilter === 'unanswered') {
      targetPoolIds = scopeCoverage.unansweredIds;
      targetPoolCount = scopeCoverage.unanswered;
    } else if (activeFilter === 'incorrect') {
      targetPoolIds = scopeCoverage.incorrectIds;
      targetPoolCount = scopeCoverage.incorrect;
    }

    const count = effectiveCountMode === 'all'
      ? targetPoolCount
      : Math.min(targetPoolCount, effectiveCountMode);

    navigate('/session/practice-now', {
      state: {
        mode: 'practice',
        subjectId: selectedSubject,
        chapterId: selectedChapter,
        questionCount: count,
        questionFilter: activeFilter,
        questionIds: targetPoolIds ? targetPoolIds.slice(0, count) : undefined,
        highYieldOnly,
        timeLimitMinutes: timedSprint ? Math.ceil(count * 1.5) : undefined,
      },
    });
  };

  // Keyboard accelerators (Cmd/Ctrl + Enter to launch, 1/2/3 to switch modes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleLaunchSession();
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') {
          setSelectedMode('practice');
        } else if (e.key === '2') {
          setSelectedMode('mock');
        } else if (e.key === '3') {
          setSelectedMode('rapid');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, selectedSubject, selectedChapter, questionCount, highYieldOnly, timedSprint, matchingQuestionCount]);

  return {
    taxonomy,
    questions,
    t,
    selectedMode,
    setSelectedMode,
    repetitionFilter,
    setRepetitionFilter,
    selectedSubject,
    setSelectedSubject,
    selectedChapter,
    setSelectedChapter,
    questionCount,
    setQuestionCount,
    highYieldOnly,
    setHighYieldOnly,
    timedSprint,
    setTimedSprint,
    showResetBankModal,
    setShowResetBankModal,
    availableChapters,
    scopeCoverage,
    matchingQuestionCount,
    effectiveQuestionCount,
    selectedCategoryLabel,
    subjectCounts,
    handleLaunchSession,
    resetSubjectStats,
  };
}
