import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Heart, 
  LayoutDashboard, 
  PenTool, 
  RotateCcw, 
  BookOpen, 
  Sparkles, 
  ChevronDown,
  Keyboard
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Shell: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navigation Bar with Dynamic Translucency (Apple Material Style) */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-zinc-50 tracking-tight text-lg">Med Quests</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60">
                Exam Prep
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/test"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <PenTool className="w-4 h-4" />
              <span>Test</span>
            </NavLink>

            <NavLink
              to="/review"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review</span>
            </NavLink>

            <NavLink
              to="/curriculum"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <BookOpen className="w-4 h-4" />
              <span>Curriculum</span>
            </NavLink>

            <NavLink
              to="/studio"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30'
                }`
              }
            >
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Studio</span>
            </NavLink>
          </nav>

          {/* Right Header: Theme Switcher, Block Switcher & Shortcuts Help */}
          <div className="flex items-center space-x-3">
            {/* Apple Dynamic Appearance Switcher */}
            <ThemeToggle />

            {/* Active Block Selector */}
            <div className="flex items-center space-x-2 bg-slate-100/80 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer transition-all">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
              <span>CVS: Block 206</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            </div>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex items-center text-[11px] font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800/60 px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700">
              <Keyboard className="w-3 h-3 mr-1 text-slate-400 dark:text-zinc-500" />
              <span>?</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
