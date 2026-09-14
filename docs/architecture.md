# NetLearn architecture

The Week 1 app combines original lessons, local progress, and interactive teaching tools. It has ten user-facing routes, plus custom 404 recovery, and no backend or remote data service.

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

The homepage animation is a simplified fixed illustration; it makes no protocol decisions. The lab and Playground use the actual event engine. See model-limitations.md for explicit teaching assumptions.

## Subnets

IPv4 parsing accepts four strict decimal octets; arithmetic uses safe JavaScript numbers rather than signed 32-bit shifts. The calculator handles /0 through /32, distinguishes point-to-point /31 and host /32 cases, and reports masks, ranges, counts, and binary boundaries. Splitting creates at most 16 child results per page even for /0 to /32.

## Progress

A stable useSyncExternalStore subscription avoids browser storage reads during server rendering. Versioned completion records are validated and normalized. Invalid/future records are preserved. Failed reads or writes fall back to tab memory, retaining progress across client navigation; a full reload loses that fallback. Storage events synchronize successful writes across tabs on the same origin. No personal data or quiz-answer history is collected.

## Design and accessibility

Shared color, spacing, type, radius, and duration tokens support the navy/blue/mint identity. Semantic headings, skip navigation, visible focus, native radio questions, live feedback, and Escape-to-close mobile navigation are shared conventions. Simulation controls, device selectors, and cable/configuration forms provide keyboard access. Scrollable tables are focusable. OS reduced motion suppresses moving particles and nonessential transitions while retaining step-by-step text.

Vitest/Testing Library cover observable logic and storage behavior. Playwright tests the production build with axe, responsive sizes, enlarged text, keyboard interactions, and motion preferences. Automated checks are not accessibility certification or a substitute for user testing with assistive technology.

## Deployment

The standard Next.js build is ready for an eventual Vercel deployment. No environment variables or platform-specific services are required. Deployment, pushes, and Git commits remain separate owner approvals. No Site is registered and no hosting manifest is present. See deployment.md for the reviewable release procedure.
