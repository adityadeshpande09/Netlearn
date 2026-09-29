import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("host terminal shows engine state, traces hops, isolates hosts and resets after network edits", async ({
  page,
}) => {
  await page.goto("/playground");
  const terminal = page.getByRole("region", {
    name: "Host terminal",
    exact: true,
  });
  async function command(value: string, host = "PC-A") {
    const input = terminal.getByRole("textbox", {
      name: `Command for ${host}`,
    });
    await input.fill(value);
    await input.press("Enter");
  }
  await command("ip addr");
  const output = terminal.getByRole("region", {
    name: "PC-A terminal output",
    exact: true,
  });
  await expect(output).toContainText("192.168.1.10/24");
  await command("traceroute 10.0.0.20");
  await expect(output).toContainText("1  192.168.1.1  Router R1");
  await expect(output).toContainText("2  10.0.0.20  destination reached");
  await command("ip neigh");
  await expect(output).toContainText("192.168.1.1 dev eth0 lladdr");
  await terminal.getByLabel("Terminal host").selectOption("pc-b");
  await expect(
    terminal.getByRole("region", { name: "PC-B terminal output" }),
  ).not.toContainText("traceroute");
  await command("ip addr", "PC-B");
  await expect(
    terminal.getByRole("region", { name: "PC-B terminal output" }),
  ).toContainText("10.0.0.20/24");
  await terminal.getByLabel("Terminal host").selectOption("pc-a");
  await expect(output).toContainText("destination reached");
  await command("clear");
  await expect(output).not.toContainText("destination reached");
  await command("ping 10.0.0.20");
  await expect(output).toContainText("Request delivered");
  await page
    .getByRole("combobox", { name: "Start with", exact: true })
    .selectOption("local");
  await expect(output).not.toContainText("Request delivered");
  await command("ping 192.168.1.20");
  await expect(output).toContainText("remaining ttl=64");
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .include("#host-terminal")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});

test("repair a missing gateway from the terminal without losing history or device edits", async ({
  page,
}) => {
  await page.goto("/playground");
  await page
    .getByRole("combobox", { name: "Start with", exact: true })
    .selectOption("missing-gateway");
  const input = page.getByRole("textbox", { name: "Command for PC-A" });
  const output = page.getByRole("region", {
    name: "PC-A terminal output",
    exact: true,
  });
  const gateway = page.getByRole("textbox", {
    name: "Default gateway",
    exact: true,
  });
  async function command(value: string) {
    await input.fill(value);
    await input.press("Enter");
  }
  await command("ip route");
  await expect(output).not.toContainText("default via");
  await command("ping 10.0.0.20");
  await expect(output).toContainText("No default gateway");
  await command("ip route add default via 10.0.0.1");
  await expect(output).toContainText("gateway must be a usable");
  await expect(gateway).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Device name", exact: true })
    .fill("PC-A draft");
  await command("ip route add default via 192.168.1.1");
  await expect(output).toContainText("Apply the pending device form edits");
  await expect(
    page.getByRole("textbox", { name: "Device name", exact: true }),
  ).toHaveValue("PC-A draft");
  await page
    .getByRole("button", { name: "Reset repair exercise", exact: true })
    .click();
  await command("ping 10.0.0.20");
  await command("ip route add default via 192.168.1.1");
  await expect(output).toContainText("Default route added");
  await expect(output).toContainText("No default gateway");
  await expect(input).toBeFocused();
  await expect(gateway).toHaveValue("192.168.1.1");
  await command("ip neigh");
  await expect(output).toContainText("ARP cache is empty");
  await command("ip route");
  await expect(output).toContainText("default via 192.168.1.1 dev eth0");
  await command("traceroute 10.0.0.20");
  await expect(output).toContainText("1  192.168.1.1  Router R1");
  await expect(output).toContainText("2  10.0.0.20  destination reached");
  await command("ip route add default via 192.168.1.254");
  await expect(output).toContainText("already exists");
  await expect(gateway).toHaveValue("192.168.1.1");
  await page
    .getByLabel("Snapshot name", { exact: true })
    .fill("Repaired gateway");
  await page.getByRole("button", { name: "Save network", exact: true }).click();
  await expect(page.locator(".library-status")).toContainText(
    "Saved “Repaired gateway”",
  );
  await page
    .getByRole("button", { name: "Reset repair exercise", exact: true })
    .click();
  await expect(gateway).toHaveValue("");
  await page
    .getByLabel("Saved network", { exact: true })
    .selectOption({ label: "Repaired gateway" });
  await page.getByRole("button", { name: "Open network", exact: true }).click();
  await page
    .getByRole("button", { name: "Open snapshot", exact: true })
    .click();
  await expect(gateway).toHaveValue("192.168.1.1");
  await command("traceroute 10.0.0.20");
  await expect(output).toContainText("destination reached");
  await page
    .getByRole("combobox", { name: "Start with", exact: true })
    .selectOption("missing-gateway");
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
  }
  await page
    .getByRole("button", { name: "Reset repair exercise", exact: true })
    .click();
  await expect(gateway).toHaveValue("");
  const accessibility = await new AxeBuilder({ page })
    .include("#host-terminal")
    .include('[aria-label="Gateway repair exercise"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(output).not.toContainText("destination reached");
  await command("ping 10.0.0.20");
  await expect(output).toContainText("No default gateway");
});
