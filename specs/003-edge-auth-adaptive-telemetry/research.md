# Technical Research & Architectural Decisions: Edge Authentication, Telemetry & Adaptive UX (`003-edge-auth-adaptive-telemetry`)

**Feature**: [spec.md](spec.md) | **Date**: 2026-10-24

---

## 1. Authentication & Edge Caching Architecture

### Decision 1.1: Hybrid Better Auth + Cloudflare D1 + Workers KV Cache-Aside Pattern
- **Decision**: Use **Better Auth** backed by **Cloudflare D1** (SQLite primary relational store) paired with an explicit **Cloudflare Workers KV Cache-Aside & Revocation Layer** (`SessionCachePort`) rather than relying solely on Better Auth's built-in `cookieCache` + `secondaryStorage` combination.
- **Rationale**:
  1. Raw D1 reads across regions incur `25–80 ms` round-trip latency due to single-primary replication.
  2. Workers KV reads execute in `1–4 ms` at the nearest Cloudflare colocation center (`request.cf.colo`).
  3. Better Auth's built-in `cookieCache` + `secondaryStorage` has a documented edge-case where expired cookie caches fail to fall back cleanly or delay ban/role propagation. By managing KV cache keys explicitly (`session:{tokenHash}` and `user_state:{userId}`) with synchronous invalidation on write (`blockUser`, `updateUserRole`, `revokeSession`), we achieve **`~2 ms` warm read speed** AND **instant global revocation**.
- **Alternatives Considered**:
  - *Pure Stateless JWTs*: Fastest (`~0.2 ms`), but cannot revoke compromised sessions or enforce user blocks mid-session without re-introducing a KV blocklist.
  - *Default D1-Only Sessions*: Simple, but adds `30–100 ms` latency to every protected request.
  - *Managed SaaS (Clerk / Auth0)*: Vendor lock-in, external network hop, and steep per-MAU costs at scale.

### Decision 1.2: Stale-While-Revalidate Optimistic Client Hydration (`< 1 ms` Startup)
- **Decision**: Never block the React tree (`<App />` or `<SessionPlayer />`) on an initial `/api/auth/session` network fetch. Instead:
  1. Persist a Zod-validated `OptimisticSessionSnapshot` in `IndexedDB` (`MedQuestsDB.authSession`) and `localStorage` mirror.
  2. Hydrate `useAuthStore` synchronously on first paint (`< 1 ms`).
  3. Trigger a non-blocking background edge verification (`revalidateSession()`) via `requestIdleCallback` (or after `50 ms` on browsers without `requestIdleCallback`).
- **Rationale**: Guarantees that a medical student opening the app 20 minutes before an exam sees their dashboard or test session immediately (`0 ms` auth spinner delay), while role updates or account blocks are still enforced within milliseconds of network completion.

### Decision 1.3: Offline-First Guest Continuity & Deterministic Account Merge
- **Decision**: Preserve Constitution **P8 (Local-First, Private, Free)** via a Dual-Adapter Strategy (`LocalAnonymousAuthAdapter` vs. `CloudflareEdgeAuthAdapter`). When an anonymous user signs in or registers, execute a deterministic **CRDT-style Union Merge** (`mergeLocalProgressIntoAccount`):
  - `attempts`: Set union by `AttemptId` (append-only immutable log).
  - `reviewCards`: Per-`questionId`, resolve conflicts by taking the card with the most recent `lastReviewedAt` timestamp.
  - `bookmarks`: Set union by `questionId`.
  - `notes`: Per-`questionId`, keep the most recently updated `updatedAt` text (or concatenate if both modified).
- **Rationale**: Zero friction before sign-up; zero lost study work after sign-up.

---

## 2. Dual-Pipeline Telemetry Architecture (Security vs. UI Optimization)

### Decision 2.1: Zero-Cost Edge Geo & Network Intelligence (`request.cf`)
- **Decision**: Capture all security, geographical, and network routing signals strictly at the **Cloudflare Worker edge** using `request.cf` and standard HTTP headers (`CF-Connecting-IP`, `User-Agent`, `Sec-CH-UA`, `Sec-CH-UA-Platform`, `Sec-CH-UA-Mobile`, `Accept-Language`).
- **Rationale**:
  - `request.cf` is pre-populated by Cloudflare's edge router during the TLS handshake (`0 ms` latency, `0` external API calls, `$0` cost).
  - Provides accurate `country`, `city`, `region`, `continent`, `latitude`, `longitude`, `postalCode`, `asn`, `asOrganization` (ISP), `colo` (edge airport code), `httpProtocol`, `tlsVersion`, and optional `threatScore` / `botScore` when available on the zone plan.
- **Alternatives Considered**: Third-party IP geolocation APIs (MaxMind REST, ipinfo.io) — rejected due to `50–150 ms` network latency, rate limits, and privacy leakage.

### Decision 2.2: Privacy-Safe, Zero-Jank Client Hardware & Timezone Probe
- **Decision**: Collect only lightweight, synchronous Web API signals on the client for UI/UX adaptation:
  - `Intl.DateTimeFormat().resolvedOptions().timeZone` & `locale`
  - `navigator.hardwareConcurrency` (logical CPU cores)
  - `navigator.deviceMemory` (approximate RAM in GB, Chromium/Edge)
  - `navigator.connection?.effectiveType` (`'slow-2g' | '2g' | '3g' | '4g'`) & `saveData`
  - `window.devicePixelRatio` & `window.matchMedia('(prefers-reduced-motion: reduce)')`
  - **Explicitly Banned**: `navigator.getBattery()`, Canvas 2D/WebGL fingerprinting, and `AudioContext` hashing.
- **Rationale**: Canvas/Audio fingerprinting locks the main thread for `15–50 ms` on startup, drains mobile battery, and triggers anti-fingerprinting blocks in Safari, Brave, and Firefox. Native capability APIs execute in `< 0.2 ms` and directly inform rendering optimization and timezone-accurate SRS scheduling.

---

## 3. Adaptive 60/120fps Fluid Animation & Low-Spec Compositor Engine

### Decision 3.1: Three-Tier Hardware Compositor Scaling (`ultra` | `balanced` | `low-spec`)
- **Decision**: Classify every client device into one of three deterministic rendering tiers and apply `data-perf-tier="ultra|balanced|low-spec"` to `document.documentElement`:
  1. **`ultra` Tier** (`>= 8 cores` AND `>= 8 GB RAM` (or Apple Silicon/Desktop Safari with high DPR), `4g`, no `saveData`, no `prefers-reduced-motion`):
     - Full multi-layer specular glass (`backdrop-filter: blur(28px) saturate(190%)`), ambient floating background orbs, magnetic card hover lift, and 120fps spring transitions.
  2. **`balanced` Tier** (`4–6 cores` OR `4 GB RAM`, `4g`, no `saveData`):
     - Reduced blur radius (`backdrop-filter: blur(12px)`), static ambient gradients (pauses infinite background `@keyframes float-fluid` to save GPU cycles), and 60fps GPU-composited `transform`/`opacity` transitions.
  3. **`low-spec` Tier** (`< 4 cores` OR `< 4 GB RAM` OR `effectiveType` in `['slow-2g', '2g', '3g']` OR `saveData === true` OR `prefers-reduced-motion: reduce`):
     - Replaces `backdrop-filter: blur(...)` with high-contrast opaque/semi-opaque surfaces (`rgba(255,255,255,0.96)` light / `rgba(24,24,27,0.96)` dark), disables all decorative infinite keyframe animations and shimmer sweeps, and uses ultra-crisp `< 80 ms` (or `0 ms` for reduced-motion) opacity transitions.
- **Rationale**: `backdrop-filter: blur(28px)` combined with large infinite moving gradient orbs is the #1 cause of dropped frames and thermal throttling on budget Android tablets and integrated GPUs. Tiering via a root HTML attribute lets CSS rules adapt globally with zero React re-render overhead.

### Decision 3.2: GPU-Composited Interruptible Spring Curves & Zero Layout Thrashing
- **Decision**:
  - Restrict all interactive animations (Auth modal, Active Devices drawer, Admin Governance drawer, Role badge morphs, Toast notifications) strictly to **compositor-only properties** (`transform: translate3d(x, y, 0)`, `scale3d()`, `opacity`).
  - Never animate `height`, `width`, `top`, `left`, `margin`, or `padding`.
  - Use Apple-grade spring approximation `cubic-bezier(0.22, 1, 0.36, 1)` for entrances (`220ms`) and `cubic-bezier(0.32, 0.72, 0, 1)` (iOS sheet curve) for drawers.
- **Rationale**: Compositor-only animations run on the browser's GPU compositor thread, staying locked at 60/120fps even if the main JS thread is busy validating schemas or syncing IndexedDB.
