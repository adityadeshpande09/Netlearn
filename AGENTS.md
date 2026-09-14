# NetLearn project instructions

## Current scope

Work in small, reviewable units following `docs/architecture.md` and
`docs/development-plan.md`. The owner explicitly authorized completion of all Week 1 on September 10.
Complete the foundation, five lessons, Packet Journey, Subnet Visualizer,
Network Playground, local progress, and full validation as one reviewable batch.
The owner approved the initial Week 1 commit and push to the public Netlearn repository. Future commits and pushes still require approval. Do not add Week 2 features.

## Git approval and communication

These rules preserve the owner's explicit instructions from the linked plan.

- Implement and validate one proposed commit at a time. Communicate progress.
  The owner-approved Week 1 batch above is the current scope exception.
- Before staging, inspect `git status`, `git diff`, and `git diff --stat`; inspect
  `git diff --cached` if anything is staged. Read untracked files explicitly:
  ordinary `git diff` does not show them.
- Check for secrets, environment files, generated output, debug code, unrelated
  changes, excessive dependency changes, and unexpected file sizes.
- Do not stage before approval. Report the completed scope, important files,
  architecture decisions, dependency changes, exact checks/results, manual
  checks, limitations, and the exact file list proposed for the commit.
- Propose one concise human commit message, such as
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
- No authentication, backend, database, AI tutor, multiplayer, gamification,
  full IOS emulation, or advanced routing protocols in Week 1.
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
