import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  RotateCcw,
  BookOpen,
  Sparkles,
  Shield,
} from 'lucide-react';
import type { TranslationDictionary } from '../../../domain/i18n/types.ts';

interface MobileBottomDockProps {
  isAdmin: boolean;
  t: TranslationDictionary;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({ isAdmin, t }) => {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-2.5 sm:bottom-3 inset-x-2 sm:inset-x-4 max-w-md mx-auto z-40 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-white/70 dark:border-zinc-800/80 rounded-3xl p-1 sm:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all select-none touch-manipulation pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      <div className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} gap-0.5 sm:gap-1`}>
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-blue-500/10 scale-105' : ''
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs shadow-blue-500" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {t.nav.dashboard}
              </span>
            </>
          )}
        </NavLink>

        {/* Test Hub */}
        <NavLink
          to="/test"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-blue-500/10 scale-105' : ''
                }`}
              >
                <PenTool className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs shadow-blue-500" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {t.nav.test}
              </span>
            </>
          )}
        </NavLink>

        {/* Review & Drill */}
        <NavLink
          to="/review"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-blue-500/10 scale-105' : ''
                }`}
              >
                <RotateCcw className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs shadow-blue-500" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {t.nav.review}
              </span>
            </>
          )}
        </NavLink>

        {/* Curriculum */}
        <NavLink
          to="/curriculum"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
              isActive
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-blue-500/10 scale-105' : ''
                }`}
              >
                <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-xs shadow-blue-500" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {t.nav.curriculum}
              </span>
            </>
          )}
        </NavLink>

        {/* Q-Studio */}
        <NavLink
          to="/studio"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-indigo-500/10 scale-105' : ''
                }`}
              >
                <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-xs shadow-indigo-500" />
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {t.nav.studio}
              </span>
            </>
          )}
        </NavLink>

        {/* Admin Dashboard (Strictly rendered for authenticated Admins) */}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 apple-tap ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                  : 'text-amber-700/80 dark:text-amber-300/80 hover:text-amber-800 dark:hover:text-amber-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`relative p-1 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-amber-500/15 scale-105' : ''
                  }`}
                >
                  <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200" />
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500" />
                  )}
                </div>
                <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                  {t.nav.admin}
                </span>
              </>
            )}
          </NavLink>
        )}
      </div>
    </nav>
  );
};
