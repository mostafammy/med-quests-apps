import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  RotateCcw,
  BookOpen,
  Sparkles,
  Shield,
  MoreHorizontal,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { NavItemConfig } from './navTypes.ts';
import { computeNavPartition, isItemActive } from './navPartition.ts';
import { useNavCapacity } from './useNavCapacity.ts';
import type { TranslationDictionary } from '../../../domain/i18n/types.ts';

interface DesktopNavBarProps {
  isAdmin: boolean;
  t: TranslationDictionary;
}

export const DesktopNavBar: React.FC<DesktopNavBarProps> = ({ isAdmin, t }) => {
  const location = useLocation();
  const capacity = useNavCapacity();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close 'More' popover on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isMoreOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  // Canonical definition of all navigation nodes with priority and semantic metadata
  const allItems: NavItemConfig[] = useMemo(() => {
    const items: NavItemConfig[] = [
      {
        id: 'dashboard',
        path: '/',
        label: t.nav.dashboard,
        icon: LayoutDashboard,
        exact: true,
        priority: 1,
        accent: 'blue',
        description: t.nav.dashboardDesc,
      },
      {
        id: 'test',
        path: '/test',
        label: t.nav.test,
        icon: PenTool,
        exact: false,
        priority: 1,
        accent: 'blue',
        description: t.nav.testDesc,
      },
      {
        id: 'review',
        path: '/review',
        label: t.nav.review,
        icon: RotateCcw,
        exact: false,
        priority: 1,
        accent: 'blue',
        description: t.nav.reviewDesc,
      },
      {
        id: 'curriculum',
        path: '/curriculum',
        label: t.nav.curriculum,
        icon: BookOpen,
        exact: false,
        priority: 2,
        accent: 'blue',
        description: t.nav.curriculumDesc,
      },
      {
        id: 'studio',
        path: '/studio',
        label: t.nav.studio,
        icon: Sparkles,
        exact: false,
        priority: 3,
        accent: 'indigo',
        description: t.nav.studioDesc,
      },
    ];

    if (isAdmin) {
      items.push({
        id: 'admin',
        path: '/admin',
        label: t.nav.admin,
        icon: Shield,
        exact: false,
        priority: 4,
        accent: 'amber',
        badge: true,
        description: t.nav.adminDesc,
      });
    }

    return items;
  }, [isAdmin, t]);

  // Dynamically partition items into visible slots and overflow menu
  const { visibleItems, overflowItems } = useMemo(
    () => computeNavPartition(allItems, capacity, location.pathname),
    [allItems, capacity, location.pathname]
  );

  // Check if any overflow item is active
  const activeOverflowItem = overflowItems.find((item) =>
    isItemActive(item, location.pathname)
  );

  return (
    <nav
      aria-label="Primary Navigation"
      className="hidden md:flex items-center space-x-1.5 rtl:space-x-reverse p-1 rounded-2xl bg-slate-200/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/50 dark:border-zinc-700/50 shadow-inner select-none transition-all duration-300"
    >
      {/* Visible Liquid Segmented Navigation Tabs */}
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item, location.pathname);

        let activeStyle =
          'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]';
        if (item.accent === 'amber') {
          activeStyle =
            'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs scale-[1.02]';
        } else if (item.accent === 'indigo') {
          activeStyle =
            'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-zinc-700/60 scale-[1.02]';
        }

        const inactiveStyle =
          item.accent === 'amber'
            ? 'text-slate-600 dark:text-zinc-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/10'
            : item.accent === 'indigo'
            ? 'text-slate-600 dark:text-zinc-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-zinc-800/60'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60';

        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.exact}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-all duration-200 apple-tap ${
              isActive ? activeStyle : inactiveStyle
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                item.accent === 'indigo' && !isActive
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : item.accent === 'amber' && !isActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : ''
              }`}
            />
            <span className="tracking-tight">{item.label}</span>
            {item.badge && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </NavLink>
        );
      })}

      {/* Apple-Caliber 'More' Progressive Disclosure Popover */}
      {overflowItems.length > 0 && (
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isMoreOpen}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-all duration-200 cursor-pointer apple-tap ${
              activeOverflowItem
                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40 shadow-xs scale-[1.02]'
                : isMoreOpen
                ? 'bg-white/80 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 shadow-sm border border-slate-300/60 dark:border-zinc-700/60'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/60'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="tracking-tight">
              {activeOverflowItem ? activeOverflowItem.label : t.nav.more}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isMoreOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Floating Frosted Glass Sheet */}
          {isMoreOpen && (
            <div
              role="menu"
              className="absolute top-full mt-2 end-0 z-50 w-60 p-1.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/80 dark:border-zinc-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-apple-popover origin-top select-none"
            >
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {t.nav.more}
              </div>

              <div className="space-y-0.5 mt-0.5">
                {overflowItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item, location.pathname);

                  let itemAccentText = 'text-blue-600 dark:text-blue-400';
                  let itemActiveBg = 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
                  if (item.accent === 'amber') {
                    itemAccentText = 'text-amber-600 dark:text-amber-400';
                    itemActiveBg = 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
                  } else if (item.accent === 'indigo') {
                    itemAccentText = 'text-indigo-600 dark:text-indigo-400';
                    itemActiveBg = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
                  }

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 apple-tap ${
                        isActive
                          ? `${itemActiveBg} font-extrabold shadow-2xs`
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100/70 dark:hover:bg-zinc-800/70 hover:text-slate-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? 'bg-white/80 dark:bg-zinc-800/90 shadow-2xs'
                              : 'bg-slate-100 dark:bg-zinc-800/60'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${itemAccentText}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.description && (
                            <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-500 truncate">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
                        {item.badge && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        {isActive && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
