import { expect, test } from "@playwright/test";

const destinations = [
  ["Learn", "/learn"],
  ["Troubleshooting Labs", "/labs/troubleshooting"],
  ["Packet Journey", "/labs/packet-journey"],
  ["Subnet Visualizer", "/tools/subnet"],
] as const;

test("desktop and mobile navigation emphasize the four learning tools", async ({
  page,
}) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width === 375)
      await page
        .getByRole("button", { name: "Open navigation" })
        .press("Enter");
    const nav = page.getByRole("navigation", {
      name: width === 375 ? "Mobile navigation" : "Main navigation",
      exact: true,
    });
    for (const [name, href] of destinations)
      await expect(
        nav.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", href);
    await expect(page.locator('a[href="/playground"]')).toHaveCount(0);
    await nav
      .getByRole("link", { name: "Troubleshooting Labs", exact: true })
      .press("Enter");
    await expect(page).toHaveURL("/labs/troubleshooting");
    if (width === 375) {
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toHaveAttribute("aria-expanded", "false");
      await page
        .getByRole("button", { name: "Open navigation" })
        .press("Enter");
    }
    await expect(
      nav.getByRole("link", { name: "Troubleshooting Labs", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("legacy playground links lead to labs without deleting saved browser networks", async ({
  page,
  request,
}) => {
  const response = await request.get("/playground", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/labs/troubleshooting");
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("netlearn.playgrounds.v1", "retained legacy data"),
  );
  await page.goto("/playground#host-terminal");
  await expect(page).toHaveURL(/\/labs\/troubleshooting(?:#.*)?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Find the fault. Follow the packet.",
  );
  await expect(
    page.getByRole("button", { name: "Add computer", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("netlearn.playgrounds.v1")),
  ).toBe("retained legacy data");
});

test("homepage and lesson practice links offer working learning routes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Try a troubleshooting lab", exact: true })
    .click();
  await expect(page).toHaveURL("/labs/troubleshooting");
  for (const slug of ["network-basics", "switches"]) {
    await page.goto(`/learn/${slug}`);
    await expect(page.locator('a[href="/playground"]')).toHaveCount(0);
    await page
      .getByRole("link", {
        name: "Follow devices and connections in Packet Journey →",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL("/labs/packet-journey");
  }
});
