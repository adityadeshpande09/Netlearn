import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home renders with accessible content at the planned viewport widths", async ({
  page,
}) => {
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("NetLearn — See networking happen");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test("keyboard users can skip to content with reduced motion enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("unknown routes return 404 and allow keyboard recovery", async ({
  page,
}) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  const recovery = page.getByRole("link", { name: "Return to NetLearn" });
  await recovery.focus();
  await recovery.press("Enter");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "See networking happen.",
  );
});

test("home and learning pages remain usable with 200 percent text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/",
    "/learn",
    "/learn/network-basics",
    "/learn/mac-vs-ip",
    "/learn/switches",
    "/learn/routers",
    "/learn/packet-travel",
  ]) {
    await page.goto(route);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(layout.width, route).toBeLessThanOrEqual(layout.viewport);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("guided labs are discoverable from navigation and the simulation guide works by keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "Guided labs", exact: true })
    .press("Enter");
  await expect(page).toHaveURL("/labs/troubleshooting");
  const guide = page.locator(".simulation-guide");
  await guide.locator("summary").press("Enter");
  await expect(
    guide.getByText("Follow the packet.", { exact: true }),
  ).toBeVisible();
  await guide.locator("summary").press("Enter");
  await expect(
    guide.getByText("Follow the packet.", { exact: true }),
  ).toBeHidden();
});
