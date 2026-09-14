import { binaryIpv4 } from "@/domain/networking/ipv4";
import type { SubnetInfo } from "@/domain/networking/subnet";
export function BinaryAddress({ info }: { info: SubnetInfo }) {
  const bits = binaryIpv4(info.address);
  return (
    <section className="subnet-binary" aria-labelledby="binary-heading">
      <div className="subnet-section-heading">
        <div>
          <p className="eyebrow">LOOK UNDER THE DECIMAL</p>
          <h2 id="binary-heading">32 bits. Two jobs.</h2>
        </div>
        <p>
          <span className="bit-legend network-bit">
            {info.prefix} network bits
          </span>
          <span className="bit-legend host-bit">
            {32 - info.prefix} host bits
          </span>
        </p>
      </div>
      <p>
        The prefix fixes the network portion. The remaining bits vary within
        that network.
      </p>
      <div className="binary-octets" aria-hidden="true">
        {[0, 1, 2, 3].map((octet) => (
          <div key={octet}>
            <p>
              Octet {octet + 1}{" "}
              <strong>{info.address.split(".")[octet]}</strong>
            </p>
            <div className="bit-row">
              {bits
                .slice(octet * 8, octet * 8 + 8)
                .split("")
                .map((bit, offset) => (
                  <span
                    key={offset}
                    className={
                      (octet * 8 + offset < info.prefix
                        ? "network-bit"
                        : "host-bit") +
                      (octet * 8 + offset === info.prefix - 1
                        ? " bit-boundary"
                        : "")
                    }
                  >
                    {bit}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">
        Binary address: {bits.match(/.{8}/g)?.join(". ")}. The first{" "}
        {info.prefix} bits identify the network; the remaining{" "}
        {32 - info.prefix} bits identify addresses within it.
      </p>
    </section>
  );
}
