import type { NavItemConfig, NavState } from './navTypes.ts';

export function isItemActive(item: NavItemConfig, currentPath: string): boolean {
  if (item.exact) {
    return currentPath === item.path;
  }
  return currentPath === item.path || currentPath.startsWith(`${item.path}/`);
}

/**
 * Partitions navigation items between visible segmented bar slots and
 * an Apple-style progressive disclosure "More" popover menu.
 *
 * Guarantees that the currently active route item is ALWAYS surfaced in the
 * visible segmented bar, preventing user dis-orientation on compact screens.
 */
export function computeNavPartition(
  items: readonly NavItemConfig[],
  capacity: number,
  currentPath: string
): NavState {
  if (items.length <= capacity) {
    return {
      visibleItems: [...items],
      overflowItems: [],
    };
  }

  // Capacity must accommodate the 'More' button (1 slot)
  const visibleSlots = Math.max(1, capacity - 1);

  // Check if current route matches any item
  const activeIndex = items.findIndex((item) => isItemActive(item, currentPath));
  const activeItem = activeIndex !== -1 ? items[activeIndex] : undefined;

  // Initial candidate visible items sorted by priority
  const sorted = [...items].sort((a, b) => a.priority - b.priority);
  const defaultVisible = sorted.slice(0, visibleSlots);

  // If active item exists but is not in defaultVisible, promote it!
  if (activeItem && !defaultVisible.some((i) => i.id === activeItem.id)) {
    // Replace the last item in defaultVisible with the active item
    const visibleWithActive = [...defaultVisible.slice(0, visibleSlots - 1), activeItem];
    const visibleIds = new Set(visibleWithActive.map((i) => i.id));
    const overflowItems = items.filter((i) => !visibleIds.has(i.id));

    // Preserve original relative order in visibleItems for layout stability
    const finalVisible = items.filter((i) => visibleIds.has(i.id));

    return {
      visibleItems: finalVisible,
      overflowItems,
    };
  }

  const visibleIds = new Set(defaultVisible.map((i) => i.id));
  const finalVisible = items.filter((i) => visibleIds.has(i.id));
  const overflowItems = items.filter((i) => !visibleIds.has(i.id));

  return {
    visibleItems: finalVisible,
    overflowItems,
  };
}
