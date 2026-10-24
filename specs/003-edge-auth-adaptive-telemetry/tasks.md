# Tasks: Edge Authentication, Role Governance, Network Telemetry & Adaptive 60/120fps UX Engine

**Input**: Design documents from `specs/003-edge-auth-adaptive-telemetry/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/auth-telemetry-ports.ts`, `research.md`, `quickstart.md`)
**Prerequisites**: `plan.md` (required), `spec.md` (required), `data-model.md`, `contracts/auth-telemetry-ports.ts`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps task to specific user story (`[US1]` through `[US5]`)
- Exact file paths and verbatim schema constraints included in every task description.

---

## Phase 1: Setup (Cloudflare Edge & Database Migration Infrastructure)

**Purpose**: Initialize Cloudflare Worker configuration, D1 SQLite relational migration, and adaptive CSS compositor tokens.

- [X] T001 Update `wrangler.jsonc` with Cloudflare D1 (`MED_QUESTS_DB`) and Workers KV (`MED_QUESTS_AUTH_KV`) bindings and worker entrypoint configuration
- [X] T002 [P] Create Cloudflare D1 SQLite schema migration in `src/worker/migrations/0001_better_auth_edge_telemetry.sql` defining `user` (`role IN ('student-free', 'student-pro', 'faculty-reviewer', 'admin')`, `account_status IN ('active', 'blocked', 'suspended')`), `session` (including `request.cf` geo/network & device columns), and `security_audit_log`
- [X] T003 [P] Extend `src/index.css` with Adaptive Hardware Compositor rules (`html[data-perf-tier="ultra"]`, `html[data-perf-tier="balanced"]`, `html[data-perf-tier="low-spec"]`) and GPU-composited spring modal/drawer animations (`cubic-bezier(0.22, 1, 0.36, 1)`)

---

## Phase 2: Foundational (Pure Domain Models, Schemas & Ports)

**Purpose**: Core domain types, Zod boundary schemas, and Hexagonal ports that all user stories depend on.

- [X] T004 Create strict TypeScript domain types and Zod validation schemas in `src/domain/auth/types.ts` implementing `UserRoleSchema` (`'anonymous' | 'student-free' | 'student-pro' | 'faculty-reviewer' | 'admin'`), `FeatureFlagKeySchema`, `EdgeNetworkTelemetrySchema` (`countryCode` length 2 or `'DEV'`, `threatScore` 0..100 nullable), `ParsedDeviceProfileSchema`, `ClientCapabilityProfileSchema` (`logicalCpuCores` int min 1, `devicePixelRatio` min 1), `PerformanceTierSchema` (`'ultra' | 'balanced' | 'low-spec'`), `ActiveDeviceSessionSchema`, and discriminated union `AuthState` (`'anonymous-guest' | 'authenticated-active' | 'account-blocked'`)
- [X] T005 [P] Implement pure RBAC role policies and entitlement evaluation (`ROLE_ENTITLEMENT_POLICIES`, `resolveFeatureEntitlements`, `hasFeatureEntitlement`) in `src/domain/auth/entitlements.ts`
- [X] T006 [P] Implement pure deterministic CRDT local-to-cloud progress union merge (`mergeLocalProgressIntoAccount` for `Attempt[]`, `ReviewCard[]`, `BookmarkRecord[]`, and `QuestionNoteRecord[]`) in `src/domain/auth/progressMerge.ts`

---

## Phase 3: User Story 1 - Zero-Latency Optimistic Auth & Hybrid KV Edge Verification (Priority: P1) 🎯 MVP

**Goal**: Deliver `< 1 ms` optimistic client hydration, non-blocking background KV edge verification (`~2 ms`), and zero-loss merging of local guest progress upon sign-in/sign-up.

**Independent Test**: Load the app in anonymous mode, answer questions, sign in via the Identity Modal, verify 100% progress merge, reload the page, and confirm `< 15 ms` instant profile hydration without any blocking spinner.

- [X] T007 [US1] Implement dual-strategy Edge Auth Gateway (`CloudflareEdgeAuthAdapter` + `LocalSimulatedEdgeAuthAdapter` with KV cache hit/miss and latency metrics) in `src/infrastructure/auth/edgeAuthGateway.ts`
- [X] T008 [US1] Create `useAuthStore` Zustand store in `src/application/stores/useAuthStore.ts` supporting synchronous `< 1 ms` optimistic hydration, `requestIdleCallback` background edge revalidation, `signIn`, `signUp`, `signOut`, and automatic invocation of `mergeLocalProgressIntoAccount`
- [X] T009 [P] [US1] Build lightweight `< 1.2 KB` `IdentityStatusPill` header component with `onMouseEnter`/`onFocus` modal chunk prefetching in `src/ui/features/auth/IdentityStatusPill.tsx`
- [X] T010 [US1] Integrate `IdentityStatusPill`, lazy-loaded `AuthSecurityModal`, and background session revalidation into `src/ui/app/Shell.tsx` and `src/App.tsx`

---

## Phase 4: User Story 2 - Dynamic RBAC, Feature Entitlements & Instant User Blocking (Priority: P2)

**Goal**: Enforce granular role permissions (`student-free`, `student-pro`, `faculty-reviewer`, `admin`), live feature flag toggling, and immediate KV cache eviction + account blocking.

**Independent Test**: Toggle active role or block status in the Governance drawer; verify KV cache invalidates immediately and the UI either unlocks Pro/Faculty capabilities or transitions smoothly to the Account Restricted screen.

- [X] T011 [P] [US2] Implement Cloudflare Worker entrypoint with KV Cache-Aside (`sess:{tokenHash}` + `usr_guard:{userId}`) and synchronous cache purge on block/role mutation in `src/worker/index.ts`
- [X] T012 [P] [US2] Create calm, accessible `AccountRestrictedBanner` recovery view (displaying `blockedReason`, `blockedUntil`, Edge `colo` reference, and guest-mode fallback action) in `src/ui/features/auth/AccountRestrictedBanner.tsx`
- [X] T013 [US2] Wire role entitlement guards (`question_studio_author`, `ai_cloud_streaming_quota`, `security_governance_admin`) and instant blocked-account state handling into `src/ui/app/Shell.tsx`

---

## Phase 5: User Story 3 - Zero-Overhead Edge Network, Geo & Device Intelligence Capture (Priority: P3)

**Goal**: Extract `request.cf` geographical/ASN/TLS intelligence and HTTP Client Hints (`User-Agent`, `Sec-CH-UA*`, `Accept-Language`) in `0 ms`, detect impossible-travel / multi-device anomalies, and allow users to inspect and revoke active device sessions.

**Independent Test**: Open the "Security & Active Devices" tab in `AuthSecurityModal`; verify accurate OS, Browser, Device Category, Country/City, ISP/ASN, Cloudflare `colo`, HTTP/3 + TLSv1.3 badges, and one-click device session revocation.

- [X] T014 [P] [US3] Implement pure `extractEdgeNetworkTelemetry` (`request.cf` parser with local dev fallback) and `parseDeviceHeaderProfile` (`User-Agent` & `Sec-CH-UA` parser) in `src/domain/auth/telemetryParser.ts`
- [X] T015 [P] [US3] Implement pure security anomaly detector (`detectSessionAnomalies` for `impossible_travel_geo_shift`, `excessive_concurrent_devices`, and `high_threat_ip_score`) in `src/domain/auth/anomalyDetector.ts`
- [X] T016 [US3] Build the "Security & Active Devices" and "Edge Network Intelligence" tabs inside `src/ui/features/auth/AuthSecurityModal.tsx` with one-click device revocation and multi-region session simulation

---

## Phase 6: User Story 4 - Client Hardware & Network Adaptive UX Engine (Priority: P4)

**Goal**: Probe client hardware (`hardwareConcurrency`, `deviceMemory`, `connection.effectiveType`, `devicePixelRatio`, `prefersReducedMotion`, and `Intl` timezone) in `< 0.5 ms` and dynamically bind `data-perf-tier="ultra|balanced|low-spec"` to guarantee 60/120fps animations on high-end devices and zero lag on budget devices.

**Independent Test**: Open the "Hardware & Adaptive UX" tab in `AuthSecurityModal`, inspect live CPU/RAM/Network/Timezone metrics, switch between `Ultra`, `Balanced`, and `Low-Spec` modes, and verify `document.documentElement.dataset.perfTier` updates immediately.

- [X] T017 [P] [US4] Implement pure deterministic `computePerformanceTier` classifier in `src/domain/auth/hardwareTier.ts`
- [X] T018 [US4] Implement safe browser capability probe (`probeClientCapabilities` & `bindAdaptiveCompositorAttributes` with media/network listeners and zero deprecated fingerprinting APIs) in `src/infrastructure/auth/clientCapabilityProbe.ts`
- [X] T019 [US4] Build the interactive "Hardware & Adaptive UX Engine" inspector and tier override selector inside `src/ui/features/auth/AuthSecurityModal.tsx`

---

## Phase 7: User Story 5 - Admin & Security Governance Command Center (Priority: P5)

**Goal**: Provide a keyboard-accessible Admin Governance Console to inspect users, review geo/device telemetry & anomaly flags, switch roles, toggle granular feature flags, and block/unblock accounts with an immutable security audit log.

**Independent Test**: Open the Admin Governance drawer, change a user's role or toggle a feature flag, trigger an account block with reason, and verify immediate KV cache eviction and audit log recording.

- [X] T020 [US5] Build lazy-loaded `AdminGovernanceDrawer` component (with role switcher, granular feature flag toggles, account block/unblock controls, and live security audit log) in `src/ui/features/auth/AdminGovernanceDrawer.tsx`

---

## Phase 8: Polish & Cross-Cutting Verification

**Purpose**: End-to-end TypeScript strict build verification, bundle size audit, and keyboard accessibility polish.

- [X] T021 Verify strict TypeScript compilation (`tsc -b`) and production bundle build (`vite build`) with zero errors and lazy-loaded chunk splitting for `AuthSecurityModal` and `AdminGovernanceDrawer`

---

## Dependencies & Execution Order

1. **Phase 1 (Setup)** & **Phase 2 (Foundational)**: Must complete first (`T001`–`T006`).
2. **Phase 3 (US1 - Optimistic Auth & Sync)**: Depends on Phase 2 (`T007`–`T010`). Forms the **MVP**.
3. **Phase 4 (US2 - RBAC & Blocking)**, **Phase 5 (US3 - Edge Geo/Device Intelligence)**, and **Phase 6 (US4 - Client Adaptive UX Engine)**: Can proceed in parallel after Phase 2 (`T011`–`T019`).
4. **Phase 7 (US5 - Admin Governance Console)**: Integrates US2 and US3 controls (`T020`).
5. **Phase 8 (Polish & Build Verification)**: Final gate (`T021`).
