# Feature Specification: Edge Authentication, Role Governance, Network Telemetry & Adaptive 60/120fps UX Engine

**Feature Branch**: `003-edge-auth-adaptive-telemetry`

**Created**: 2026-10-24

**Status**: Approved for Planning

**Input**: User description: "Implement an ultra-fast Edge Authentication, Role/Feature Control, Instant User Blocking, Edge Geo/Network Intelligence, and Client Hardware/Timezone Adaptive UI & Fluid Animation Engine using Better Auth, Cloudflare D1, and Workers KV caching with world-class design patterns, strict TypeScript interfaces, minimal loading time, and fluid 60/120fps animations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zero-Latency Optimistic Auth & Hybrid KV Edge Verification (Priority: P1)

A medical student opens the Med Quests platform to practice 20 minutes before an exam. Whether they are signed in or studying in local-first guest mode, the application shell and question bank hydrate instantaneously (`< 15 ms`) from local storage without waiting on a blocking network spinner. In the background, the platform verifies their session against the globally distributed edge cache in `< 5 ms`. When the student signs in or signs up, their local study progress (attempts, SM-2 spaced repetition cards, bookmarks, and notes) seamlessly merges with their authenticated cloud profile without losing a single answer.

**Why this priority**: Preserves Constitution Principles P1 (Testing & Review First) and P4 (Zero-Friction Interaction). Authentication must never introduce startup lag, layout shift, or lost study progress.

**Independent Test**: Load the application on a throttled 3G connection while signed in; verify the dashboard and practice player render interactively in under 50ms from optimistic local cache while background edge session validation completes silently without UI flicker.

**Acceptance Scenarios**:

1. **Given** an authenticated learner returning to the app, **When** the application boots, **Then** the UI hydrates immediately from the local optimistic session snapshot in `< 5 ms` while a non-blocking background revalidate checks the edge KV cache (`~2–4 ms` edge execution).
2. **Given** a learner who practiced 30 questions in anonymous local-first mode, **When** they sign up or sign in to an account, **Then** all local attempts, spaced-repetition review cards, bookmarks, and notes are deterministically merged into their user profile with zero data loss.
3. **Given** an intermittent hospital Wi-Fi drop during an active Practice or Mock Exam session, **When** network connectivity is lost, **Then** the session continues uninterrupted using local storage and queues any sync events until connectivity resumes.

---

### User Story 2 - Dynamic Role-Based Access Control (RBAC), Feature Entitlements & Instant User Blocking (Priority: P2)

A platform administrator needs fine-grained control over user tiers (`student-free`, `student-pro`, `faculty-reviewer`, `admin`), granular feature flags (e.g., AI Cognitive Co-Pilot cloud streaming quota, Question Studio authoring access, multi-block unlocks), and immediate security enforcement. When an administrator blocks a malicious user, revokes a compromised session, or upgrades a user's role, the system evicts the user's edge KV cache entry immediately alongside the primary database write. On the user's very next protected request or action, the updated role or block enforcement takes effect globally within milliseconds.

**Why this priority**: Solves the core trade-off between raw JWT speed and centralized control—delivering single-digit millisecond edge verification while retaining instant revocation and live role upgrades.

**Independent Test**: Sign in as a test user, trigger an admin block or role change (`student-free` → `student-pro`), and verify that the user's active session reflects the new feature entitlements or displays the blocked-account security screen on the very next edge request (`< 10 ms` verification).

**Acceptance Scenarios**:

1. **Given** an active user session cached at the edge, **When** an administrator sets `status = 'blocked'` (with a reason and optional expiration), **Then** the user's KV session cache is purged immediately and their next API/sync interaction returns a `403 ACCOUNT_BLOCKED` state that transitions the UI smoothly to a calm, informative Account Restricted view.
2. **Given** a user whose role is upgraded or granted a custom feature flag (e.g., `ai_cloud_copilot`, `studio_authoring`, `unlimited_mock_exams`), **When** the role update commits, **Then** the new `FeatureEntitlementSet` propagates to the client and unlocks the corresponding UI capabilities with a fluid spring transition and zero page reload.
3. **Given** a user signed in across multiple devices (e.g., laptop and tablet), **When** the user or an admin invokes "Revoke Session" on a specific device or "Sign Out Everywhere", **Then** the targeted device session is terminated immediately at the edge.

---

### User Story 3 - Zero-Overhead Edge Network, Geo & Device Intelligence Capture (Priority: P3)

Whenever a user authenticates, refreshes a session, or views their Security & Devices drawer, the edge gateway automatically extracts network, geographical, and client header telemetry at `0 ms` compute cost (pre-injected by the edge network and HTTP handshake). This includes IP address, Country, City, Region, Continent, approximate coordinates, ASN / ISP organization, Edge Colocation data center code (`colo`), HTTP/TLS version, and parsed Operating System, Browser, and Device category. Users can inspect their own active device sessions (e.g., *"MacBook Pro · Safari 18 · Cairo, EG · Cloudflare CAI"*), and administrators can detect suspicious multi-region account sharing or automated scraping.

**Why this priority**: Provides rich operational visibility, security auditing, and account-sharing protection without adding a single byte of third-party tracking scripts or slowing down the client browser.

**Independent Test**: Authenticate through the edge worker handler and inspect the Active Sessions panel; verify that Country, City, Edge Colo, ISP/ASN, OS, Browser, Device Type, and local Timezone are accurately populated and displayed with clear visual badges.

**Acceptance Scenarios**:

1. **Given** an incoming authentication or session-refresh request at the edge, **When** the worker processes the request, **Then** it extracts geo-network metadata (`country`, `city`, `region`, `continent`, `latitude`, `longitude`, `postalCode`, `asn`, `asOrganization`, `colo`, `httpProtocol`, `tlsVersion`, `ipAddress`) and client headers (`User-Agent`, `Sec-CH-UA*`, `Accept-Language`) in `< 0.5 ms` and attaches the immutable `EdgeTelemetrySnapshot` to the session audit record.
2. **Given** an account that exhibits concurrent active sessions from geographically impossible locations within a short window (e.g., two different countries within 5 minutes), **When** the anomaly detector evaluates the session history, **Then** it flags the session with a `concurrent_geo_anomaly` security badge for admin review or automated session challenge.
3. **Given** a signed-in user opening their "Security & Active Devices" modal, **When** the modal renders, **Then** they see every active device with its OS/Browser icon, City/Country, Edge data center latency badge, last-active timestamp, and a one-click "Revoke Device" action.

---

### User Story 4 - Client Hardware & Network Adaptive UX Engine (Fluid 60/120fps vs. Low-Spec Saver) (Priority: P4)

Medical students access the platform across a wide spectrum of hardware—from 120Hz Apple Silicon MacBooks and iPad Pros to budget Android tablets on slow hospital cellular networks. On startup, a lightweight client-side capability probe reads native browser signals (`navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.connection.effectiveType`, `devicePixelRatio`, `prefers-reduced-motion`, and `Intl.DateTimeFormat().resolvedOptions().timeZone`). The engine automatically computes a deterministic `PerformanceTier` (`ultra`, `balanced`, or `low-spec`) and synchronizes CSS compositor variables and motion tokens:
- **Ultra / Balanced Tiers**: Enjoy locked 60/120fps spring-physics drawer transitions, GPU-composited (`transform: translate3d`, `opacity`) layout morphs, specular glassmorphism, and staggered entrance cascades.
- **Low-Spec / Data-Saver / Reduced-Motion Tiers**: Automatically replace heavy multi-pass `backdrop-filter: blur()` layers and continuous background keyframe loops with crisp, zero-overdraw solid/translucent surfaces and ultra-fast (`0ms–80ms`) opacity transitions—guaranteeing zero frame drops during exam sessions on low-memory devices.

**Why this priority**: Directly delivers an "insane UI/UX" with fluid animations on capable devices while guaranteeing that budget devices never suffer GPU thermal throttling or input lag during timed exams.

**Independent Test**: Override the hardware detector in DevTools or via the Appearance/Performance switcher to simulate a `2 GB RAM / 2-core / 3G` device (`low-spec` tier); verify that `data-perf-tier="low-spec"` is applied to the document root, heavy `backdrop-filter` blurs and infinite floating orb animations are deactivated, and question-to-question transitions execute in `< 8 ms`.

**Acceptance Scenarios**:

1. **Given** a high-capability device (`>= 8 CPU cores` or `>= 8 GB RAM`, no reduced-motion preference), **When** the app initializes, **Then** the Adaptive UX Engine selects `tier = 'ultra'`, enabling 60/120fps GPU-accelerated spring curves (`cubic-bezier(0.22, 1, 0.36, 1)`), subtle specular rim lighting, and pre-fetched route assets.
2. **Given** a constrained device (`<= 4 GB RAM`, `<= 4 CPU cores`, `effectiveType` of `2g`/`3g`, or `saveData = true`), **When** the app initializes, **Then** the Adaptive UX Engine selects `tier = 'low-spec'`, disabling expensive multi-layer CSS blurs and continuous ambient animations so answer selection latency stays strictly `< 16 ms`.
3. **Given** any learner in any geographic region, **When** the client telemetry detector reads `Intl.DateTimeFormat().resolvedOptions().timeZone`, **Then** all spaced-repetition (SM-2) daily rollover cutoffs, study streaks, and mock exam timestamps align accurately to the student's true local timezone.

---

### User Story 5 - Admin & Security Governance Command Center (Priority: P5)

An administrator or faculty lead opens the **Security & User Governance Drawer / Modal** to inspect user accounts, adjust roles (`student-free`, `student-pro`, `faculty-reviewer`, `admin`), toggle granular feature flags, inspect geo/device login telemetry, and block or unblock accounts with a recorded audit trail.

**Why this priority**: Gives the platform owner complete operational control over users, permissions, and security anomalies directly from a clean, keyboard-accessible interface without writing raw SQL queries.

**Independent Test**: Open the Governance view with an `admin` profile, filter users by role or security flag, toggle a user's feature flag or block status, and verify that the state change persists, logs an audit entry, and updates the KV cache immediately.

**Acceptance Scenarios**:

1. **Given** an authenticated `admin` user, **When** they open the Governance panel, **Then** they can inspect user profiles alongside their latest device, OS, Country/City, ASN, and active session count, and modify roles or block statuses with optimistic UI feedback.
2. **Given** a non-admin user (`student-free` or `student-pro`), **When** they attempt to access admin governance endpoints or UI actions, **Then** both the domain policy guard and the edge worker reject the action immediately with `403 INSUFFICIENT_ROLE`.

---

### Edge Cases

- **Cookie Cache vs. KV Secondary Storage Desync**: To prevent the known Better Auth issue where an expired `cookieCache` fails to fall back or serves stale role/ban state, the system enforces a strict **Cache-Aside + Explicit Purge Strategy**: KV acts as the authoritative fast edge cache (with a 10-minute sliding TTL), and any role change, block action, or session revocation explicitly deletes `kv.delete('session:' + token)` and writes `kv.put('revoked:' + userId, timestamp)` simultaneously with the D1 transaction.
- **Deprecated / Blocked Browser Fingerprinting APIs**: The client capability probe MUST NOT invoke `navigator.getBattery()`, Canvas 2D/WebGL pixel readbacks, or `AudioContext` oscillator hashing, as these cause main-thread jank and trigger privacy warnings in Safari, Brave, and Firefox. All browser capability signals (`deviceMemory`, `hardwareConcurrency`, `connection`) are wrapped in safe feature-detection guards with deterministic fallbacks when omitted by the browser (e.g., Safari/Firefox defaulting to `balanced` tier with frame-timing validation).
- **Missing Cloudflare Edge Headers in Local Dev (`vite dev`)**: When running locally outside `wrangler dev`, `request.cf` is absent; the Edge Telemetry Extractor gracefully falls back to a typed `LocalDevFallbackTelemetry` snapshot (`colo: 'LOCAL'`, `country: 'DEV'`, client-derived timezone and user-agent) so all UI components and tests run identically without null-pointer exceptions.
- **Mid-Exam Session Expiration**: If a student's short-lived auth token reaches its refresh threshold while they are in the middle of a timed 2-hour Mock Exam (`SessionPlayer`), token renewal happens silently in the background and NEVER interrupts, reloads, or steals keyboard focus from the active exam canvas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Hybrid Edge Auth & Local-First Continuity)**: System MUST support seamless local-first guest operation (`anonymous` mode) and authenticated cloud accounts (`Better Auth` + `D1` + `Workers KV`), merging local IndexedDB study records (`attempts`, `reviewCards`, `bookmarks`, `notes`) into the authenticated account upon sign-in without data loss.
- **FR-002 (KV-Accelerated Session Verification & Cache Eviction)**: Edge session verification MUST check Cloudflare Workers KV first (`~1–4 ms`), falling back to D1 only on cache miss, and MUST immediately purge KV session keys upon logout, session revocation, role modification, or account blocking.
- **FR-003 (Role-Based Access Control & Granular Feature Entitlements)**: System MUST enforce strongly-typed roles (`anonymous`, `student-free`, `student-pro`, `faculty-reviewer`, `admin`) and feature flags (`ai_cloud_streaming`, `unlimited_mock_exams`, `studio_authoring`, `multi_block_access`, `governance_console`) at both the domain layer and the edge API boundary.
- **FR-004 (Instant User Blocking & Session Revocation)**: System MUST allow administrators to block/unblock users (with `blockedReason` and optional `blockedUntil` timestamp) and allow users/admins to revoke individual device sessions with immediate enforcement on the next edge request.
- **FR-005 (Zero-Cost Edge Geo & Network Telemetry Capture)**: The Cloudflare Worker middleware MUST extract `request.cf` and HTTP header intelligence (`ipAddress`, `country`, `city`, `region`, `continent`, `latitude`, `longitude`, `postalCode`, `asn`, `asOrganization`, `colo`, `httpProtocol`, `tlsVersion`, `userAgent`, `clientHints`, `acceptLanguage`) at `0 ms` external I/O cost and bind it to the session record.
- **FR-006 (Lightweight Client Hardware & Timezone Capability Probe)**: The client application MUST safely detect `timezone` (`Intl.DateTimeFormat`), `cpuCores` (`navigator.hardwareConcurrency`), `deviceMemoryGb` (`navigator.deviceMemory`), `effectiveConnectionType` (`navigator.connection.effectiveType`), `saveData`, `devicePixelRatio`, and `prefersReducedMotion` on startup in `< 1 ms` without calling deprecated/invasive fingerprinting APIs (`getBattery`, Canvas/Audio hashing).
- **FR-007 (Adaptive Performance Tier & CSS Compositor Engine)**: System MUST compute an active `PerformanceTier` (`ultra` | `balanced` | `low-spec`) from client hardware/network signals (with manual user override in the header/settings) and bind `data-perf-tier` to `document.documentElement` to dynamically scale blur depth, shadow complexity, and animation curves.
- **FR-008 (60/120fps Interruptible Spring Motion Architecture)**: All Auth, Profile, Active Devices, and Governance drawers/modals MUST animate exclusively using GPU-composited properties (`transform: translate3d`, `opacity`) with interruptible spring physics (`cubic-bezier(0.22, 1, 0.36, 1)`), and collapse to `0 ms` instant transitions when `prefers-reduced-motion: reduce` is active.
- **FR-009 (Lazy-Loaded Auth & Governance UI Modules)**: All authentication modals, device security views, and admin governance panels MUST be dynamically code-split (`React.lazy`) with hover/focus prefetching so initial application bundle size increases by `< 1.5 KB` gzipped.
- **FR-010 (Account & Active Devices Security Self-Service)**: Authenticated users MUST be able to view their active sessions (showing OS, Browser, City/Country, Edge Colo, and last-active time), revoke unfamiliar devices, and inspect their current hardware performance tier and timezone alignment.

### Key Entities

- **`UserIdentity` & `AuthSession`**: Core domain representations of the learner's identity, role (`UserRole`), account status (`active` | `blocked` | `suspended`), computed `FeatureEntitlementSet`, and session lifecycle timestamps (`createdAt`, `expiresAt`, `lastVerifiedAt`).
- **`EdgeNetworkTelemetry`**: Immutable value object captured at the Cloudflare Worker edge containing geographical coordinates, Country/City/Region, ASN/ISP organization, Edge `colo` code, TLS/HTTP protocol metadata, and parsed `DeviceDescriptor` (OS, Browser, Device Category).
- **`ClientCapabilityProfile` & `PerformanceTier`**: Immutable value object capturing client RAM tier, logical CPU cores, network effective connection type, DPR, local IANA timezone string, and the resolved rendering tier (`ultra` | `balanced` | `low-spec`).
- **`SecurityAuditEvent` & `AnomalyFlag`**: Domain record tracking sign-ins, role changes, account blocks, device revocations, and automated security signals (such as `impossible_travel_geo_shift` or `excessive_concurrent_devices`).
- **`AuthPort` & `SessionCachePort`**: Hexagonal domain interfaces decoupling the React/Zustand application from the underlying Better Auth + Cloudflare D1 + Workers KV infrastructure and the local offline demo/guest adapter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Sub-5ms Edge Session Verification)**: `95%+` of authenticated edge requests resolve session and block status directly from Workers KV or optimistic cache in `< 5 ms` edge execution time (`0` D1 SQL reads on warm requests).
- **SC-002 (Zero Initial Load Degradation)**: Initial application startup and practice player readiness remain `< 50 ms` locally, and main bundle size increases by `< 1.5 KB` gzipped via route/modal code splitting.
- **SC-003 (Locked 60/120fps UI Fluidity Across Device Tiers)**: Modal/drawer transitions maintain `60 fps` (`< 16.6 ms` frame time) on `ultra`/`balanced` devices, and `low-spec` mode reduces GPU compositing/blur overhead by `> 70%` on constrained devices (`<= 4 GB RAM`).
- **SC-004 (Instant Revocation & Block Enforcement)**: Blocking a user or revoking a device session invalidates the edge KV entry within `< 100 ms`, ensuring `100%` of subsequent protected requests from that session are denied immediately.
- **SC-005 (100% Local-to-Cloud Progress Preservation)**: Signing into an account from a local guest session merges `100%` of locally recorded question attempts, spaced-repetition review cards, bookmarks, and notes with zero duplicates or data loss.

## Assumptions

- **Constitutional Alignment (ADR-003 — Optional Cloud Identity & Adaptive Telemetry Extension)**: In accordance with `.specify/memory/constitution.md` Governance rules, this feature is architected as a **progressive, opt-in Hexagonal layer**. The application continues to work **100% free, offline, and without mandatory sign-up** (`anonymous` local-first mode per Principle P8), while enabling Cloudflare Edge Auth (`Better Auth` + `D1` + `KV`), RBAC, and cloud sync when deployed with Cloudflare bindings or switched to authenticated mode.
- **Privacy-Safe Client Telemetry**: Only zero-cost edge headers (`request.cf`) and standard non-invasive Web APIs (`hardwareConcurrency`, `deviceMemory`, `connection`, `Intl` timezone) are collected; invasive fingerprinting (`getBattery`, Canvas/WebGL/Audio hashing) is strictly excluded.
