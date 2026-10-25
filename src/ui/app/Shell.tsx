import React, { useEffect, Suspense, lazy } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Heart, 
  ChevronDown,
  X
} from 'lucide-react';
import { DesktopNavBar } from './navigation/DesktopNavBar.tsx';
import { MobileBottomDock } from './navigation/MobileBottomDock.tsx';
import { ThemeToggle } from './ThemeToggle';
import { LocaleToggle } from './LocaleToggle.tsx';
import { CopilotTriggerButton } from '../features/copilot/CopilotTriggerButton.tsx';
import { AiCopilotDrawer } from '../features/copilot/AiCopilotDrawer.tsx';
import { IdentityStatusPill } from '../features/auth/IdentityStatusPill.tsx';
import { AccountRestrictedBanner } from '../features/auth/AccountRestrictedBanner.tsx';
import { useCopilotStore } from '../../application/stores/useCopilotStore.ts';
import { useAuthStore } from '../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../application/stores/useLocaleStore.ts';

const AuthSecurityModal = lazy(() =>
  import('../features/auth/AuthSecurityModal.tsx').then((m) => ({ default: m.AuthSecurityModal }))
);
const AdminGovernanceDrawer = lazy(() =>
  import('../features/auth/AdminGovernanceDrawer.tsx').then((m) => ({ default: m.AdminGovernanceDrawer }))
);

export const Shell: React.FC = () => {
  const location = useLocation();
  const { setSurface } = useCopilotStore();
  const { authState, notificationToast, clearToast } = useAuthStore();
  const { t, initLocale } = useLocaleStore();
  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';

  useEffect(() => {
    return initLocale();
  }, [initLocale]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/studio') {
      setSurface({ kind: 'studio' });
    } else if (path === '/review') {
      setSurface({ kind: 'workspace', route: 'review' });
    } else if (path.startsWith('/test')) {
      setSurface({ kind: 'workspace', route: 'test-hub' });
    } else if (path === '/curriculum') {
      setSurface({ kind: 'workspace', route: 'curriculum' });
    } else {
      setSurface({ kind: 'workspace', route: 'dashboard' });
    }
  }, [location.pathname, setSurface]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-300 relative overflow-x-hidden">
      {/* Universal Ambient Chromatic Glow Background Orbs with Apple Fluid Kinetic Floating */}
      <div className="fixed -top-12 left-1/4 w-[40rem] h-[40rem] bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-80 dark:opacity-40" />
      <div className="fixed -bottom-16 right-1/4 w-[36rem] h-[36rem] bg-gradient-to-bl from-purple-400/20 via-pink-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid-reverse opacity-75 dark:opacity-35" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/15 to-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-60 dark:opacity-30" />

      {/* Top Navigation Bar with Frosted Glassmorphism (Apple Material Blur) */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border-b border-white/60 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.4)] transition-all duration-300 pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full px-3 sm:px-5 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo & Platform Name (Aligned to Far-Left) */}
          <NavLink to="/" className="flex items-center space-x-2 sm:space-x-2.5 rtl:space-x-reverse group cursor-pointer shrink-0 apple-tap">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-current animate-heartbeat" />
              <span className="absolute -inset-0.5 rounded-xl sm:rounded-2xl bg-blue-400/30 blur-xs -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Med Quests
              </span>
              <span className="hidden xl:inline-block ml-2 rtl:ml-0 rtl:mr-2 text-[10px] uppercase tracking-wider font-extrabold bg-blue-500/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/20 backdrop-blur-md">
                {t.common.examPrepBadge}
              </span>
            </div>
          </NavLink>

          {/* Center Navigation: Apple-Caliber Adaptive Fluid Segmented Nav with Progressive Overflow */}
          <DesktopNavBar isAdmin={isAdmin} t={t} />

          {/* Right Header: Identity & Edge Pill, AI Co-Pilot, Theme Switcher & Block Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Bilingual Language Switcher */}
            <LocaleToggle />

            {/* Identity, Cloudflare Edge & Hardware Tier Pill */}
            <IdentityStatusPill />

            {/* AI Co-Pilot Trigger Capsule */}
            <CopilotTriggerButton />

            {/* Apple Dynamic Appearance Switcher */}
            <ThemeToggle />

            {/* Active Block Glass Pill - Fluidly hidden when space is constrained, shown on wide viewports */}
            <div className="hidden xl:flex items-center space-x-2 bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800/80 backdrop-blur-md border border-white/80 dark:border-zinc-700/70 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs transition-all duration-200 hover:-translate-y-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t.nav.activeBlockPrefix}: 206</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 w-full pb-24 md:pb-8">
        {/* Account Restriction Alert */}
        <AccountRestrictedBanner />

        {/* Global Action Toast Notification */}
        {notificationToast && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-900 shadow-sm backdrop-blur-md dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-200 animate-apple-entrance">
            <span>{notificationToast.message}</span>
            <button
              type="button"
              onClick={clearToast}
              className="ml-3 rounded-lg p-1 text-blue-500 hover:bg-blue-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Outlet />
      </main>

      {/* Apple Native Frosted Glass Mobile Bottom Dock Navigation (iPhone & Compact Screens) */}
      <MobileBottomDock isAdmin={isAdmin} t={t} />

      {/* AI Cognitive Co-Pilot Sliding Drawer */}
      <AiCopilotDrawer />

      {/* Lazy-Loaded Identity, Security & Adaptive UX Modal */}
      <Suspense fallback={null}>
        <AuthSecurityModal />
      </Suspense>

      {/* Lazy-Loaded Admin Governance Drawer */}
      <Suspense fallback={null}>
        <AdminGovernanceDrawer />
      </Suspense>
    </div>
  );
};
