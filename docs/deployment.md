# Deployment preparation

The intended target is Vercel using its standard [Next.js integration](https://vercel.com/docs/frameworks/full-stack/nextjs). Source is maintained in the public [Netlearn repository](https://github.com/adityadeshpande09/Netlearn). No website deployment has been created. A successful local production build verifies the app build, not a hosted environment.

## Before publishing

1. Review the implementation and dated validation report, then obtain the owner's explicit commit approval. A local Git commit does not require GitHub access.
2. Obtain separate permission and the destination before creating a remote or pushing source. Never invent Git identity or remote settings.
3. Recheck current framework/security advisories and compatible dependency updates. Preserve the lockfile and pinned package manager.
4. Run formatting, lint, types, unit tests, production build, and the browser suite. Browser tests require Chromium and free port 3100.
5. After the owner separately authorizes deployment, import the approved repository into Vercel with the Next.js preset. Use the app directory as root, pnpm install --frozen-lockfile, and pnpm build. Use a supported Node version satisfying package.json and the pinned pnpm version. Guest mode requires no environment variables. For accounts, configure the two public Supabase values and complete [account setup and live checks](accounts-setup.md) before enabling sign-in.
6. Inspect the preview deployment: open every route, complete a lesson, reload progress, simulate delivery/failure, calculate subnets, and edit cables. Confirm browser errors, HTTPS, keyboard access, and mobile layout before production promotion.

Google Fonts access is needed during the build for next/font. Fonts are then served locally to visitors. When accounts are configured, email authentication and account lesson completions are sent to the chosen Supabase project. Guest progress and saved playgrounds remain in the browser. No analytics service is configured. Before public release, review the account data handling, email delivery, and database access policies described in accounts-setup.md.

For a local production preview, run pnpm build and then pnpm start --hostname 127.0.0.1 --port 3000. Development mode uses pnpm dev. Do not run two servers on the same port.
