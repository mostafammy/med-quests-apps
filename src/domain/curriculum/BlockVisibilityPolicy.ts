/**
 * Role-Based Block Visibility Policy
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockLifecycleStatus } from './schemas.ts';

export type ViewerRole =
  | 'anonymous'
  | 'student-free'
  | 'student-pro'
  | 'faculty-reviewer'
  | 'admin';

export interface IBlockVisibilityPolicy {
  isVisible(status: BlockLifecycleStatus, role: ViewerRole): boolean;
  isAuthorable(status: BlockLifecycleStatus, role: ViewerRole): boolean;
}

export class RoleBasedBlockVisibilityPolicy implements IBlockVisibilityPolicy {
  public isVisible(status: BlockLifecycleStatus, role: ViewerRole): boolean {
    switch (status) {
      case 'published':
        return true;
      case 'beta':
        return role === 'faculty-reviewer' || role === 'admin';
      case 'draft':
      case 'archived':
        return role === 'admin';
      default:
        return false;
    }
  }

  public isAuthorable(status: BlockLifecycleStatus, role: ViewerRole): boolean {
    if (status === 'archived') {
      return false; // Archived blocks are permanently immutable
    }

    if (role === 'admin') {
      return true; // Admin can author draft, beta, published
    }

    if (role === 'faculty-reviewer') {
      return status === 'beta' || status === 'published';
    }

    return false;
  }
}

export const defaultBlockVisibilityPolicy = new RoleBasedBlockVisibilityPolicy();
