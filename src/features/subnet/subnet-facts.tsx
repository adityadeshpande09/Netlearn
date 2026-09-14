import { ArrowRight } from "lucide-react";
import type { SubnetInfo } from "@/domain/networking/subnet";
export function SubnetFacts({ info }: { info: SubnetInfo }) {
  return (
    <>
      <dl className="subnet-facts">
        <div>
          <dt>Subnet mask</dt>
          <dd className="mono">{info.mask}</dd>
        </div>
        <div>
          <dt>Wildcard mask</dt>
          <dd className="mono">{info.wildcard}</dd>
        </div>
        <div>
          <dt>Total addresses</dt>
          <dd>{info.totalAddresses.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>
            {info.prefix === 0
              ? "Theoretical host capacity"
              : "Usable addresses"}
          </dt>
          <dd>{info.usableHosts.toLocaleString("en-US")}</dd>
        </div>
        <div className="host-range">
          <dt>
            {info.prefix === 31
              ? "Point-to-point endpoints"
              : info.prefix === 32
                ? "Single host address"
                : info.prefix === 0
                  ? "Theoretical host range"
                  : "Usable host range"}
          </dt>
          <dd className="mono">
            {info.firstHost} <ArrowRight size={16} aria-label="through" />{" "}
            {info.lastHost}
          </dd>
        </div>
        <div>
          <dt>
            {info.prefix === 0 ? "Limited broadcast" : "Subnet broadcast"}
          </dt>
          <dd className="mono">{info.broadcast ?? "Not applicable"}</dd>
        </div>
        <div>
          <dt>Highest address</dt>
          <dd className="mono">{info.highestAddress}</dd>
        </div>
      </dl>
      <p className="subnet-context">
        {info.prefix === 31
          ? "A /31 is for a point-to-point link: both addresses are endpoints, with no subnet-directed broadcast (RFC 3021)."
          : info.prefix === 32
            ? "A /32 names one IPv4 address, commonly used as a host route. There is no host-bit range or subnet-directed broadcast."
            : info.prefix === 0
              ? "A /0 covers all IPv4 addresses and is used for a default route. The host figures are theoretical arithmetic, not an inventory of assignable addresses. 255.255.255.255 is limited broadcast; it does not broadcast across the internet."
              : "The network and broadcast addresses are excluded from the host range. Special-purpose address reservations can impose additional limits."}
      </p>
    </>
  );
}
