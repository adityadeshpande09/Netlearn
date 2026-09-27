# NetLearn development plan

On September 10 the owner authorized completion of all Week 1 as one reviewable batch. This supersedes earlier daily implementation pauses. The owner later separately approved the initial Week 1 commit and push to the public Netlearn repository. Website deployment remains a separate step.

## Week 1 implemented scope

1. Foundation: Next.js, strict TypeScript, package management, code checks, project conventions, responsive shell, design tokens, and 404 recovery.
2. Learning: purposeful animated homepage, typed curriculum, five original lessons, diagrams, retryable prediction questions, hints, completion, and local progress.
3. Packet Journey: pure network models and deterministic engine; ARP, switching, routing, TTL and Ethernet changes; playback, timeline, packet inspector and device tables.
4. Subnet Visualizer: strict input validation, /0–/32 results, binary boundary, prefix slider, special cases and paginated child networks.
5. Network Playground: custom React Flow devices, add/remove/move, interface and static route configuration, cables, source/destination/TTL selection, explained delivery/failure, keyboard form alternatives.
6. Integration and release preparation: route navigation, lesson-to-tool links, responsive and reduced-motion behavior, unit/browser/accessibility validation, model and deployment documentation.

This list describes the actual delivered boundaries, not fabricated daily commit history. The original long conversation was truncated after the Packet Journey sequence; the exact Day 4–7 subdivisions were not retrievable. Its complete Week 1 feature criteria and Git approval workflow were available and guide this batch.

## Week 1 exclusions

No backend/database, authentication, AI tutor, multiplayer, dynamic routing protocols, IOS emulator, badges, streaks, or leaderboards. Playground topology is temporary; only lesson completion persists. Public deployment is an eventual separately approved step.

## Review and commit

The first application commit includes the entire Week 1 app and follows the repository's initial README commit. Present the exact files, architecture decisions, dependency changes, checks and limitations in a dated review report before asking for approval. Do not stage until approved. A commit approval covers one stated commit only; it does not authorize a push, publication, or Week 2 work.

## Week 2

The owner requested saved playgrounds, accounts with synced progress, and a more detailed Packet Journey. Work proceeds in reviewable units; this request does not authorize staging, commits, pushes, or website deployment.

1. **Saved playgrounds — committed and pushed:** named browser snapshots, safe loading/deletion, restored device/cable/layout/packet settings, validation of stored data, clear storage-failure feedback, and preservation of unapplied device drafts. No account is required.
2. **Accounts and synced progress — code committed and pushed:** Supabase cookie authentication, guest learning preserved, explicit import of local completion, per-user completion rows, access policies, and cross-device synchronization. A project URL and publishable key plus database setup are still required for real integration testing. Never request or expose a service-role key.
3. **Packet details — carried into Week 3:** selected by the owner as the next implementation unit below.

For each unit, implement and validate, present the exact proposed files and a short commit message, then wait for the owner's approval before committing or starting the next unit.

## Week 3

The owner selected detailed packet headers and protocol explanations as the first Week 3 unit. The shared inspector in Packet Journey and Playground shows typed Ethernet II, ARP, IPv4, and ICMP snapshots, field sizes, protocol explanations, and serialized hexadecimal bytes. ARP traffic is separate from the waiting IPv4 datagram. IPv4 and ICMP checksums are computed from the modeled bytes; TTL and checksum changes are highlighted at the routing step. Expandable fields preserve a readable default view and keyboard access.

This unit added no services or dependencies. It retains a one-way ICMP echo request, without TCP/UDP, reply traffic, fragmentation, NAT, or live packet capture. Account setup and live verification are still pending separately.

Packet details were committed as `9914e36` and pushed with owner approval.

### Current unit — guided labs and hosting preparation

The owner authorized finishing Week 3 and committing this unit locally, while
deferring live Supabase setup. This approval does not include a push or deployment.

- Guided troubleshooting at /labs/troubleshooting covers a missing default
  gateway, a disconnected router cable causing ARP failure, and TTL exhaustion.
  Students inspect the original failure, choose a repair, and compare the actual
  simulator result using the shared trace and packet inspector. Each attempt
  starts from the broken baseline; hints and reset support retries. Attempts
  stay on the page and do not affect lesson completion.
- Hosting preparation includes Vercel configuration, a safe deployment
  preflight, isolated guest/account browser validation, an email-code template,
  and read-only database verification. Empty account settings support guest
  mode; invalid supplied settings fail the build preflight.

Live email delivery, authenticated database isolation, and a hosted deployment
remain unverified release steps. A passing local build or mocked account test
does not finish those checks. See accounts-setup.md and deployment.md.

## Week 4 candidates

Dedicated ARP, ICMP, and subnetting lessons, additional guided exercises, and
release verification can follow as separate reviewed units. They are not
included in the Week 3 completion commit. Keep the current five-lesson database
allowlist until a curriculum expansion updates and validates it deliberately.
