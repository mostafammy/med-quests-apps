# Quickstart & Verification Guide: Edge Authentication, Telemetry & Adaptive UX (`003-edge-auth-adaptive-telemetry`)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contracts**: [auth-telemetry-ports.ts](contracts/auth-telemetry-ports.ts)

---

## 1. Prerequisites & Environment

- **Node.js**: 20+ and `pnpm`
- **Local Development**: Runs out-of-the-box with `pnpm dev` using the deterministic `LocalSimulatedEdgeAuthAdapter` (which simulates Cloudflare `request.cf` edge colos, KV cache hits/misses, multi-device sessions, and D1 persistence in IndexedDB/localStorage) OR against live Cloudflare Workers/D1/KV via `npx wrangler dev`.

```bash
# Install dependencies and verify strict TypeScript compilation
pnpm install
pnpm build
```

---

## 2. End-to-End Verification Scenarios

### Scenario 1: `< 1 ms` Optimistic Hydration & Local-to-Cloud Progress Merge (US1)
1. Start the app (`pnpm dev`) in default **Local Guest (`anonymous`)** mode.
2. Answer 3 questions in Quick Practice, bookmark 1 question, and add a personal note.
3. Click the **Identity & Edge Status Pill** in the top navigation bar to open the lazy-loaded **Auth & Security Modal**.
4. Sign in or create an account:
   - Verify the transition completes at 60fps with a toast confirming that all local attempts, spaced-repetition cards, bookmarks, and notes were merged with `0` data loss.
   - Reload the browser and verify that the authenticated profile badge and dashboard render immediately (`< 15 ms`) from optimistic cache before background edge revalidation completes.

### Scenario 2: Edge Network, Geo & Active Device Telemetry Inspection (US3)
1. Open the **Security & Active Devices** tab inside the Identity Modal.
2. Verify the current session displays:
   - **Edge Network**: IP address, Country/City, ISP/ASN, Cloudflare Colocation center (`colo`, e.g., `CAI`, `FRA`, `LHR`), HTTP/3 + TLSv1.3 badges, and KV Cache verification latency (`~2 ms`).
   - **Device Intelligence**: Parsed OS, Browser + Engine, Device Category (`desktop` / `tablet` / `mobile`), and true IANA Timezone (`Intl.DateTimeFormat`).
3. Click **"Simulate New Device Sign-In (London · iPadOS)"** or **"Revoke Device"** on a secondary session and verify immediate session removal and anomaly badge updates (`impossible_travel_geo_shift`).

### Scenario 3: Adaptive Hardware Performance Tiering (`ultra` vs `balanced` vs `low-spec`) (US4)
1. Open the **Hardware & Adaptive UX** tab inside the Identity Modal (or use the quick Tier Switcher).
2. Inspect the live detected metrics: Logical CPU Cores (`navigator.hardwareConcurrency`), Memory Tier (`navigator.deviceMemory`), Effective Connection (`4g`/`3g`), Display Pixel Ratio, and Timezone.
3. Toggle the override between **`Ultra (120fps Glass)`**, **`Balanced (60fps)`**, and **`Low-Spec (Zero-Blur Saver)`**:
   - Inspect `document.documentElement.dataset.perfTier` in DevTools.
   - Verify that `low-spec` immediately disables expensive `backdrop-filter: blur()` passes and infinite floating orb animations while keeping crisp contrast and `< 70 ms` snappy transitions.

### Scenario 4: Admin RBAC, Feature Flags & Instant Account Blocking (US2 & US5)
1. Switch active role or open the **Admin Governance Console** (`admin` role).
2. Toggle a user's role (`student-free` ↔ `student-pro` ↔ `faculty-reviewer`) or individual feature entitlements (`question_studio_author`, `ai_cloud_streaming_quota`):
   - Verify the KV cache invalidates immediately (`kvCacheStatus` updates) and UI capabilities unlock without a page reload.
3. Click **"Block User Account"** with a reason (e.g., *"Account sharing across 4 countries"*):
   - Verify the user's KV guard (`usr_guard:{userId}`) updates immediately and transitions the session to the calm **Account Restricted** screen with full audit trail visibility.
