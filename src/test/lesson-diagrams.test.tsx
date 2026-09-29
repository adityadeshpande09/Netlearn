import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonDiagram } from "@/features/learning/lesson-diagram";
import { calculateSubnet } from "@/domain/networking/subnet";

describe("protocol teaching diagrams", () => {
  it("describes the ARP exchange and pending destination without relying on arrows", () => {
    render(<LessonDiagram type="arp" />);
    expect(screen.getByText("1 · Request on the laptop's LAN")).toBeVisible();
    expect(screen.getByText("2 · Reply directly to the laptop")).toBeVisible();
    expect(
      screen.getByText("Its destination IP is still 10.0.0.20."),
    ).toBeVisible();
    expect(
      screen.getByText(/remote server is not this ARP exchange's target/),
    ).toBeVisible();
  });

  it("labels both echo directions and explains the simulation boundary", () => {
    render(<LessonDiagram type="echo" />);
    expect(screen.getByText("Echo request · type 8, code 0")).toBeVisible();
    expect(screen.getByText("Echo reply · type 0, code 0")).toBeVisible();
    expect(screen.getByText("From 192.168.1.10")).toBeVisible();
    expect(screen.getByText("To 192.168.1.10")).toBeVisible();
    expect(screen.getByText(/simulates only the request/)).toBeVisible();
  });

  it("presents a /26 example consistent with the subnet calculator", () => {
    render(<LessonDiagram type="subnet" />);
    const table = screen.getByRole("table", {
      name: "192.168.10.70/26 · mask 255.255.255.192",
    });
    const subnet = calculateSubnet("192.168.10.70/26");
    expect(subnet.ok).toBe(true);
    if (!subnet.ok) throw new Error(subnet.error);
    for (const [label, value] of [
      ["Network", subnet.value.network],
      ["First host", subnet.value.firstHost],
      ["Last host", subnet.value.lastHost],
      ["Broadcast", subnet.value.broadcast],
      [
        "Usable hosts",
        `${subnet.value.usableHosts} of ${subnet.value.totalAddresses} addresses`,
      ],
    ]) {
      const row = within(table)
        .getByRole("rowheader", { name: label ?? "" })
        .closest("tr");
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent(value ?? "");
    }
    expect(screen.getByText("Contains .70")).toBeVisible();
    expect(screen.getByText("Contains .130")).toBeVisible();
  });
});
