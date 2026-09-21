# NetLearn architecture

The Week 1 app combines original lessons, local progress, and interactive teaching tools. It has eleven user-facing routes, plus custom 404 recovery. Supabase optionally provides email-code authentication and account lesson progress; guest learning and playground saves work without it.

## Stack and rendering

Next.js 16.3.4 App Router, React/React DOM 19.2.8, strict TypeScript, Tailwind CSS 4, Motion 13.2.0, Lucide React 1.43.0, and @xyflow/react 12.11.6. The pnpm lockfile records exact resolved dependencies. Node 22.21.1 and pnpm 11.19.0 are the validated local runtime.

Pages and layout are Server Components. Lesson prose stays on the server; client components receive just the data their interactions need. All current pages prerender. The React Flow canvas is loaded through next/dynamic with ssr:false inside a client component. Lightweight topology positions and types live separately so importing the Playground does not eagerly load the canvas library.

Geist Sans and Mono use next/font. Builds need Google Fonts access; visitors receive self-hosted fonts. Recheck current framework advisories before public deployment. ESLint 9 is deprecated upstream but matches this Next plugin set's peer support; revisit when compatible upgrades are available. jsdom 29 supports the current Node patch.

## Source boundaries

| Directory                   | Responsibility                                          |
| --------------------------- | ------------------------------------------------------- |
| src/app                     | Routes, metadata, page composition, design tokens       |
| src/components              | Shared navigation, footer, motion preferences           |
| src/content                 | Typed lesson and quiz content                           |
| src/domain/networking       | Pure addressing, subnet, topology, and simulation logic |
| src/features/network        | Reusable trace playback, canvas, and inspectors         |
| src/features/packet-journey | Fixed lesson topology and scenario selection            |
| src/features/subnet         | Input, binary explanation, subnet facts and splitting   |
| src/features/playground     | Workspace state, device/route/cable editors             |
| src/repositories/progress   | Versioned storage boundary and validation               |
| src/features/progress       | Completion store and React subscription                 |

Networking code cannot import React, Next, or UI modules; ESLint enforces the boundary. Native controls cover the current interface needs without an extra component framework. The small progress record uses an explicit runtime validator rather than a schema dependency.

## Simulation

Discriminated unions model hosts, switches, routers, and events. simulatePacket validates a scenario and deterministically returns events with copied packet, Ethernet-header, ARP-table, and MAC-table snapshots. It does not mutate inputs or use browser APIs. Internal tables use Maps; snapshots create own entries for every device to avoid inherited-property collisions.

The engine checks local/remote destinations, gateways, ARP broadcast/reply paths, switch learning, longest matching routes, TTL, Ethernet re-encapsulation, and delivery or an explained drop. ARP broadcasts traverse every connected switch branch but stop at hosts/router interfaces. Layer-2 cycles and invalid addressing/cables are rejected before execution.

The UI presentation clock selects an existing event. Play/pause, step, reset, speed, and timeline selection never affect networking decisions. Changes to a scenario reset playback. Custom React Flow nodes show devices; edges show the active local transfer. Device tables and text explanations expose the same information without relying on motion, color, or dragging.

Every event also carries a typed packet-header snapshot. Pure serializers in packet-headers.ts encode Ethernet II, ARP, option-free IPv4, and a fixed ICMP echo message; the Internet checksum implementation supplies real IPv4/ICMP checksums. ARP sender/target fields come from the actual selected interfaces and next hop. The current/last/no-frame context distinguishes wire envelopes from the retained IP datagram. Existing compact packet/frame snapshots remain available to the canvas. The shared inspector renders native disclosures, field descriptions/widths, and hexadecimal bytes in both labs, with no new dependencies or persistence changes.

The homepage animation is a simplified fixed illustration; it makes no protocol decisions. The lab and Playground use the actual event engine. See model-limitations.md for explicit teaching assumptions.

## Subnets

IPv4 parsing accepts four strict decimal octets; arithmetic uses safe JavaScript numbers rather than signed 32-bit shifts. The calculator handles /0 through /32, distinguishes point-to-point /31 and host /32 cases, and reports masks, ranges, counts, and binary boundaries. Splitting creates at most 16 child results per page even for /0 to /32.

## Progress

A stable useSyncExternalStore subscription avoids browser storage reads during server rendering. Versioned completion records are validated and normalized. Invalid/future records are preserved. Failed reads or writes fall back to tab memory, retaining progress across client navigation; a full reload loses that fallback. Storage events synchronize successful writes across tabs on the same origin. Guest progress stores no personal data or quiz-answer history. With accounts configured, Supabase Auth receives the sign-in email and manages session cookies; the progress table stores user ID, lesson slug, and completion timestamp.

## Design and accessibility

Shared color, spacing, type, radius, and duration tokens support the navy/blue/mint identity. Semantic headings, skip navigation, visible focus, native radio questions, live feedback, and Escape-to-close mobile navigation are shared conventions. Simulation controls, device selectors, and cable/configuration forms provide keyboard access. Scrollable tables are focusable. OS reduced motion suppresses moving particles and nonessential transitions while retaining step-by-step text.

Vitest/Testing Library cover observable logic and storage behavior. Playwright tests the production build with axe, responsive sizes, enlarged text, keyboard interactions, and motion preferences. Automated checks are not accessibility certification or a substitute for user testing with assistive technology.

## Deployment

The standard Next.js build is ready for an eventual Vercel deployment. Guest mode requires no environment variables. Accounts require the two public Supabase settings, the completion migration, and email configuration described in accounts-setup.md. Deployment, pushes, and Git commits remain separate owner approvals. No Site is registered and no hosting manifest is present. See deployment.md for the reviewable release procedure.

## Saved playgrounds (Week 2)

A separate versioned playground repository stores named snapshots of topology, positions, packet endpoints, and TTL. Structural decoding bounds data and validates references without requiring a working simulation, so disconnected or incorrectly addressed experiments remain saveable. New snapshots have distinct names; existing snapshots are never silently overwritten. Each mutation reloads the latest library so it preserves other tabs' saved entries. Storage events refresh only the saved list, never the active canvas. Malformed/future records remain untouched; unavailable/full storage reports failure without pretending to save.

The client library uses useSyncExternalStore with a stable server snapshot. Explicit loads restore configuration together and reset playback through the workspace revision. Newly generated device IDs and MACs are checked against loaded data. Native confirmation dialogs protect workspace replacement and deletion; unapplied device and route drafts disable snapshot saving until applied. No dependency, account, environment variable, or remote service is needed for this unit.

## Accounts and synced progress (Week 2)

The browser uses @supabase/ssr 0.12.7 with @supabase/supabase-js 2.116.0 for cookie-backed email-code sessions. The account store verifies identity with getUser, immediately clears previous identities on account changes, and ignores stale asynchronous results. The proxy refreshes cookie sessions through getClaims on account/learning routes and prevents shared caching of cookie-bearing responses. Public content stays prerendered; no personal account data is rendered into cached HTML. Database row policies, not client state, authorize every progress read and insert.

The existing synchronous guest repository is preserved separately. A pure asynchronous account store unions confirmed rows with pending completions and inserts only new rows, ignoring duplicates. It never auto-imports browser progress. Sign-out/account changes clear account memory and return to untouched guest progress. Unconfirmed account completions stay in tab memory, with visible failure/retry feedback and a leave-page warning while changes are pending. Refresh happens on login, window focus, reconnect, and explicit retry. There is no realtime subscription or cloud playground storage in this unit.

Unit tests cover stale sessions, account changes, offline retries, duplicate writes, and response validation. A separate browser suite intercepts Supabase requests to exercise the real client and screens; it does not verify actual email delivery, token signatures, or the remote database. SQL tests and a real two-account/two-device check remain required before release. See accounts-setup.md for setup and exact validation boundaries.
