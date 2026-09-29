# NetLearn

**See networking happen.**

Make invisible networking processes visible. Learn through lessons with prediction questions, Packet Journey, guided troubleshooting labs, a Subnet Visualizer, and a Network Playground with browser saves. Optional accounts sync lesson progress.

[Explore NetLearn](https://netlearn-ad.vercel.app) · [Learning path](https://netlearn-ad.vercel.app/learn) · [Try a lab](https://netlearn-ad.vercel.app/labs/troubleshooting)

## What you can do

- **Learn the foundations.** Eight lessons combine original explanations, diagrams, key terms, and retryable questions.
- **Follow a packet.** Step through ARP, switching, and routing. Inspect Ethernet, ARP, IPv4, and ICMP fields, hexadecimal bytes, TTL changes, and calculated checksums.
- **Troubleshoot a network.** Diagnose a missing gateway, a disconnected cable, or an expired TTL; choose a repair and inspect the simulator's result.
- **Explore subnets.** Change an IPv4 prefix, inspect the binary boundary, compare address ranges, and split networks into smaller subnets.
- **Build your own topology.** Connect and configure up to eight devices, test delivery, and save up to 20 named playgrounds in your browser. Native forms provide alternatives to dragging.
- **Inspect a host.** Open its Playground terminal for `ip addr`, `ip route`, `ip neigh`, `ping` and `traceroute`. Diagnostics use the same engine and label the absence of reply packets and timings.
- **Keep your progress.** Guest completion stays in your browser. Optional Supabase accounts support email-code sign-in and synced lesson completion after setup.

The interface includes keyboard controls, visible focus, reduced-motion support, responsive layouts, and text explanations alongside animations.

## Curriculum

| Lesson               | Main idea                                                    |
| -------------------- | ------------------------------------------------------------ |
| Network Basics       | Devices, local networks, the internet, and service roles     |
| MAC vs IP            | Local delivery addresses versus IP endpoints                 |
| Switches             | Source MAC learning and frame forwarding                     |
| Routers              | Gateways, route selection, and TTL                           |
| How a Packet Travels | Encapsulation and the journey across two networks            |
| ARP                  | Resolving the local next hop's IPv4 address to a MAC address |
| ICMP and Ping        | Echo requests, replies, and what a ping result can tell you  |
| Subnetting           | Prefixes, network boundaries, host ranges, and /26 practice  |

Lesson content and its technical references are documented in [content sources](docs/content-sources.md). The Week 4 lessons, refreshed interface and host terminal are part of this checkout; the live site updates after the corresponding release is published.

## Run locally

Use **Node.js 22.21.1** (see `.node-version`) and **pnpm 11.19.0** (pinned in `package.json`). A compatible Node.js 24 runtime is also supported.

```sh
git clone https://github.com/adityadeshpande09/Netlearn.git
cd Netlearn
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Next.js. **Guest mode needs no environment variables, database, or Docker.**

For accounts, follow [Supabase setup](docs/accounts-setup.md). Put only the project URL and publishable key in ignored `.env.local`; never add a database password, secret key, or service-role key. Apply every migration in order before enabling synced progress for the expanded curriculum.

## Built with

| Area              | Technology                                                 |
| ----------------- | ---------------------------------------------------------- |
| App               | Next.js 16 App Router, React 19, strict TypeScript         |
| Interface         | Tailwind CSS 4, Motion, Lucide icons                       |
| Network canvas    | React Flow, with equivalent keyboard-friendly forms        |
| Simulation        | Deterministic, framework-independent TypeScript            |
| Optional accounts | Supabase Auth and PostgreSQL with row-level security       |
| Validation        | Vitest, Testing Library, Playwright, axe, ESLint, Prettier |
| Hosting           | Vercel; guest mode works independently of Supabase         |

Exact versions are recorded in `package.json` and `pnpm-lock.yaml`.

## Project structure

```text
src/
  app/                  Routes, metadata, layout, and design tokens
  components/           Shared navigation and interface elements
  content/              Typed lessons, diagrams' content, and questions
  domain/networking/    Addressing, subnets, topology, and packet simulation
  features/             Learning, labs, inspectors, playground, and accounts
  repositories/         Validated browser and account persistence boundaries
supabase/               Migrations, access-policy tests, and email template
tests/e2e/              Production browser tests
docs/                   Architecture, teaching boundaries, and setup guides
```

The simulator produces typed events; playback renders those events without making network decisions. Lesson prose stays in typed content modules, and persistence is kept behind repository interfaces. See [architecture](docs/architecture.md) for the boundaries.

## Run the checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e --workers=2
pnpm test:accounts --workers=2
```

Run the two browser suites **sequentially** with port **3100** free. Each creates an isolated production build in `.next-test`; guest tests disable accounts, and account tests intercept Supabase requests with fixtures. They do not connect to your real database or verify email delivery. To reuse installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome` (PowerShell: `$env:PLAYWRIGHT_CHANNEL = "chrome"`).

Tests cover packet invariants and failures, subnet edge cases, stored-data validation, progress recovery, lesson questions, topology editing, keyboard navigation, responsive layouts, reduced motion, and automated accessibility. Database tests and the live account checklist are in [account setup](docs/accounts-setup.md).

`pnpm check` runs lint, type checking, unit tests, and the production build. `pnpm test:watch` starts Vitest interactively.

## Deployment

The public site is hosted at **[netlearn-ad.vercel.app](https://netlearn-ad.vercel.app)**. See [the deployment guide](docs/deployment.md) for Vercel settings, Supabase configuration, and release verification.

`pnpm build` includes a configuration preflight: missing account settings select guest mode, while partial or invalid settings fail. After configuring Supabase, `pnpm check:deployment --require-accounts --online` performs read-only connection checks without printing keys. Real email delivery and account isolation still need separate verification.

Google Fonts must be reachable during builds; visitors receive self-hosted font files. No analytics service is configured.

## Teaching boundaries

NetLearn is an educational model. It sends no real packets and does not capture network traffic. The simulator models one ICMP echo request with fresh ARP/MAC tables per run; it does not generate an echo reply or an ICMP Time Exceeded response. The ICMP lesson explains those real-world behaviors separately.

Playground saves stay on the current browser and origin; they do not sync to an account. Clearing browser data removes guest progress and saved playgrounds. Guided-lab attempts are temporary and do not mark lessons complete. See [all model boundaries](docs/model-limitations.md).

## Next steps

Planned work includes more guided exercises and live account verification. Cloud playground saves and additional protocols would require separate design and implementation; they are not current features. The [development plan](docs/development-plan.md) tracks delivered work and the next reviewable units.

For code changes, follow [project conventions](AGENTS.md), keep simulation logic independent of the interface, and include relevant validation. Commit and release changes only after the owner's review.
