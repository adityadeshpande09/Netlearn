# NetLearn project instructions

## Current scope

Work in small, reviewable units following `docs/architecture.md` and
`docs/development-plan.md`. The owner explicitly authorized completion of all Week 1 on September 10.
Complete the foundation, five lessons, Packet Journey, Subnet Visualizer,
Network Playground, local progress, and full validation as one reviewable batch.
Week 1–3 implementation is committed and pushed. The owner deployed the site on Vercel and authorized Week 4 implementation, live-site verification, and a README update on September 28. The current unit adds ARP, ICMP/Ping, and subnetting lessons, compatible progress/schema updates, and documentation. Live Supabase setup remains deferred. Follow docs/development-plan.md; staging, committing, pushing, and publishing this new unit require separate explicit approval.

## Git approval and communication

The owner additionally requested a more natural, intuitive UI on September 28,
while handling Supabase and SMTP themselves. This authorizes interface work and
validation alongside the uncommitted Week 4 unit, not commits or deployment.

These rules preserve the owner's explicit instructions from the linked plan.

- Implement and validate one proposed commit at a time. Communicate progress.
  The current Week 4 unit above is the authorized implementation scope.
- Before staging, inspect `git status`, `git diff`, and `git diff --stat`; inspect
  `git diff --cached` if anything is staged. Read untracked files explicitly:
  ordinary `git diff` does not show them.
- Check for secrets, environment files, generated output, debug code, unrelated
  changes, excessive dependency changes, and unexpected file sizes.
- Do not stage before approval. Report the completed scope, important files,
  architecture decisions, dependency changes, exact checks/results, manual
  checks, limitations, and the exact file list proposed for the commit.
- Propose one concise commit message, such as
  `Add NetLearn lessons and tools`. The owner prefers short, simple commit messages. Conventional Commits are optional.
- Ask for explicit approval and STOP. Silence or a request for an explanation
  is not approval. One approval authorizes one specific commit only.
- After approval, stage only the agreed files, review the staged diff, commit
  using the agreed message, and report the hash. Do not start the next unit
  unless the user has requested it.
- Never commit, amend, merge, rebase, push, force-push, or publish without the
  owner's explicit permission for that specific action. Push permission is
  separate from commit permission. Do not invent remotes or commit identities.

## Architecture

- Next.js App Router, React 19, strict TypeScript, pnpm, Tailwind CSS 4.
- Server Components by default. Add client boundaries only for interaction,
  animation, storage, or the topology canvas.
- Networking logic belongs in `src/domain/networking` as pure TypeScript.
  It must not import React, Next.js, browser APIs, or UI components.
- The simulator produces typed events; UI renders them. Do not implement the
  simulation algorithm as a sequence of UI timers.
- Content belongs in typed content modules. Persistence belongs behind a
  progress repository interface. These folders are created when first needed.
- No `any`, unexplained type assertions, giant components, or abstractions
  without a real boundary. Comments explain reasons, not obvious operations.
- Validate external/persisted data where it enters the application. Add Zod
  only when those boundaries exist.

## Interface and accessibility

- Technical education with a restrained, editorial visual identity. Avoid fake
  metrics, testimonials, decorative particles, excessive gradients, and default
  component-library themes.
- Semantic HTML, one logical h1, clear labels, visible keyboard focus, skip
  navigation, adequate targets, responsive layouts, and readable contrast.
- Target WCAG 2.2 AA; automated checks are one part of validation, not certification.
- Motion explains state and cause/effect. Honor OS reduced motion with CSS and
  `useReducedMotion()` when Motion is introduced. Animation must not be needed
  to understand content. Every simulation needs equivalent text output.
- Preserve functionality at 375, 768, 1280, and 1440px and at enlarged text sizes.

## Validation and dependencies

Run applicable checks before reporting a proposed commit:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The browser suite uses the production build. Install Chromium with
`pnpm exec playwright install chromium` on a fresh machine.
Never hide failures or disable checks to make them pass. Test observable
behavior and domain invariants, not implementation details or invented features.
State exactly what ran and what could not run.

Preserve the lockfile and pinned pnpm version. Explain additions/upgrades.
Verify supported, stable, security-patched Next.js versions before upgrades;
do not assume package versions in older chat messages remain current.
Do not override package-manager supply-chain policy or peer requirements.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

The owner additionally authorized the Playground host terminal (ip addr, ip route, ip neigh, ping and traceroute). Include this implementation and validation in the pending review; commit and publish approval remain separate.
