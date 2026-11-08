import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../../domain/auth/entitlements.ts';
import { db } from '../../../../infrastructure/storage/db.ts';

export function useAuthModalCoordinator() {
  const {
    authState,
    isModalOpen,
    activeModalTab,
    closeModal,
    openModal,
    openGovernanceDrawer,
    signInWithGoogle,
    signOut,
    revokeDevice,
    updatePhoneNumber,
  } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState<'google' | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState<string>(
    authState.status === 'authenticated-active' ? authState.user.phoneNumber || '' : ''
  );
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSavedSuccess, setPhoneSavedSuccess] = useState(false);
  const { questions } = useQuestionStore();
  const { t } = useLocaleStore();

  useEffect(() => {
    if (authState.status === 'authenticated-active') {
      setPhoneInput(authState.user.phoneNumber || '');
    }
  }, [authState]);

  // Local IndexedDB Guest Stats for Live Continuity Feedback
  const [localStats, setLocalStats] = useState<{ attempts: number; bookmarks: number }>({
    attempts: 0,
    bookmarks: 0,
  });

  const isGuest = authState.status === 'anonymous-guest';
  const role = isGuest ? 'anonymous' : authState.user.role;
  const policy = ROLE_ENTITLEMENT_POLICIES[role];

  // Query offline study items from IndexedDB
  useEffect(() => {
    if (isGuest && isModalOpen) {
      Promise.all([db.attempts.count(), db.bookmarks.count()])
        .then(([attempts, bookmarks]) => {
          setLocalStats({ attempts, bookmarks });
        })
        .catch(() => {
          setLocalStats({ attempts: 0, bookmarks: 0 });
        });
    }
  }, [isGuest, isModalOpen]);

  // Keyboard 'Esc' listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setSubmittingProvider('google');
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
      setSubmittingProvider(null);
    }
  };

  const handleSavePhone = async () => {
    if (isSavingPhone || !phoneInput.trim()) return;
    setIsSavingPhone(true);
    try {
      const ok = await updatePhoneNumber(phoneInput);
      if (ok) {
        setPhoneSavedSuccess(true);
        setTimeout(() => setPhoneSavedSuccess(false), 3000);
      }
    } finally {
      setIsSavingPhone(false);
    }
  };

  return {
    authState,
    isModalOpen,
    activeModalTab,
    closeModal,
    openModal,
    openGovernanceDrawer,
    isGuest,
    policy,
    questionsCount: questions.length,
    t,
    localStats,
    isSubmitting,
    submittingProvider,
    handleGoogleSignIn,
    signOut,
    revokeDevice,
    phoneInput,
    setPhoneInput,
    isSavingPhone,
    phoneSavedSuccess,
    handleSavePhone,
    showResetModal,
    setShowResetModal,
  };
}
