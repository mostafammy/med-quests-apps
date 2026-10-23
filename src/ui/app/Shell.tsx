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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-300 relative overflow-x-hidden">
      {/* Universal Ambient Chromatic Glow Background Orbs with Apple Fluid Kinetic Floating */}
      <div className="fixed -top-12 left-1/4 w-[40rem] h-[40rem] bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-80 dark:opacity-40" />
      <div className="fixed -bottom-16 right-1/4 w-[36rem] h-[36rem] bg-gradient-to-bl from-purple-400/20 via-pink-400/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid-reverse opacity-75 dark:opacity-35" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/15 to-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-fluid opacity-60 dark:opacity-30" />

      {/* Top Navigation Bar with Frosted Glassmorphism (Apple Material Blur) */}
      <header className="sticky top-0 z-40 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border-b border-white/60 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.4)] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <NavLink to="/" className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Heart className="w-5 h-5 fill-current animate-heartbeat" />
              <span className="absolute -inset-0.5 rounded-2xl bg-blue-400/30 blur-xs -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Med Quests
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-extrabold bg-blue-500/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/20 backdrop-blur-md">
                Exam Prep
              </span>
            </div>
          </NavLink>

          {/* Center Navigation Links with Smooth Liquid Pill Highlights */}
          <nav className="hidden md:flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-200/40 dark:bg-zinc-800/40 backdrop-blur-lg border border-white/40 dark:border-zinc-700/40">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/test"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Test</span>
            </NavLink>

            <NavLink
              to="/review"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review</span>
            </NavLink>

            <NavLink
              to="/curriculum"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Curriculum</span>
            </NavLink>

            <NavLink
              to="/studio"
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-zinc-800/60'
                }`
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Studio</span>
            </NavLink>
          </nav>

          {/* Right Header: Theme Switcher, Block Switcher & Shortcuts Help */}
          <div className="flex items-center space-x-3">
            {/* Apple Dynamic Appearance Switcher */}
            <ThemeToggle />

            {/* Active Block Glass Pill */}
            <div className="flex items-center space-x-2 bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800/80 backdrop-blur-md border border-white/80 dark:border-zinc-700/70 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs transition-all duration-200 hover:-translate-y-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>CVS: Block 206</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            </div>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex items-center text-[11px] font-mono text-slate-400 dark:text-zinc-500 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/60 dark:border-zinc-700/60 shadow-xs">
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
