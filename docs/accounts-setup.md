# Accounts and synced lesson progress

NetLearn uses Supabase email codes for sign-in and stores each completed lesson
once per account. Guest progress and saved playgrounds stay in the current
browser. Signing in does not automatically import guest progress; the learner
chooses whether to add it to the account.

## Project configuration

Create a Supabase project you control. From its Connect dialog, copy the project
URL and publishable key into the application's ignored `.env.local` file:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

These are the only Supabase environment variables the application needs. Both
values are intentionally available to the browser; database access is controlled
by the user's session, table grants, and row policies. Never place a secret key,
service-role key, database password, or SMTP password in these variables or in
Git. Configure the same two values in the deployment environment, then rebuild
the app. Restart the local development server after changing them.

The application uses separate browser/server cookie clients and a Next.js proxy
for session refresh. Server authorization verifies the session with
`getClaims()`; merely finding a cookie or a `getSession()` result is not an
authorization check. Keep responses that set session cookies out of shared
caches. [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)

## Email code sign-in

Enable the Email provider and allow new users to sign up. NetLearn requests a
code with `signInWithOtp({ email })` and verifies it with
`verifyOtp({ email, token, type: "email" })`. A successful code request is not yet
a signed-in session.

In Authentication email templates, replace the Magic Link template's link with
a visible `{{ .Token }}` value, for example:

```html
<h2>Your NetLearn sign-in code</h2>
<p>Enter this code in NetLearn:</p>
<p><strong>{{ .Token }}</strong></p>
<p>If you did not request this code, you can ignore this email.</p>
```

Keep the subject simple, such as "Your NetLearn sign-in code". Check both a new
email address and an existing account; any confirmation template used by the
project must also deliver the code. Keep email verification enabled. Use a numeric code length from 6 to 10 digits, and review the project's
expiry and resend limits. The sign-in flow expects the learner to enter the code
in the app, not follow a callback link. [Supabase email OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless)

In Authentication URL Configuration, set Site URL to the actual deployed HTTPS
origin when available. For local-only development, use
`http://127.0.0.1:3000`. The typed-code flow does not need an OAuth callback or
magic-link redirect route. If a future email flow adds redirects, allow only its
actual local and deployed destinations; use exact production paths. [Supabase URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)

Configure a custom SMTP provider in the Supabase dashboard before opening sign-in
to public users. The default sender is intended for testing with authorized team
addresses and has restrictive limits. Enter SMTP credentials only in the
provider/Supabase configuration, configure the sender domain with the provider,
and test delivery and resend behavior before release. [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp)

## Apply the schema

The schema lives in
`supabase/migrations/202609150001_lesson_completions.sql`. It creates:

- One row per account and lesson, with a database timestamp.
- A foreign key that removes completion rows when the corresponding Auth user
  is removed.
- A constraint accepting only the five current lesson slugs.
- Authenticated select/insert grants with owner-only row policies.
- No anonymous access and no client update/delete grants.

The client writes with `upsert` using
`onConflict: "user_id,lesson_slug"` and `ignoreDuplicates: true`. This translates
to an insert that ignores existing rows; it does not replace progress or need
update permission. A normal upsert that updates conflicts is intentionally
unsupported. Adding a lesson requires a new migration extending the slug
constraint as well as a content update.

Review the migration and apply it to the intended project once, using the
project's SQL Editor or an established Supabase migration workflow. The migration
deliberately fails if the table already exists so an unrelated table is not
silently reused. Keep table grants and RLS enabled together. A filter in the
browser is not an access boundary. [Supabase row security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)

`src/lib/supabase/database.types.ts` mirrors this migration and adds an insert
slug type from the curriculum. It is not a claim that database introspection
already ran. After schema changes, generate and review types from the actual
database; preserve the application's slug validation and append-only contract.
[Supabase TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types)

## Run database tests locally

The pgTAP suite in `supabase/tests/lesson_completions.test.sql` uses two synthetic
accounts and an anonymous role. Its 28 assertions cover ownership, invalid
slugs, idempotent inserts, denied reads/writes, missing user claims, preserved
timestamps, and account deletion. It runs inside a transaction and rolls its
fixtures back.

Install the Supabase CLI and Docker using their supported setup instructions.
In a disposable local checkout, initialize the local Supabase configuration if
`supabase/config.toml` is absent, start its stack, and apply migrations:

```text
supabase init
supabase start
supabase migration up --local
supabase test db supabase/tests/lesson_completions.test.sql
```

Skip `supabase init` when configuration already exists. These commands are for
the local test database; do not substitute a production database reset. The CLI
test command requires the running local stack and pgTAP. [Supabase database tests](https://supabase.com/docs/guides/database/testing), [CLI test command](https://supabase.com/docs/reference/cli/supabase-test-db)

**Implementation-time limitation:** Supabase CLI, Docker, and PostgreSQL client
tools were unavailable in the development environment, so this SQL suite has
not been executed there. No remote migration, email delivery, or real account
test has been performed as part of writing these files.

## Check the connected app before release

1. Complete a lesson as a guest. Sign into account A and confirm guest progress
   is offered for explicit import rather than added automatically. Import it,
   reload, and confirm the account retains it.
2. Sign into account A in another browser/device. Complete a different lesson.
   Return to the first device, focus the page or retry sync, and confirm both
   completions appear.
3. Sign out, then sign into account B on the first device. Confirm account A's
   completions do not appear or upload to B. A request under B's session must
   neither read A's rows nor insert a row owned by A; run the SQL suite too.
4. Disconnect the network and complete a lesson while signed in. Confirm it is
   marked as waiting to sync. Reconnect and retry without closing the tab, then
   confirm the server saves it. Pending account work is held in the current tab
   until saved; reloading, closing it, or switching accounts can discard it.
5. Verify wrong/expired codes, resend limits, new account confirmation, session
   refresh, sign-out, and the unavailable-backend state without hiding errors.
   Confirm guest lessons and local playground saves still work.
6. Repeat the account form with a keyboard, at a narrow viewport, and with
   enlarged text. Confirm labels, focus, error feedback, and sync status remain
   understandable.

Record the actual migration target, SQL test results, and browser/device results
in the release review. Application unit tests or mocked network responses do not
establish that the remote project's row policies or email configuration work.

## Browser integration tests with a simulated service

The normal browser suite expects an unconfigured guest build. The separate account suite uses the real Supabase browser client with intercepted test responses, synthetic emails, and deliberately invalid fixture tokens. It makes no requests to a real project and does not establish email delivery, token verification, or RLS correctness. Keep preview servers stopped while rebuilding. In PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_browser_fixture"
pnpm build
pnpm exec playwright test --config playwright.accounts.config.ts --workers=2
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL, Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm build
pnpm test:e2e --workers=2
```

Use a checkout without real .env.local settings for this guest test run. The final build restores normal configuration after the fixture test. The account suite covers explicit import, account switching, failed saves/retry, code errors, focus, and accessible responsive layouts.
