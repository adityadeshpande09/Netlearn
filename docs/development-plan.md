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

1. **Saved playgrounds — committed locally:** named browser snapshots, safe loading/deletion, restored device/cable/layout/packet settings, validation of stored data, clear storage-failure feedback, and preservation of unapplied device drafts. No account is required.
2. **Current unit — accounts and synced progress:** Supabase cookie authentication, guest learning preserved, explicit import of local completion, per-user completion rows, access policies, and cross-device synchronization. A project URL and publishable key plus database setup are required for real integration testing. Never request or expose a service-role key.
3. **Packet details:** actual typed Ethernet, ARP, IPv4, and ICMP header snapshots, protocol/layer explanations, field sizes, and change highlighting. Distinguish a pending IPv4 packet from ARP traffic and use correct next-hop addresses. Any displayed checksum must be computed from the modeled bytes.

For each unit, implement and validate, present the exact proposed files and a short commit message, then wait for the owner's approval before committing or starting the next unit.
