import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function save(page: Page, name: string) {
  await page.getByLabel("Snapshot name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.locator(".library-status")).toContainText(
    `Saved “${name}”`,
  );
}
async function open(page: Page, name: string) {
  await page
    .getByLabel("Saved network", { exact: true })
    .selectOption({ label: name });
  await page.getByRole("button", { name: "Open network", exact: true }).click();
  await page
    .getByRole("button", { name: "Open snapshot", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("saved networks restore configuration, routes, cables, positions and packet settings after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/playground");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await page.getByLabel("Device name", { exact: true }).fill("Student PC");
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Apply configuration", exact: true })
    .click();
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await page.getByText("Static routes (optional)", { exact: true }).click();
  await page.getByLabel("Destination network / prefix").fill("172.16.0.0/24");
  await page.getByLabel("Next-hop IPv4 address").fill("10.0.0.2");
  await page.getByLabel("Outgoing interface").selectOption("p2");
  await page
    .getByRole("button", { name: "Add static route", exact: true })
    .click();
  await page.getByLabel("Initial TTL", { exact: true }).fill("1");
  await page
    .getByRole("combobox", { name: "Source computer", exact: true })
    .selectOption("pc-b");
  await page
    .getByRole("combobox", { name: "Destination computer", exact: true })
    .selectOption("pc-a");
  const node = page.locator('.react-flow__node[data-id="pc-a"]');
  await node.scrollIntoViewIfNeeded();
  const originalPosition = await node.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  const box = await node.boundingBox();
  if (!box) throw new Error("Missing draggable computer");
  await page.mouse.move(box.x + 70, box.y + 25);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 90, { steps: 10 });
  await page.mouse.up();
  await expect(node).not.toHaveCSS("transform", originalPosition);
  const position = await node.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await save(page, "Routing experiment");
  await page.reload();
  await open(page, "Routing experiment");
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await expect(node).toHaveCSS("transform", position);
  await expect(page.getByLabel("Initial TTL", { exact: true })).toHaveValue(
    "1",
  );
  await expect(
    page.getByRole("combobox", { name: "Source computer", exact: true }),
  ).toHaveValue("pc-b");
  await expect(
    page.getByRole("combobox", { name: "Destination computer", exact: true }),
  ).toHaveValue("pc-a");
  await page.getByLabel("Inspect a device").selectOption("pc-a");
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "Student PC",
  );
  await expect(page.locator(".react-flow__edge")).toHaveCount(4);
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await page.getByText("Static routes (optional)", { exact: true }).click();
  await expect(page.locator(".route-editor")).toContainText("172.16.0.0/24");
  await page.locator(".simulation-timeline button").last().click();
  await expect(page.locator(".event-explanation")).toContainText(
    "TTL has reached zero",
  );
  expect(errors).toEqual([]);
});

test("loading protects edits, resets playback and allows collision-free new devices and cables", async ({
  page,
}) => {
  await page.goto("/playground");
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  await save(page, "Six devices");
  await page.reload();
  await open(page, "Six devices");
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "PC 7",
  );
  await page.getByLabel("First port").selectOption("host-6:p1");
  await page.getByLabel("Second port").selectOption("host-7:p1");
  await page
    .getByRole("button", { name: "Connect ports", exact: true })
    .click();
  await save(page, "Seven devices");
  await page.getByLabel("Device name", { exact: true }).fill("Unapplied name");
  await page
    .getByLabel("Saved network", { exact: true })
    .selectOption({ label: "Six devices" });
  await page.getByRole("button", { name: "Open network", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "Unapplied name",
  );
  await expect(
    page.getByRole("button", { name: "Open network", exact: true }),
  ).toBeFocused();
  await open(page, "Seven devices");
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  await expect(page.locator(".react-flow__edge")).toHaveCount(5);
  await page.locator(".simulation-timeline button").last().click();
  await open(page, "Seven devices");
  await expect(page.locator(".simulation-step-count")).toContainText(
    "Step 1 /",
  );
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".simulation-errors")).toHaveCount(0);
});

test("deleting a snapshot keeps the canvas and duplicate names do not overwrite it", async ({
  page,
}) => {
  await page.goto("/playground");
  await save(page, "My network");
  await page.getByLabel("Snapshot name", { exact: true }).fill(" my NETWORK ");
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.locator(".playground-library [role=alert]")).toBeVisible();
  await expect(
    page.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete snapshot", exact: true })
    .click();
  await expect(page.locator(".library-status")).toContainText(
    "Deleted “My network”",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(5);
  await expect(page.getByLabel("Snapshot name", { exact: true })).toBeFocused();
  await page.reload();
  await expect(
    page.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(1);
});

test("saved lists update across tabs without replacing an open network", async ({
  page,
  context,
}) => {
  await page.goto("/playground");
  const other = await context.newPage();
  await other.goto("/playground");
  await other
    .getByRole("button", { name: "Add computer", exact: true })
    .click();
  await save(page, "From another tab");
  await expect(
    other.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await expect(other.locator(".react-flow__node")).toHaveCount(6);
  await save(other, "My own work");
  await expect(
    page.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(3);
  await page
    .getByLabel("Saved network", { exact: true })
    .selectOption({ label: "From another tab" });
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete snapshot", exact: true })
    .click();
  await expect(
    other.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await expect(other.locator(".react-flow__node")).toHaveCount(6);
});

test("unreadable saved data stays intact while the network remains usable", async ({
  page,
}) => {
  const future = '{"version":2,"workspaces":[]}';
  await page.addInitScript(
    (raw) => localStorage.setItem("netlearn.playgrounds.v1", raw),
    future,
  );
  await page.goto("/playground");
  await expect(page.locator(".playground-library [role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("netlearn.playgrounds.v1")),
  ).toBe(future);
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
});

test("storage write failure leaves the network usable without a false saved message", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "netlearn.playgrounds.v1")
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/playground");
  await page.getByLabel("Snapshot name", { exact: true }).fill("Cannot save");
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.locator(".playground-library [role=alert]")).toBeVisible();
  await expect(page.locator(".library-status")).toBeEmpty();
  await expect(
    page.getByLabel("Saved network", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Add computer", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
});

test("saved networks and confirmation dialogs are accessible on mobile with long names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/playground");
  await save(page, "An experimental routed network with several computers");
  await page.getByRole("button", { name: "Open network", exact: true }).click();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open network", exact: true }),
  ).toBeFocused();
});

test("reselecting a device preserves draft protection and route drafts can be cleared", async ({
  page,
}) => {
  await page.goto("/playground");
  await page
    .getByLabel("Device name", { exact: true })
    .fill("Unapplied PC name");
  await page.locator('.react-flow__node[data-id="pc-a"]').click();
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Device name", { exact: true })).toHaveValue(
    "Unapplied PC name",
  );
  await page
    .getByRole("button", { name: "Apply configuration", exact: true })
    .click();
  await page.getByLabel("Inspect a device").selectOption("router-r1");
  await page.getByText("Static routes (optional)", { exact: true }).click();
  await page
    .getByLabel("Destination network / prefix")
    .fill("An unfinished route");
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Clear route draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save network", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Destination network / prefix")).toHaveValue("");
});
