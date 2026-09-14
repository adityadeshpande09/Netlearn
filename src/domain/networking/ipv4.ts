export function parseIpv4(input: string): number | null {
  const parts = input.split(".");
  if (
    parts.length !== 4 ||
    parts.some(
      (part) => !/^(0|[1-9][0-9]{0,2})$/.test(part) || Number(part) > 255,
    )
  )
    return null;
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}
export function formatIpv4(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 4294967295)
    throw new RangeError("IPv4 value must be an unsigned 32-bit integer.");
  return [24, 16, 8, 0]
    .map((shift) => Math.floor(value / 2 ** shift) % 256)
    .join(".");
}
export function validPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
}
export function networkNumber(address: number, prefix: number): number {
  if (!validPrefix(prefix))
    throw new RangeError("Prefix must be between 0 and 32.");
  const size = 2 ** (32 - prefix);
  return Math.floor(address / size) * size;
}
export function sameSubnet(
  left: string,
  right: string,
  prefix: number,
): boolean {
  const a = parseIpv4(left);
  const b = parseIpv4(right);
  return (
    a !== null &&
    b !== null &&
    validPrefix(prefix) &&
    networkNumber(a, prefix) === networkNumber(b, prefix)
  );
}
export function binaryIpv4(address: string): string {
  const value = parseIpv4(address);
  if (value === null) throw new TypeError("Invalid IPv4 address.");
  return value.toString(2).padStart(32, "0");
}
