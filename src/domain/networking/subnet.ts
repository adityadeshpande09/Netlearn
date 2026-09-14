import { formatIpv4, networkNumber, parseIpv4, validPrefix } from "./ipv4";
export interface SubnetInfo {
  address: string;
  prefix: number;
  network: string;
  mask: string;
  wildcard: string;
  highestAddress: string;
  broadcast: string | null;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  kind: "subnet" | "point-to-point" | "host";
}
export type SubnetResult =
  { ok: true; value: SubnetInfo } | { ok: false; error: string };
export function calculateSubnet(cidr: string): SubnetResult {
  const parts = cidr.trim().split("/");
  if (parts.length !== 2 || !/^(0|[1-9][0-9]?)$/.test(parts[1] ?? ""))
    return {
      ok: false,
      error: "Enter an IPv4 address and prefix, such as 192.168.10.37/24.",
    };
  const address = parts[0] ?? "";
  const prefix = Number(parts[1]);
  const numeric = parseIpv4(address);
  if (numeric === null)
    return {
      ok: false,
      error: "Use four decimal octets from 0 to 255, without leading zeros.",
    };
  if (!validPrefix(prefix))
    return { ok: false, error: "The prefix must be between /0 and /32." };
  const count = 2 ** (32 - prefix);
  const first = networkNumber(numeric, prefix);
  const last = first + count - 1;
  return {
    ok: true,
    value: {
      address,
      prefix,
      network: formatIpv4(first),
      highestAddress: formatIpv4(last),
      mask: formatIpv4(4294967296 - count),
      wildcard: formatIpv4(count - 1),
      broadcast: prefix < 31 ? formatIpv4(last) : null,
      firstHost: formatIpv4(prefix < 31 ? first + 1 : first),
      lastHost: formatIpv4(prefix < 31 ? last - 1 : last),
      totalAddresses: count,
      usableHosts: prefix < 31 ? count - 2 : count,
      kind:
        prefix === 32 ? "host" : prefix === 31 ? "point-to-point" : "subnet",
    },
  };
}
export function splitSubnet(
  parent: SubnetInfo,
  prefix: number,
  page = 0,
): { subnets: SubnetInfo[]; total: number; page: number; pages: number } {
  if (!validPrefix(prefix) || prefix < parent.prefix)
    throw new RangeError("Child prefix must be at least the parent prefix.");
  const total = 2 ** (prefix - parent.prefix);
  const pages = Math.ceil(total / 16);
  const current = Math.min(
    pages - 1,
    Math.max(0, Number.isFinite(page) ? Math.floor(page) : 0),
  );
  const first = parseIpv4(parent.network);
  if (first === null) throw new TypeError("Invalid parent subnet.");
  const subnets: SubnetInfo[] = [];
  for (
    let index = current * 16;
    index < Math.min(total, current * 16 + 16);
    index++
  ) {
    const result = calculateSubnet(
      formatIpv4(first + index * 2 ** (32 - prefix)) + "/" + prefix,
    );
    if (result.ok) subnets.push(result.value);
  }
  return { subnets, total, page: current, pages };
}
