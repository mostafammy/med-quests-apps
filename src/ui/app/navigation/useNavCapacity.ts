import { useState, useEffect } from 'react';

/**
 * Dynamically computes available slot capacity for the desktop segmented nav
 * based on viewport width and Apple Human Interface Guidelines spacing rules.
 */
function getCapacityForWidth(width: number): number {
  if (width >= 1440) {
    return 6; // Wide desktop: All 6 items visible
  }
  if (width >= 1220) {
    return 5; // MacBook Air 13" (1280px) & standard laptops: 5 slots
  }
  if (width >= 960) {
    return 4; // Compact laptop / tablet landscape: 3 visible + 1 'More' pill
  }
  return 3; // Tablet portrait / split view (768px-959px): 2 visible + 1 'More' pill
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
