import React from 'react';
import { X, User, Shield, Smartphone } from 'lucide-react';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';
import { useAuthModalCoordinator } from './components/useAuthModalCoordinator.ts';
import { GuestAuthView } from './components/GuestAuthView.tsx';
import { AuthenticatedProfileView } from './components/AuthenticatedProfileView.tsx';
import { ActiveDevicesView } from './components/ActiveDevicesView.tsx';

export const AuthSecurityModal: React.FC = () => {
  const coordinator = useAuthModalCoordinator();

  if (!coordinator.isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={coordinator.closeModal}
        className="fixed inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Card */}
      <div className="animate-sheet-slide-up sm:animate-spring-modal-in glass-surface relative z-10 w-full max-w-xl overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-zinc-200/80 shadow-2xl dark:border-zinc-800/80">
        {/* Apple Mobile Sheet Handle Bar */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 text-blue-600 shadow-inner dark:text-blue-400 shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="auth-modal-title"
                  className="font-heading text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Identity, Edge & Adaptive UX
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Edge Verified ~2ms
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                Sub-5ms Cloudflare Edge Verification & Hardware-Optimized Compositor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={coordinator.closeModal}
            aria-label="Close Security Modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 apple-tap cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200/60 px-4 sm:px-6 dark:border-zinc-800/60 overflow-x-auto scrollbar-none scroll-momentum">
          <button
            type="button"
            onClick={() => coordinator.openModal('sign-in')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-semibold transition-all shrink-0 apple-tap cursor-pointer ${
              coordinator.activeModalTab === 'sign-in'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{coordinator.isGuest ? 'Sign In / Up' : 'Profile & Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => coordinator.openModal('security-devices')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-semibold transition-all shrink-0 apple-tap cursor-pointer ${
              coordinator.activeModalTab === 'security-devices'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Active Devices</span>
            {coordinator.authState.status === 'authenticated-active' && (
              <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {coordinator.authState.activeSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75dvh] sm:max-h-[72vh] overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] scroll-momentum">
          {coordinator.activeModalTab === 'sign-in' && (
            coordinator.isGuest ? (
              <GuestAuthView
                localStats={coordinator.localStats}
                questionsCount={coordinator.questionsCount}
                t={coordinator.t}
                onOpenResetModal={() => coordinator.setShowResetModal(true)}
                isSubmitting={coordinator.isSubmitting}
                submittingProvider={coordinator.submittingProvider}
                onGoogleSignIn={() => void coordinator.handleGoogleSignIn()}
              />
            ) : coordinator.authState.status === 'authenticated-active' ? (
              <AuthenticatedProfileView
                user={coordinator.authState.user}
                policy={coordinator.policy}
                entitlements={coordinator.authState.entitlements}
                onSignOut={() => void coordinator.signOut()}
                phoneInput={coordinator.phoneInput}
                onPhoneChange={coordinator.setPhoneInput}
                isSavingPhone={coordinator.isSavingPhone}
                phoneSavedSuccess={coordinator.phoneSavedSuccess}
                onSavePhone={() => void coordinator.handleSavePhone()}
                questionsCount={coordinator.questionsCount}
                t={coordinator.t}
                onOpenResetModal={() => coordinator.setShowResetModal(true)}
                hasAdminEntitlement={coordinator.authState.entitlements.security_governance_admin}
                onCloseModal={coordinator.closeModal}
                onOpenGovernanceDrawer={coordinator.openGovernanceDrawer}
              />
            ) : null
          )}

          {coordinator.activeModalTab === 'security-devices' && (
            <ActiveDevicesView
              authState={coordinator.authState}
              onRevokeDevice={coordinator.revokeDevice}
            />
          )}
        </div>
      </div>

      {/* Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={coordinator.showResetModal}
        onClose={() => coordinator.setShowResetModal(false)}
      />
    </div>
  );
};
