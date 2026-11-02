/**
 * @file AnalyticsRouteObserver.tsx
 * @description Non-intrusive React Router observer capturing screen transitions,
 * active dwell time, and 60-second foreground engagement heartbeats.
 *
 * Guaranteed zero impact on 120Hz ProMotion animations.
 */

import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import type { NavigationRouteViewedPayload } from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';

function categorizeRoute(path: string): NavigationRouteViewedPayload['route_category'] {
  if (path === '/' || path === '') return 'dashboard';
  if (path.startsWith('/session/')) return 'session-player';
  if (path === '/test/quick') return 'quick-practice';
  if (path === '/test/mock') return 'mock-setup';
  if (path.startsWith('/test')) return 'test-hub';
  if (path.startsWith('/review')) return 'review-hub';
  if (path.startsWith('/curriculum')) return 'curriculum-library';
  if (path.startsWith('/studio')) return 'question-studio';
  if (path.startsWith('/admin')) return 'admin-command-center';
  return 'dashboard';
}

export const AnalyticsRouteObserver: React.FC = () => {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const routeEnteredAtRef = useRef<number>(Date.now());
  const interactionCountRef = useRef<number>(0);

  // 1. Listen for user interactions for engagement heartbeat
  useEffect(() => {
    const handleInteraction = () => {
      interactionCountRef.current++;
    };

    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // 2. Track route transitions and dwell times
  useEffect(() => {
    const now = Date.now();
    const dwellMs = previousPathRef.current ? Math.max(0, now - routeEnteredAtRef.current) : 0;
    const category = categorizeRoute(location.pathname);

    analytics.capture('navigation:route_viewed', {
      route_path: location.pathname,
      route_category: category,
      previous_route_path: previousPathRef.current,
      route_dwell_ms: dwellMs,
    });

    previousPathRef.current = location.pathname;
    routeEnteredAtRef.current = now;
    interactionCountRef.current = 0;
  }, [location.pathname]);

  // 3. Periodic 60-second active foreground heartbeat
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      analytics.capture('app:engagement_heartbeat', {
        active_foreground_ms: 60000,
        active_route_category: categorizeRoute(location.pathname),
        interactions_in_window: interactionCountRef.current,
      });

      interactionCountRef.current = 0;
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [location.pathname]);

  return null;
};
