import { describe, expect, it } from "vitest";
import {
  binaryIpv4,
  formatIpv4,
  parseIpv4,
  sameSubnet,
} from "@/domain/networking/ipv4";
import { calculateSubnet, splitSubnet } from "@/domain/networking/subnet";
function subnet(input: string) {
  const result = calculateSubnet(input);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
describe("IPv4 subnet arithmetic", () => {
  it.each([
    ["192.168.1.200/24", "192.168.1.0", "192.168.1.255", 254],
    ["192.168.1.200/25", "192.168.1.128", "192.168.1.255", 126],
    ["172.16.31.200/20", "172.16.16.0", "172.16.31.255", 4094],
    ["203.0.113.6/30", "203.0.113.4", "203.0.113.7", 2],
    ["203.0.113.7/31", "203.0.113.6", "203.0.113.7", 2],
    ["203.0.113.7/32", "203.0.113.7", "203.0.113.7", 1],
  ] as const)("calculates %s", (input, network, highest, hosts) => {
    const result = subnet(input);
    expect(result.network).toBe(network);
    expect(result.highestAddress).toBe(highest);
    expect(result.usableHosts).toBe(hosts);
  });
  it("handles /0 without 32-bit overflow", () => {
    const result = subnet("255.255.255.255/0");
    expect(result.totalAddresses).toBe(4294967296);
    expect(result.mask).toBe("0.0.0.0");
    expect(result.network).toBe("0.0.0.0");
    expect(result.highestAddress).toBe("255.255.255.255");
  });
  it("applies point-to-point and host-route exceptions", () => {
    const pair = subnet("203.0.113.7/31");
    expect(pair.firstHost).toBe("203.0.113.6");
    expect(pair.lastHost).toBe("203.0.113.7");
    expect(pair.broadcast).toBeNull();
    expect(subnet("203.0.113.7/32").broadcast).toBeNull();
  });
  it.each([
    "256.1.1.1/24",
    "1.2.3/24",
    "01.2.3.4/24",
    "1.2.3.4/33",
    "1.2.3.4/",
    "1.2.3.4/-1",
    "1.2.3.4/24x",
    "1.2.3.4/2.4",
  ])("rejects %s", (input) => expect(calculateSubnet(input).ok).toBe(false));
  it("preserves unsigned addresses and all 32 binary digits", () => {
    expect(parseIpv4("255.255.255.255")).toBe(4294967295);
    expect(formatIpv4(4294967295)).toBe("255.255.255.255");
    expect(binaryIpv4("0.0.0.1")).toBe("0".repeat(31) + "1");
    expect(sameSubnet("192.168.1.200", "192.168.0.1", 23)).toBe(true);
  });
  it("splits into contiguous equal child networks", () => {
    const result = splitSubnet(subnet("192.168.1.200/24"), 26);
    expect(result.subnets.map((child) => child.network)).toEqual([
      "192.168.1.0",
      "192.168.1.64",
      "192.168.1.128",
      "192.168.1.192",
    ]);
    expect(
      result.subnets.reduce((total, child) => total + child.totalAddresses, 0),
    ).toBe(256);
  });
  it("paginates billions of children without allocating them", () => {
    const result = splitSubnet(subnet("0.0.0.0/0"), 32, 268435455);
    expect(result.total).toBe(4294967296);
    expect(result.subnets).toHaveLength(16);
    expect(result.subnets.at(-1)?.network).toBe("255.255.255.255");
  });
  it("rejects a child prefix broader than its parent", () =>
    expect(() => splitSubnet(subnet("10.0.0.1/24"), 16)).toThrow(RangeError));
});
