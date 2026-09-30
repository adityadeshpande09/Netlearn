import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { lessons } from "../../src/content/lessons";
const backend = "http://127.0.0.1:54329";
const userA = "10000000-0000-4000-8000-000000000001";
const userB = "10000000-0000-4000-8000-000000000002";
async function mockAccounts(context: BrowserContext) {
  const state = {
    failWrites: false,
    failUser: false,
    writes: [] as { user_id: string; lesson_slug: string }[],
    rows: new Map<string, Set<string>>([
      [userA, new Set(["network-basics"])],
      [userB, new Set()],
    ]),
  };
  function user(id: string) {
    return {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: id === userA ? "learner-a@example.test" : "learner-b@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-09-01T00:00:00Z",
    };
  }
  await context.route(backend + "/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "http://127.0.0.1:3100",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") {
      await respond({});
      return;
    }
    if (url.pathname === "/auth/v1/otp") {
      await respond({});
      return;
    }
    if (url.pathname === "/auth/v1/verify") {
      const body = request.postDataJSON();
      if (body.token !== "12345678") {
        await respond({ error_code: "otp_expired", msg: "Invalid code" }, 403);
        return;
      }
      const id = body.email === "learner-b@example.test" ? userB : userA;
      // Deliberately invalid as a JWT: only intercepted browser responses accept this fixture.
      await respond({
        access_token: "fixture-access-" + id,
        refresh_token: "fixture-refresh-" + id,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: user(id),
      });
      return;
    }
    const id = request.headers().authorization?.includes(userB) ? userB : userA;
    if (url.pathname === "/auth/v1/user") {
      if (state.failUser) {
        await respond({ msg: "Temporarily unavailable" }, 503);
        return;
      }
      await respond(user(id));
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      await respond({});
      return;
    }
    if (url.pathname === "/rest/v1/lesson_completions") {
      if (request.method() === "GET") {
        expect(url.searchParams.get("user_id")).toBe("eq." + id);
        await respond(
          [...(state.rows.get(id) ?? [])].map((lesson_slug) => ({
            lesson_slug,
          })),
        );
        return;
      }
      if (state.failWrites) {
        await respond(
          { code: "test_unavailable", message: "Unavailable" },
          503,
        );
        return;
      }
      const rows: { user_id: string; lesson_slug: string }[] =
        request.postDataJSON();
      for (const row of rows) {
        expect(row.user_id).toBe(id);
        state.rows.get(id)?.add(row.lesson_slug);
        state.writes.push(row);
      }
      await respond({}, 201);
      return;
    }
    throw new Error("Unexpected fixture request: " + url.pathname);
  });
  return state;
}
async function signIn(page: Page, email = "learner-a@example.test") {
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(
    page.getByRole("textbox", { name: "One-time code" }),
  ).toBeFocused();
  await page.getByRole("textbox", { name: "One-time code" }).fill("12345678");
  await page.getByRole("button", { name: "Confirm and sign in" }).click();
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your learning, connected." }),
  ).toBeFocused();
}
test("sign-in imports guest progress only on request and sign-out restores the guest view", async ({
  page,
  context,
}) => {
  const state = await mockAccounts(context);
  await page.goto("/learn");
  await page.evaluate(() =>
    localStorage.setItem(
      "netlearn.progress.v1",
      JSON.stringify({ version: 1, completed: ["routers"] }),
    ),
  );
  await page.goto("/account");
  await signIn(page);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  expect(state.writes).toEqual([]);
  await page.getByRole("button", { name: "Import 1 browser lesson" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
  expect(state.writes).toEqual([{ user_id: userA, lesson_slug: "routers" }]);
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Email address" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your next lesson is waiting." }),
  ).toBeFocused();
  await page
    .getByRole("complementary", { name: "How progress works" })
    .getByRole("link", { name: "Explore the learning path" })
    .click();
  await expect(
    page.getByText(`1 of ${lessons.length} lessons completed`),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("netlearn.progress.v1") ?? "{}"),
    ),
  ).toEqual({ version: 1, completed: ["routers"] });
});
test("an account retains its earlier progress when completing the new ICMP lesson", async ({
  page,
  context,
}) => {
  const state = await mockAccounts(context);
  await page.goto("/account");
  await signIn(page);
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "8");
  await page.goto("/learn/icmp-ping");
  const quiz = lessons.find((lesson) => lesson.slug === "icmp-ping")!.quiz;
  const correct = quiz.options.find(
    (option) => option.id === quiz.correctOptionId,
  )!;
  await page.getByRole("radio", { name: correct.text, exact: true }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
  expect(state.writes).toEqual([{ user_id: userA, lesson_slug: "icmp-ping" }]);
  expect(state.rows.get(userA)).toEqual(
    new Set(["network-basics", "icmp-ping"]),
  );
  await page.goto("/learn");
  await page.reload();
  await expect(page.getByText("2 of 8 lessons completed")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("netlearn.progress.v1")),
  ).toBeNull();
});
test("switching accounts does not carry over the previous learner's completion", async ({
  page,
  context,
}) => {
  const state = await mockAccounts(context);
  await page.goto("/account");
  await signIn(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn(page, "learner-b@example.test");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(state.writes).toEqual([]);
});
test("failed account saves remain visible and can be retried without affecting guest data", async ({
  page,
  context,
}) => {
  const state = await mockAccounts(context);
  await page.goto("/account");
  await signIn(page);
  state.failWrites = true;
  await page.goto("/learn/mac-vs-ip");
  const quiz = lessons.find((lesson) => lesson.slug === "mac-vs-ip")!.quiz;
  const correct = quiz.options.find(
    (option) => option.id === quiz.correctOptionId,
  )!;
  await page.getByRole("radio", { name: correct.text, exact: true }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(
    page.getByText("Sync paused. Unsaved progress is kept in this tab only."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("netlearn.progress.v1")),
  ).toBeNull();
  state.failWrites = false;
  await page.getByRole("button", { name: "Retry sync" }).click();
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
  expect(state.rows.get(userA)?.has("mac-vs-ip")).toBe(true);
});
test("invalid codes have recoverable feedback and account screens fit the planned widths", async ({
  page,
  context,
}) => {
  await mockAccounts(context);
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/account");
    await expect(
      page.getByRole("textbox", { name: "Email address" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("learner-a@example.test");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByRole("textbox", { name: "One-time code" }).fill("00000000");
  await page.getByRole("button", { name: "Confirm and sign in" }).click();
  await expect(page.locator(".account-error")).not.toBeEmpty();
  await page.getByRole("textbox", { name: "One-time code" }).fill("12345678");
  await page.getByRole("button", { name: "Confirm and sign in" }).click();
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a lesson explains failed identity checks and offers recovery before saving", async ({
  page,
  context,
}) => {
  const state = await mockAccounts(context);
  await page.goto("/account");
  await signIn(page);
  state.failUser = true;
  await page.goto("/learn/mac-vs-ip");
  const { lessons } = await import("../../src/content/lessons");
  const quiz = lessons.find((lesson) => lesson.slug === "mac-vs-ip")!.quiz;
  const correct = quiz.options.find(
    (option) => option.id === quiz.correctOptionId,
  )!;
  await page.getByRole("radio", { name: correct.text, exact: true }).check();
  await expect(
    page.getByText(
      "Could not check your sign-in. Retry before saving progress.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeDisabled();
  state.failUser = false;
  await page.getByRole("button", { name: "Retry sync" }).click();
  await expect(
    page.getByRole("button", { name: "Check my answer" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(
    page.getByText("Progress synced to your account."),
  ).toBeVisible();
});
