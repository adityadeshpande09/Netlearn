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
