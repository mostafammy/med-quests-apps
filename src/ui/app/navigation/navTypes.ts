import type React from 'react';

export interface NavItemConfig {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  priority: number;
  accent?: 'blue' | 'indigo' | 'amber';
  badge?: string | boolean;
  description?: string;
}

export interface NavState {
  visibleItems: NavItemConfig[];
  overflowItems: NavItemConfig[];
}
