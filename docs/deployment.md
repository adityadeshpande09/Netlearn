# Hosting NetLearn

The target is Vercel Hobby plus Supabase Free. The repository contains the
application, database migration, email template, connection checks, and Vercel
build settings. These files do not create a hosting project or prove a live
Supabase connection. Git commits, pushes, and publication still follow the
owner's separate approvals.

## Low-cost setup

- Vercel hosts Next.js with HTTPS and a provided `vercel.app` address. Hobby
  is for personal, non-commercial use and has usage caps.
- Supabase hosts PostgreSQL and authentication. Free currently includes a
  500 MB database and pauses inactive projects after one week. It does not
  include automatic backups; plan exports before storing important data.
- Docker and local PostgreSQL are not needed to run the hosted app. They are
  optional development tools for the disposable database test stack.
- Public email-code sign-in needs a custom SMTP sender. Supabase's default
  sender is restricted to project team addresses. Sender verification and
  any domain cost are separate from the free website address. Test real
  delivery before opening public sign-in.

Verified September 21, 2026: [Vercel pricing](https://vercel.com/pricing),
[Supabase pricing](https://supabase.com/pricing), and
[SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp).

## Connect Supabase first

1. Choose the owner's project on a Free organization. Keep its database
   password in the owner's password manager, outside the repository.
2. Apply `supabase/migrations/202609150001_lesson_completions.sql` once. Do not
   reset an existing database. Run `supabase/verify-setup.sql` in the same
   project's SQL Editor and investigate every failed check.
3. Configure Email authentication and SMTP as described in
   [account setup](accounts-setup.md). The reusable code email body is
   `supabase/templates/sign-in-code.html`.
4. Put only the Project URL and publishable key in ignored `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Never use a database password, secret key, or service-role key.
5. Run `pnpm check:deployment --require-accounts --online`. Then verify real
   email delivery, two-account isolation, and two-device progress using the
   account setup guide. The command makes no writes and cannot verify those
   behaviors by itself.

`pnpm build` runs the offline configuration check. Invalid or partial settings
fail; both absent deliberately build guest mode. A successful guest build does
not establish that accounts are configured.

## Import into Vercel

After the reviewed code and push are approved, import
[adityadeshpande09/Netlearn](https://github.com/adityadeshpande09/Netlearn) into
the owner's personal Hobby account. Review the project before publishing.

| Setting                                | Value                                                           |
| -------------------------------------- | --------------------------------------------------------------- |
| Framework                              | Next.js                                                         |
| Root directory                         | Repository root (`.`)                                           |
| Install command                        | `pnpm install --frozen-lockfile`                                |
| Build command                          | `pnpm build`                                                    |
| Output directory                       | Framework default                                               |
| Node.js                                | 24.x, supported by package.json; 22.x is also supported locally |
| `ENABLE_EXPERIMENTAL_COREPACK`         | `1`, to honor the pinned `pnpm@11.19.0`                         |
| `NEXT_PUBLIC_SUPABASE_URL`             | The intended Supabase Project URL                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That project's publishable key                                  |

`vercel.json` records the framework and commands. Set public Supabase values
for environments that should offer accounts. Use guest mode or a separate test
project for untrusted previews. Never set `NETLEARN_TEST_BUILD` on Vercel; it is
only for local browser fixtures.

Vercel chooses a supported Node major from package.json and updates its patch
releases. Corepack selects the pinned package manager. See
[Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
and [Corepack setup](https://vercel.com/docs/builds/configure-a-build#corepack).
No paid add-ons or custom domain are needed for the initial website.

Public Supabase settings are bundled at build time: rebuild/redeploy after
changing them. Once the HTTPS origin is known, set Supabase's Site URL to it
and verify the actual hosted account page. This typed-code flow does not use
an OAuth or magic-link callback route.

## Validate the release

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e --workers=2
pnpm test:accounts --workers=2
pnpm audit --prod
```

Both browser commands build their own `.next-test` app and use port 3100; run
them sequentially. They override live settings with guest/fixture values and
leave `.env.local` and the normal `.next` build intact. They do not verify a
real database or email provider. Run pgTAP against a disposable local Supabase
database as described in account setup too.

Before publication, verify hosted HTTPS pages, lesson completion and reload,
packet delivery/failure, subnets, saved playgrounds, keyboard access, mobile
layout, console errors, real sign-in, and account isolation. Record the commit,
deployment URL, migration result, and actual live checks. Recheck dependency
advisories at release time.

Connected Git pushes can create Vercel deployments automatically. Choose the
production branch deliberately and review that setting before future pushes.
For a failed frontend release, use the previous deployment rollback; do not
reset the database.

Google Fonts must be reachable during builds; visitors get self-hosted fonts.
No analytics service is configured. Guest progress/playgrounds stay in the
browser; account authentication and lesson completion use Supabase.

For a local preview: `pnpm build`, then
`pnpm start --hostname 127.0.0.1 --port 3000`. Do not start two servers on one port.
