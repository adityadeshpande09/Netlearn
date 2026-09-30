import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/playground", "/labs/packet-journey"]) {
  test(`${path} explains actual routes and isolated overlapping examples`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.getByLabel("Inspect a device").selectOption("router-r1");
    const panel = page.getByRole("region", {
      name: "Route selection",
      exact: true,
    });
    const input = panel.getByLabel("Lookup destination IPv4");
    const status = panel.getByRole("status");
    await expect(input).toHaveValue("10.0.0.20");
    await expect(status).toContainText("Selected 10.0.0.0/24");
    await input.fill("203.0.113.7");
    await expect(status).toContainText("No matching route");
    await input.fill("not-an-ip");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(status).toContainText("Enter a valid IPv4");
    await panel
      .getByRole("button", { name: "Try overlapping routes" })
      .press("Enter");
    await expect(panel).toContainText(
      "Example table only. Your network is unchanged.",
    );
    await expect(status).toContainText("Selected 10.20.30.0/24");
    await expect(
      panel.getByRole("row").filter({ hasText: "10.20.0.0/16" }),
    ).toContainText("Matches; shorter prefix");
    await panel
      .getByText("Compare the selected prefix in binary", { exact: true })
      .click();
    await expect(panel.locator("details strong").first()).toHaveText(
      "000010100001010000011110",
    );
    await panel
      .getByRole("button", { name: "10.20.40.42", exact: true })
      .click();
    await expect(status).toContainText("Selected 10.20.0.0/16");
    await panel
      .getByRole("button", { name: "203.0.113.7", exact: true })
      .click();
    await expect(status).toContainText("Selected 0.0.0.0/0");
    await panel
      .getByRole("button", { name: "Use this router's routes" })
      .click();
    await expect(status).toContainText("Selected 10.0.0.0/24");
    await expect(
      panel.getByRole("row").filter({ hasText: "10.20.0.0/16" }),
    ).toHaveCount(0);
    await page.locator(".simulation-timeline button").last().click();
    await expect(page.locator(".event-explanation")).toContainText(
      "Packet delivered",
    );
  });
}

test("route comparison is accessible in both themes and fits enlarged mobile layouts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/playground");
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await page.getByRole("button", { name: "Try overlapping routes" }).click();
  await page
    .getByText("Compare the selected prefix in binary", { exact: true })
    .click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Dark mode", exact: true })
        .click();
    const result = await new AxeBuilder({ page })
      .include(".device-inspector")
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
    await expect(page.getByLabel("Lookup destination IPv4")).toBeVisible();
  }
});
