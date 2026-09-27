import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const feedback = (page: Page) => page.locator(".guided-feedback");
const timeline = (page: Page) => page.locator(".simulation-timeline button");

test("keyboard repair attempts use the original fault and reset clears the exercise", async ({
  page,
}) => {
  await page.goto("/labs/troubleshooting");
  await expect(
    page.getByRole("heading", { name: "Original network trace" }),
  ).toBeVisible();
  await expect(page.locator(".guided-original")).toContainText(
    "No default gateway",
  );

  const hint = page.getByText("Hint 1: where to look", { exact: true });
  await hint.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Hint 2: narrow it down", { exact: true }),
  ).toBeVisible();

  const localGateway = page.getByRole("radio", {
    name: "Set PC-A’s gateway to 192.168.1.1",
    exact: true,
  });
  await localGateway.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("radio", {
      name: "Set PC-A’s gateway to 10.0.0.1",
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Test repair", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(feedback(page)).toContainText(
    "Attempt 1: delivery still stopped",
  );

  await localGateway.focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Test repair", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(feedback(page)).toContainText("Attempt 2: packet delivered");
  await timeline(page).last().click();
  await expect(page.locator(".event-explanation .eyebrow")).toHaveText(
    "DELIVERED",
  );
  await expect(page.locator(".guided-original")).toContainText(
    "No default gateway",
  );

  await page.getByLabel("Trace to inspect").selectOption("original");
  await expect(
    page.getByRole("heading", { name: "Original network trace" }),
  ).toBeVisible();
  await timeline(page).last().click();
  await expect(page.locator(".event-explanation .eyebrow")).toHaveText(
    "DELIVERY STOPPED",
  );
  await expect(feedback(page)).toContainText("Attempt 2: packet delivered");
  await expect(localGateway).toBeChecked();
  await page.getByLabel("Trace to inspect").selectOption("repair");
  await timeline(page).last().click();
  await expect(page.locator(".event-explanation .eyebrow")).toHaveText(
    "DELIVERED",
  );

  await page
    .getByRole("radio", { name: "Raise the starting TTL to 128" })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText(
    "Attempt 3: delivery still stopped",
  );
  await expect(feedback(page)).toContainText("No default gateway");

  await page
    .getByRole("button", { name: "Reset exercise", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(feedback(page)).toContainText("Exercise reset");
  await expect(
    page.getByRole("heading", { name: "Original network trace" }),
  ).toBeVisible();
  await expect(page.locator('input[name="repair"]:checked')).toHaveCount(0);
  await expect(
    page.getByText("Hint 2: narrow it down", { exact: true }),
  ).toBeHidden();
});

test("reconnecting the router changes unanswered ARP into a delivered trace", async ({
  page,
}) => {
  await page.goto("/labs/troubleshooting");
  await page.getByLabel("Choose an exercise").selectOption("link");
  await timeline(page)
    .filter({ hasText: "Ask for the next hop’s MAC address" })
    .first()
    .click();
  await expect(
    page.locator('.arp-layer [data-field="Target IP"] .packet-field-value'),
  ).toHaveText("192.168.1.1");
  await timeline(page).last().click();
  await expect(page.locator(".event-explanation .eyebrow")).toHaveText(
    "DELIVERY STOPPED",
  );

  await page
    .getByRole("radio", { name: "Raise the starting TTL to 128" })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText("delivery still stopped");
  await page
    .getByRole("radio", { name: "Reconnect Switch A Port 2 to Router R1 G0/0" })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText("Attempt 2: packet delivered");
  await expect(
    timeline(page).filter({ hasText: "Router R1 answers ARP" }),
  ).toHaveCount(1);
});

test("the TTL exercise exposes expired headers and reruns with TTL 2", async ({
  page,
}) => {
  await page.goto("/labs/troubleshooting");
  await page.getByLabel("Choose an exercise").selectOption("ttl");
  await timeline(page).filter({ hasText: "Decrement TTL" }).click();
  await expect(
    page.locator('.ip-layer [data-field="TTL"] .packet-field-value'),
  ).toHaveText("0");
  await page
    .getByRole("radio", { name: "Change PC-A’s prefix from /24 to /16" })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText("delivery still stopped");
  await page
    .getByRole("radio", { name: "Raise the starting TTL to 2", exact: true })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText("Attempt 2: packet delivered");
  await timeline(page).filter({ hasText: "Decrement TTL" }).click();
  await expect(
    page.locator('.ip-layer [data-field="TTL"] .packet-field-value'),
  ).toHaveText("1");

  await page.getByLabel("Choose an exercise").selectOption("gateway");
  await expect(feedback(page)).not.toContainText("Attempt");
  await expect(page.locator('input[name="repair"]:checked')).toHaveCount(0);
  await page.getByLabel("Choose an exercise").selectOption("ttl");
  await expect(
    page.getByRole("heading", { name: "Original network trace" }),
  ).toBeVisible();
});

test("guided controls and expanded hints are accessible at narrow widths and enlarged text", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto("/labs/troubleshooting");
  await page.getByLabel("Choose an exercise").selectOption("link");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByText("Hint 1: where to look", { exact: true }).click();
  await page.getByText("Hint 2: narrow it down", { exact: true }).click();
  await page
    .getByRole("radio", { name: "Reconnect Switch A Port 2 to Router R1 G0/0" })
    .check();
  await page.getByRole("button", { name: "Test repair", exact: true }).click();
  await expect(feedback(page)).toContainText("packet delivered");

  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    audit.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);

  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Layout at ${width}px`,
    ).toBe(true);
  }
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Enlarged text at ${width}px`,
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Test repair", exact: true }),
    ).toBeVisible();
  }
});
