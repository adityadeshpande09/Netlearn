import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
test("the account page is accessible and learning remains open without a backend", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A little further, every visit.",
    );
    await expect(
      page.getByRole("heading", { name: "Keep learning here." }),
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
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Go to your learning path" }).click();
  await expect(page.getByText("0 of 5 lessons completed")).toBeVisible();
  expect(errors).toEqual([]);
});
