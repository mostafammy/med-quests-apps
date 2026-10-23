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

export const Shell: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">Med Quests</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
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
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50/50'
                }`
              }
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Studio</span>
            </NavLink>
          </nav>

          {/* Right Header: Block Switcher & Shortcuts Help */}
          <div className="flex items-center space-x-3">
            {/* Active Block Selector */}
            <div className="flex items-center space-x-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer transition-all">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>CVS: Block 206</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex items-center text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              <Keyboard className="w-3 h-3 mr-1 text-slate-400" />
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
