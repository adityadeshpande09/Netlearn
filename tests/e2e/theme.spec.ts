import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("theme follows system initially, persists explicit choice and works by keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.focus();
  await toggle.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await toggle.click();
  await page.getByRole("link", { name: "Playground", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("dark pages have accessible contrast and fit mobile and enlarged text", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const path of [
    "/",
    "/learn/arp",
    "/playground",
    "/tools/subnet",
    "/labs/troubleshooting",
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
  });
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Dark mode", exact: true }),
    ).toBeVisible();
  }
});

test("theme remains usable when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
