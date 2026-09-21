import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

function field(layer: Locator, name: string) {
  return layer.locator(`[data-field="${name}"] .packet-field-value`);
}

function inspector(page: Page) {
  return page.getByRole("region", { name: "Packet inspector", exact: true });
}

function step(page: Page, title: string) {
  return page.locator(".simulation-timeline button").filter({ hasText: title });
}

async function expand(panel: Locator, label: string) {
  const summary = panel.locator("summary").getByText(label, { exact: true });
  const disclosure = summary.locator("..");
  if ((await disclosure.getAttribute("open")) === null) await summary.click();
}

for (const route of ["/labs/packet-journey", "/playground"]) {
  test(`${route} separates local ARP traffic from the waiting IPv4 packet`, async ({
    page,
  }) => {
    await page.goto(route);
    const panel = inspector(page);
    const ethernet = panel.locator(".ethernet-layer");
    const arp = panel.locator(".arp-layer");
    const ipv4 = panel.locator(".ip-layer");

    await step(page, "Ask for the next hop’s MAC address").first().click();
    await expect(arp).toBeVisible();
    await expect(ipv4).toBeHidden();
    await expect(panel).toContainText(
      "ARP is carried directly by Ethernet. The IPv4 packet is waiting; it is not inside this ARP frame.",
    );
    await expect(field(ethernet, "Destination MAC")).toHaveText(
      "ff:ff:ff:ff:ff:ff",
    );
    await expect(field(arp, "Sender IP")).toHaveText("192.168.1.10");
    await expect(field(arp, "Target IP")).toHaveText("192.168.1.1");

    await expand(panel, "Show all ARP fields");
    await expect(field(arp, "Target MAC")).toHaveText("00:00:00:00:00:00");

    const waiting = panel.getByText("Inspect waiting IPv4 packet", {
      exact: true,
    });
    await waiting.focus();
    await page.keyboard.press("Enter");
    await expect(ipv4).toBeVisible();
    await expect(field(ipv4, "Source IP")).toHaveText("192.168.1.10");
    await expect(field(ipv4, "Destination IP")).toHaveText("10.0.0.20");
    await expect(field(ipv4, "TTL")).toHaveText("64");
    await page.keyboard.press("Enter");
    await expect(ipv4).toBeHidden();

    await step(page, "Router R1 answers ARP").click();
    await expect(field(ethernet, "Destination MAC")).toHaveText(
      "02:00:00:00:01:01",
    );
    await expect(field(arp, "Sender IP")).toHaveText("192.168.1.1");
    await expect(field(arp, "Target IP")).toHaveText("192.168.1.10");
    await expand(panel, "Show all ARP fields");
    await expect(field(arp, "Target MAC")).toHaveText("02:00:00:00:01:01");

    await step(page, "Ask for the next hop’s MAC address").last().click();
    await expect(field(arp, "Sender IP")).toHaveText("10.0.0.1");
    await expect(field(arp, "Target IP")).toHaveText("10.0.0.20");
    await expect(field(ethernet, "Source MAC")).toHaveText("02:00:00:00:03:02");
  });

  test(`${route} shows computed headers and explains what a router changes`, async ({
    page,
  }) => {
    await page.goto(route);
    const panel = inspector(page);
    const ipv4 = panel.locator(".ip-layer");
    const icmp = panel.locator(".icmp-layer");
    await step(page, "Wrap the IP packet in an Ethernet frame").click();
    await expect(panel.locator(".arp-layer")).toHaveCount(0);
    await expect(field(ipv4, "TTL")).toHaveText("64");
    await expand(panel, "Show all IPv4 fields");
    await expect(field(ipv4, "Protocol")).toHaveText("1 · ICMP");
    await expect(field(ipv4, "Header checksum")).toHaveText("0x6f12");
    await expand(panel, "Show all ICMP fields");
    await expect(field(icmp, "Checksum")).toHaveText("0x5d7c");
    await expect(
      panel.locator(
        '[data-field="Source port"], [data-field="Destination port"]',
      ),
    ).toHaveCount(0);

    await step(page, "Decrement TTL").click();
    await expect(field(ipv4, "TTL")).toHaveText("63");
    await expand(panel, "Show all IPv4 fields");
    await expect(field(ipv4, "Header checksum")).toHaveText("0x7012");
    await expect(ipv4.locator('[data-field="TTL"]')).toContainText("Changed");
    await expect(ipv4.locator('[data-field="Header checksum"]')).toContainText(
      "Changed",
    );
    await expand(panel, "Show all ICMP fields");
    await expect(field(icmp, "Checksum")).toHaveText("0x5d7c");
    await expect(field(ipv4, "Source IP")).toHaveText("192.168.1.10");
    await expect(field(ipv4, "Destination IP")).toHaveText("10.0.0.20");

    await step(page, "Create a new Ethernet frame").click();
    const ethernet = panel.locator(".ethernet-layer");
    await expect(field(ethernet, "Source MAC")).toHaveText("02:00:00:00:03:02");
    await expect(field(ethernet, "Destination MAC")).toHaveText(
      "02:00:00:00:05:01",
    );
    await expect(ethernet.locator('[data-field="Source MAC"]')).toContainText(
      "Changed",
    );
    await expect(field(ipv4, "TTL")).toHaveText("63");
    await expect(ipv4.locator('[data-field="TTL"]')).not.toContainText(
      "Changed",
    );
  });

  test(`${route} keeps expanded packet details accessible and readable at narrow widths`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.goto(route);
    await expect(page.locator(".react-flow__node")).toHaveCount(5);
    await step(page, "Ask for the next hop’s MAC address").first().click();
    const panel = inspector(page);
    await expand(panel, "Show all Ethernet fields");
    await expand(panel, "Show all ARP fields");
    await expand(panel, "Inspect waiting IPv4 packet");
    await expand(panel, "Show all IPv4 fields");
    await expand(panel, "Show all ICMP fields");
    await expect(
      field(panel.locator(".ip-layer"), "Header checksum"),
    ).toBeVisible();
    await expect(field(panel.locator(".icmp-layer"), "Checksum")).toBeVisible();

    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Expanded packet details should fit at ${width}px`,
      ).toBe(true);
    }

    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      audit.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          reason: node.failureSummary,
        })),
      })),
    ).toEqual([]);

    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const layout = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter(
            (element) =>
              element.getBoundingClientRect().right > innerWidth &&
              !element.closest(".react-flow"),
          )
          .slice(0, 15)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            right: element.getBoundingClientRect().right,
          })),
      }));
      expect(
        layout.fits,
        `Expanded details at ${width}px: ${JSON.stringify(layout.offenders)}`,
      ).toBe(true);
      await expect(
        panel.getByRole("heading", { name: "Packet inspector" }),
      ).toBeVisible();
    }
  });
}
