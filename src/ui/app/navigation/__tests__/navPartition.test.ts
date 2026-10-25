import { describe, it, expect } from 'vitest';
import { computeNavPartition, isItemActive } from '../navPartition.ts';
import type { NavItemConfig } from '../navTypes.ts';

const mockIcon = () => null;

const sampleItems: NavItemConfig[] = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: mockIcon, exact: true, priority: 1 },
  { id: 'test', path: '/test', label: 'Test', icon: mockIcon, exact: false, priority: 1 },
  { id: 'review', path: '/review', label: 'Review', icon: mockIcon, exact: false, priority: 1 },
  { id: 'curriculum', path: '/curriculum', label: 'Curriculum', icon: mockIcon, exact: false, priority: 2 },
  { id: 'studio', path: '/studio', label: 'Studio', icon: mockIcon, exact: false, priority: 3 },
  { id: 'admin', path: '/admin', label: 'Admin', icon: mockIcon, exact: false, priority: 4 },
];

describe('Navigation Partition Engine (Apple Progressive Disclosure)', () => {
  it('returns all items visible when capacity >= items.length', () => {
    const result = computeNavPartition(sampleItems, 6, '/');
    expect(result.visibleItems).toHaveLength(6);
    expect(result.overflowItems).toHaveLength(0);
  });

  it('partitions items when capacity is 4 (showing 3 items + overflow)', () => {
    const result = computeNavPartition(sampleItems, 4, '/');
    // Capacity 4 means 3 visible + 1 more button
    expect(result.visibleItems).toHaveLength(3);
    expect(result.overflowItems).toHaveLength(3);
    expect(result.visibleItems.map((i) => i.id)).toEqual(['dashboard', 'test', 'review']);
    expect(result.overflowItems.map((i) => i.id)).toEqual(['curriculum', 'studio', 'admin']);
  });

  it('promotes active overflow item (e.g. /admin) into visible slots so user never loses orientation', () => {
    const result = computeNavPartition(sampleItems, 4, '/admin');
    expect(result.visibleItems).toHaveLength(3);
    expect(result.visibleItems.some((i) => i.id === 'admin')).toBe(true);
    expect(result.overflowItems.some((i) => i.id === 'admin')).toBe(false);
    expect(result.overflowItems).toHaveLength(3);
  });

  it('promotes /studio into visible slots when /studio is active at capacity 4', () => {
    const result = computeNavPartition(sampleItems, 4, '/studio');
    expect(result.visibleItems.some((i) => i.id === 'studio')).toBe(true);
    expect(result.overflowItems.some((i) => i.id === 'studio')).toBe(false);
  });

  it('correctly matches exact root path vs subpaths', () => {
    const root = sampleItems[0];
    const test = sampleItems[1];

    expect(isItemActive(root, '/')).toBe(true);
    expect(isItemActive(root, '/test')).toBe(false);

    expect(isItemActive(test, '/test')).toBe(true);
    expect(isItemActive(test, '/test/session-123')).toBe(true);
    expect(isItemActive(test, '/other')).toBe(false);
  });
});
