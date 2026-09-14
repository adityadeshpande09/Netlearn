import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { lessons } from "../../src/content/lessons";

test("a learner can retry, complete all five lessons, and resume after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/learn");
  await expect(page.getByText("0 of 5 lessons completed")).toBeVisible();
  await page.getByRole("link", { name: "Begin the first lesson" }).click();
  for (const [index, lesson] of lessons.entries()) {
    await expect(page).toHaveURL("/learn/" + lesson.slug);
    if (index === 0) {
      await expect(
        page.getByRole("button", { name: "Check my answer" }),
      ).toBeDisabled();
      const wrong = lesson.quiz.options.find(
        (option) => option.id !== lesson.quiz.correctOptionId,
      )!;
      await page.getByRole("radio", { name: wrong.text, exact: true }).check();
      await page.getByRole("button", { name: "Check my answer" }).click();
      await expect(
        page.getByText("Not quite. Think it through once more."),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Mark lesson complete" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Give me a hint" }).click();
      await expect(page.locator("#quiz-hint")).toHaveText(lesson.quiz.hint);
    }
    const correct = lesson.quiz.options.find(
      (option) => option.id === lesson.quiz.correctOptionId,
    )!;
    await page.getByRole("radio", { name: correct.text, exact: true }).check();
    await page.getByRole("button", { name: "Check my answer" }).click();
    await expect(page.getByText("Exactly. You’ve got the idea.")).toBeVisible();
    await page.getByRole("button", { name: "Mark lesson complete" }).click();
    await expect(page.getByRole("status")).toHaveText("Lesson completed");
    await page
      .getByRole("link", {
        name:
          index === 4
            ? "Back to your learning path"
            : "Next: " + lessons[index + 1]!.title,
        exact: true,
      })
      .click();
  }
  await expect(page).toHaveURL("/learn");
  await page.reload();
  await expect(page.getByText("5 of 5 lessons completed")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Lessons completed" }),
  ).toHaveAttribute("value", "5");
  expect(errors).toEqual([]);
});

test("unavailable storage preserves progress while navigating within the tab", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/learn/network-basics");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await page.getByRole("link", { name: "Next: MAC vs IP" }).click();
  await page
    .locator(".lesson-sidebar")
    .getByRole("link", { name: "Learning path", exact: true })
    .click();
  await expect(page.getByText("1 of 5 lessons completed")).toBeVisible();
  await expect(
    page.getByText("Progress is kept in this tab only."),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await page
    .locator("header")
    .getByRole("link", { name: "Learning path", exact: true })
    .click();
  await expect(page.getByText("1 of 5 lessons completed")).toBeVisible();
});

test("malformed progress is preserved and storage updates sync between tabs", async ({
  page,
  context,
}) => {
  await page.goto("/learn");
  const other = await context.newPage();
  await other.goto("/learn");
  await other.evaluate(() =>
    localStorage.setItem(
      "netlearn.progress.v1",
      JSON.stringify({ version: 1, completed: ["routers"] }),
    ),
  );
  await expect(page.getByText("1 of 5 lessons completed")).toBeVisible();
  await other.evaluate(() =>
    localStorage.setItem("netlearn.progress.v1", "unreadable"),
  );
  await expect(
    page.getByText("Progress is kept in this tab only."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Begin the first lesson" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("netlearn.progress.v1")),
  ).toBe("unreadable");
});

test("mobile navigation supports keyboard close and does not duplicate desktop navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await nav.getByRole("link", { name: "Learning path" }).focus();
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(nav).toBeHidden();
});

test("reduced motion keeps the concept preview usable without playback movement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Send a packet" }).click();
  await expect(page.getByText("The data reaches the server.")).toBeVisible();
  await page.getByRole("button", { name: "Reset packet preview" }).click();
  await expect(page.getByText("A message leaves your device.")).toBeVisible();
});

for (const route of [
  "/learn",
  ...lessons.map((lesson) => "/learn/" + lesson.slug),
]) {
  test(
    route + " has accessible content on mobile and desktop",
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(route);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(audit.violations).toEqual([]);
      }
    },
  );
}

test("unknown lesson slugs return 404", async ({ page }) => {
  const response = await page.goto("/learn/not-a-lesson");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("link", { name: "Return to NetLearn" }),
  ).toBeVisible();
});

test("packet pause freezes an active hop and reset cancels playback", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Send a packet", exact: true })
    .click();
  await page.clock.runFor(800);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const particle = page.locator(".network-wires circle");
  // Motion batches SVG attribute rendering into the next animation frame.
  await page.clock.runFor(50);
  const pausedX = await particle.getAttribute("cx");
  await page.clock.runFor(1000);
  await expect(particle).toHaveAttribute("cx", pausedX!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.clock.runFor(6000);
  await expect(
    page.getByText("The data reaches the server.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send again", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset packet preview", exact: true })
    .click();
  await page.clock.runFor(6000);
  await expect(particle).toHaveAttribute("cx", "135");
  await expect(particle).toHaveAttribute("cy", "90");
  await expect(
    page.getByText("A message leaves your device.", { exact: true }),
  ).toBeVisible();
});
