import { describe, it, expect, beforeEach } from 'vitest';
import { useQuestionStore } from '../useQuestionStore.ts';
import { useAuthStore } from '../useAuthStore.ts';
import { edgeAuthGateway } from '../../../infrastructure/auth/edgeAuthGateway.ts';

describe('Authoritative Question Bank Export Security Enforcement (Apple EB Standard)', () => {
  beforeEach(() => {
    // Reset auth store to unauthenticated anonymous guest state
    useAuthStore.setState({
      authState: {
        status: 'anonymous-guest',
        user: {
          id: 'usr_local_guest',
          displayName: 'Local Scholar',
          role: 'anonymous',
        },
        entitlements: {} as any,
        clientProfile: {} as any,
        edgePreview: {} as any,
      },
    });
  });

  it('strictly blocks unauthenticated users from calling exportBankJson and logs security audit violation', () => {
    expect(() => {
      useQuestionStore.getState().exportBankJson('cvs');
    }).toThrowError(/Access Denied \(403\)/i);

    const logs = edgeAuthGateway.getAuditLogs();
    const violationLog = logs.find((l) => l.summary.includes('BLOCKED unauthorized export attempt'));
    expect(violationLog).toBeDefined();
    expect(violationLog?.action).toBe('QUESTION_BANK_EXPORTED');
    expect(violationLog?.actorDisplayName).toContain('Local Scholar');
  });

  it('strictly blocks authenticated non-admin roles (e.g. student-pro, faculty-reviewer) from exporting the question bank', () => {
    // 1. Test student-pro role
    useAuthStore.setState({
      authState: {
        status: 'authenticated-active',
        user: {
          id: 'usr_student_01',
          email: 'student@example.com',
          displayName: 'Medical Student',
          role: 'student-pro',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        } as any,
        currentSession: {} as any,
        activeSessions: [],
        entitlements: {} as any,
        clientProfile: {} as any,
        syncStatus: 'synced',
      },
    });

    expect(() => {
      useQuestionStore.getState().exportBankJson('cvs');
    }).toThrowError(/Access Denied \(403\)/i);

    // 2. Test faculty-reviewer role (Reviewers may review vignettes but CANNOT export the proprietary bank)
    useAuthStore.setState({
      authState: {
        status: 'authenticated-active',
        user: {
          id: 'usr_faculty_01',
          email: 'faculty@example.com',
          displayName: 'Faculty Reviewer Dr. Smith',
          role: 'faculty-reviewer',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        } as any,
        currentSession: {} as any,
        activeSessions: [],
        entitlements: {} as any,
        clientProfile: {} as any,
        syncStatus: 'synced',
      },
    });

    expect(() => {
      useQuestionStore.getState().exportBankJson('cvs');
    }).toThrowError(/Access Denied \(403\)/i);

    const logs = edgeAuthGateway.getAuditLogs();
    const facultyBlockLog = logs.find((l) => l.summary.includes('Faculty Reviewer Dr. Smith'));
    expect(facultyBlockLog).toBeDefined();
    expect(facultyBlockLog?.summary).toContain('[Role: faculty-reviewer]');
  });

  it('allows verified platform administrators to export the master bank and registers an immutable audit ledger entry', () => {
    // Set authenticated platform administrator
    useAuthStore.setState({
      authState: {
        status: 'authenticated-active',
        user: {
          id: 'usr_admin_owner',
          email: 'mostafa.yaser.developer@gmail.com',
          displayName: 'Authoritative Platform Admin',
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        } as any,
        currentSession: {} as any,
        activeSessions: [],
        entitlements: {} as any,
        clientProfile: {} as any,
        syncStatus: 'synced',
      },
    });

    const exportedJson = useQuestionStore.getState().exportBankJson('cvs');
    expect(exportedJson).toBeDefined();
    expect(typeof exportedJson).toBe('string');

    // Parse exported JSON and verify it's an array of questions
    const parsed = JSON.parse(exportedJson);
    expect(Array.isArray(parsed)).toBe(true);

    // Verify security audit ledger contains the authoritative export event
    const logs = edgeAuthGateway.getAuditLogs();
    const exportSuccessLog = logs.find(
      (l) => l.action === 'QUESTION_BANK_EXPORTED' && l.actorUserId === 'usr_admin_owner'
    );
    expect(exportSuccessLog).toBeDefined();
    expect(exportSuccessLog?.summary).toContain('Exported authoritative question bank for block [CVS]');
  });
});
