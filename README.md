# NetLearn

Make invisible networking processes visible. The Week 1 MVP includes five lessons with prediction questions and local progress, Packet Journey, a Subnet Visualizer, and an editable Network Playground.

## Run locally

Use Node.js 22.21.1 (see .node-version) and pnpm 11.19.0 (pinned in package.json). From the project folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Next.js. Guest learning and browser saves need no configuration. Optional account sign-in and synced lesson progress require a Supabase project; see [account setup](docs/accounts-setup.md). Without its public settings, the account page clearly shows that sign-in is unavailable.

## Explore

| Route                 | What works                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| /                     | Animated concept preview, learning path introduction, links to all tools  |
| /account              | Email-code sign-in, explicit guest import, and synced lesson progress     |
| /learn                | Five-lesson curriculum and saved completion                               |
| /learn/network-basics | Networks, LAN/WAN, and service roles                                      |
| /learn/mac-vs-ip      | Local addresses, IP endpoints, and prefixes                               |
| /learn/switches       | Source MAC learning and forwarding                                        |
| /learn/routers        | Routes, gateways, and TTL                                                 |
| /learn/packet-travel  | Encapsulation and a complete packet journey                               |
| /labs/packet-journey  | 26-event normal trace, playback, inspection, and failure scenarios        |
| /tools/subnet         | IPv4 /0–/32 arithmetic, binary boundary, and paginated splitting          |
| /playground           | Add up to eight devices, edit interfaces/routes, connect cables, simulate |

The Playground has both drag-and-connect controls and equivalent native forms. Save named Playground snapshots in this browser to reopen devices, cables, layout, and packet settings after reload. Unfinished networks can be saved; unapplied device/route form changes must be applied first. Snapshots are separate versions rather than automatic saves. Up to 20 snapshots are supported; clearing browser storage removes them. Lesson completion persists in this browser and origin when local storage is available; otherwise it lasts in tab memory until reload. See [model boundaries](docs/model-limitations.md).

Packet Journey and Playground share a detailed inspector for Ethernet, ARP, IPv4, and ICMP. Expand a layer for field sizes, explanations, and hexadecimal bytes. ARP exchanges stay separate from the waiting IP packet; router steps highlight TTL and checksum changes. IPv4 and ICMP checksums are calculated from the modeled headers and payload. This remains an educational simulation, not live packet capture.

## Validate

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e --workers=2
```

The browser suite starts the production build on port 3100; leave that port free. Tests cover content integrity, progress validation and recovery, packet invariants and failures, subnet edge cases, lesson completion, topology editing, keyboard controls, reduced motion, responsive layouts, and automated accessibility. Dated validation results are reported separately from this description of coverage.

pnpm check runs lint, type checking, unit tests, and build. pnpm format formats source; pnpm test:watch runs Vitest interactively; pnpm start serves the production build.

## Code map

- src/app: route composition, metadata, shared layout and design tokens.
- src/content: typed original lessons, glossary entries, and quiz content.
- src/domain/networking: framework-independent IPv4, subnet, topology, and simulation code.
- src/features/network: shared playback, packet/device inspection, and lazy React Flow canvas.
- src/features/learning, packet-journey, subnet, playground: focused feature interfaces.
- src/repositories/progress: versioned storage interface and runtime validation.
- src/features/progress: separate guest and account stores, retryable completion synchronization.
- src/features/account and src/lib/supabase: verified account state, email-code forms, and cookie clients.
- supabase/migrations and supabase/tests: append-only completion schema, owner access policies, and rollback database tests.
- src/test and tests/e2e: domain/component and production browser tests.
- docs: architecture, sources, implementation scope, model boundaries, and deployment instructions.

## Collaboration and deployment

Every commit requires an implementation report, exact file list, validation results, and a proposed human-readable message before explicit approval. Pushing and publishing need separate permission. See [AGENTS.md](AGENTS.md).

Vercel is the intended eventual public target. Source is maintained in the public [Netlearn repository](https://github.com/adityadeshpande09/Netlearn). No hosting project is configured. See [deployment instructions](docs/deployment.md). Google Fonts must be reachable during builds for next/font; visitors receive self-hosted font files.
