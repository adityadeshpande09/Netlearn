import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("packet journey exposes routing, changing headers, and meaningful failure scenarios", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/labs/packet-journey");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByRole("button", { name: "Next simulation step" }).click();
  await expect(page.locator(".event-explanation h2")).toHaveText(
    "Use the default gateway",
  );
  await page.getByRole("button", { name: "Previous simulation step" }).click();
  await expect(page.locator(".event-explanation h2")).toContainText(
    "checks the destination",
  );
  await page
    .locator(".simulation-timeline button")
    .filter({ hasText: "Create a new Ethernet frame" })
    .click();
  await expect(page.locator(".packet-inspector")).toContainText(
    "02:00:00:00:03:02",
  );
  await expect(page.locator(".packet-inspector")).toContainText("Changed");
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation h2")).toHaveText(
    "Packet delivered to PC-B",
  );
  await expect(
    page.locator(
      '.packet-inspector .ip-layer [data-field="TTL"] .packet-field-value',
    ),
  ).toHaveText("63");
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await expect(
    page.getByRole("table", { name: "Routing table" }),
  ).toContainText("192.168.1.0/24");
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(page.locator(".simulation-step-count")).toContainText(
    "Step 1 /",
  );
  await page.getByLabel("Try a scenario").selectOption("gateway");
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation")).toContainText(
    "No default gateway",
  );
  await page.getByLabel("Try a scenario").selectOption("ttl");
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation")).toContainText(
    "TTL has reached zero",
  );
  expect(errors).toEqual([]);
});
test("playback pauses, steps, resets, and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/labs/packet-journey");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByLabel("Speed", { exact: true }).selectOption("800");
  await page.getByRole("button", { name: "Send packet", exact: true }).click();
  await page.clock.runFor(1700);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const step = await page.locator(".simulation-step-count").textContent();
  await page.clock.runFor(4000);
  await expect(page.locator(".simulation-step-count")).toHaveText(step!);
  expect(await page.locator(".topology-packet").count()).toBe(0);
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(page.locator(".simulation-step-count")).toContainText(
    "Step 1 /",
  );
});
test("subnet arithmetic, validation, binary boundary, splitting, and special prefixes work", async ({
  page,
}) => {
  await page.goto("/tools/subnet");
  const input = page.getByLabel("IPv4 address / prefix", { exact: true });
  await input.fill("192.168.10.37/26");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator("#subnet-result-heading")).toHaveText(
    "192.168.10.0/26",
  );
  await expect(page.locator(".subnet-facts")).toContainText("192.168.10.63");
  await expect(page.locator(".binary-octets .network-bit")).toHaveCount(26);
  await page.getByLabel("Child subnet prefix").selectOption("28");
  await expect(page.locator(".subnet-blocks button")).toHaveCount(4);
  await page
    .getByRole("button", {
      name: "Inspect 192.168.10.32/28, contains entered address",
    })
    .click();
  await expect(page.locator("#subnet-result-heading")).toHaveText(
    "192.168.10.32/28",
  );
  for (const prefix of [31, 32]) {
    await input.fill("203.0.113.7/" + prefix);
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await expect(page.locator(".subnet-facts")).toContainText("Not applicable");
  }
  await input.fill("300.1.1.1/24");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#subnet-error")).toBeVisible();
  await expect(page.locator(".subnet-result")).toHaveCount(0);
});
test("playground edits cables and gateways and recalculates the journey", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/playground");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByLabel("Connected cable").selectOption("link-a");
  await page.getByRole("button", { name: "Remove cable", exact: true }).click();
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation")).toContainText(
    "No device answers ARP",
  );
  await page.getByLabel("First port").selectOption("pc-a:p1");
  await page.getByLabel("Second port").selectOption("switch-a:p1");
  await page.getByRole("button", { name: "Connect ports" }).click();
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation h2")).toHaveText(
    "Packet delivered to PC-B",
  );
  await page.getByLabel("Inspect a device").selectOption("pc-a");
  await page.getByLabel("Default gateway", { exact: true }).fill("");
  await page.getByRole("button", { name: "Apply configuration" }).click();
  await expect(page.locator(".simulation-step-count")).toContainText(
    "Step 1 /",
  );
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation")).toContainText(
    "No default gateway",
  );
  expect(errors).toEqual([]);
});
test("a network can be built using the keyboard-accessible forms", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByLabel("Start with").selectOption("blank");
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  await page.getByRole("button", { name: "Add switch", exact: true }).click();
  await page.getByLabel("First port").selectOption({ label: "PC 6 · eth0" });
  await page
    .getByLabel("Second port")
    .selectOption({ label: "Switch 8 · Port 1" });
  await page.getByRole("button", { name: "Connect ports" }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("First port").selectOption({ label: "PC 7 · eth0" });
  await page
    .getByLabel("Second port")
    .selectOption({ label: "Switch 8 · Port 2" });
  await page.getByRole("button", { name: "Connect ports" }).focus();
  await page.keyboard.press("Enter");
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation h2")).toHaveText(
    "Packet delivered to PC 7",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
});
for (const route of ["/labs/packet-journey", "/tools/subnet", "/playground"]) {
  test(
    route +
      " is accessible and fits mobile, tablet, desktop, and enlarged text",
    async ({ page }) => {
      test.setTimeout(60000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [375, 768, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(route);
        if (route !== "/tools/subnet")
          await expect(page.locator(".react-flow__node")).toHaveCount(5);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (width === 375 || width === 1280) {
          const audit = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(
            audit.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                reason: n.failureSummary,
              })),
            })),
          ).toEqual([]);
        }
      }
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      const layout = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter(
            (e) =>
              e.getBoundingClientRect().right > innerWidth &&
              !e.closest(".react-flow"),
          )
          .slice(0, 12)
          .map((e) => ({
            tag: e.tagName,
            class: e.className,
            right: e.getBoundingClientRect().right,
          })),
      }));
      expect(layout.fits, JSON.stringify(layout.offenders)).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    },
  );
}

test("configuration saves preserve keyboard focus and route edits preserve drafts", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByLabel("Device name", { exact: true }).fill("My computer");
  const apply = page.getByRole("button", {
    name: "Apply configuration",
    exact: true,
  });
  await apply.focus();
  await page.keyboard.press("Enter");
  await expect(apply).toBeFocused();
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await page
    .getByLabel("Device name", { exact: true })
    .fill("Draft router name");
  await page.getByText("Static routes (optional)", { exact: true }).click();
  await page.getByLabel("Destination network / prefix").fill("172.16.0.0/24");
  await page.getByLabel("Next-hop IPv4 address").fill("10.0.0.2");
  await page.getByLabel("Outgoing interface").selectOption("p2");
  const add = page.getByRole("button", {
    name: "Add static route",
    exact: true,
  });
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(add).toBeFocused();
  await expect(page.locator(".route-editor")).toHaveAttribute("open", "");
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "Draft router name",
  );
  await page
    .getByRole("button", { name: "Remove route 172.16.0.0/24", exact: true })
    .click();
  await expect(add).toBeFocused();
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "Draft router name",
  );
  await page.getByLabel("Connected cable").selectOption("link-a");
  const remove = page.getByRole("button", {
    name: "Remove cable",
    exact: true,
  });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(remove).toBeFocused();
  await page.getByLabel("First port").selectOption("pc-a:p1");
  await page.getByLabel("Second port").selectOption("switch-a:p1");
  const connect = page.getByRole("button", {
    name: "Connect ports",
    exact: true,
  });
  await connect.focus();
  await page.keyboard.press("Enter");
  await expect(connect).toBeFocused();
  await expect(page.getByLabel("First port")).toHaveValue("");
});
