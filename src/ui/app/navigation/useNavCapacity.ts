import { useState, useEffect } from 'react';

/**
 * Dynamically computes available slot capacity for the desktop segmented nav
 * based on viewport width and Apple Human Interface Guidelines spacing rules.
 */
function getCapacityForWidth(width: number): number {
  if (width >= 1240) {
    return 6; // Ample width: All 6 items visible
  }
  if (width >= 980) {
    return 5; // Laptop / tablet landscape: 4 visible + 1 'More' pill
  }
  return 4; // Compact tablet / split view: 3 visible + 1 'More' pill
}

export function useNavCapacity(): number {
  const [capacity, setCapacity] = useState<number>(() => {
    if (typeof window === 'undefined') return 6;
    return getCapacityForWidth(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setCapacity(getCapacityForWidth(window.innerWidth));
        rafId = null;
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return capacity;
}
