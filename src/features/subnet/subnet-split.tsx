import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { splitSubnet, type SubnetInfo } from "@/domain/networking/subnet";
import { parseIpv4 } from "@/domain/networking/ipv4";
export function SubnetSplit({
  info,
  calculate,
}: {
  info: SubnetInfo;
  calculate: (value: string) => void;
}) {
  const [childPrefix, setChildPrefix] = useState(Math.min(32, info.prefix + 2));
  const [page, setPage] = useState(0);
  const splitPrefix = Math.min(32, Math.max(info.prefix + 1, childPrefix));
  const children =
    info.prefix < 32 ? splitSubnet(info, splitPrefix, page) : null;
  return (
    <section className="subnet-split" aria-labelledby="split-heading">
      <div className="subnet-section-heading">
        <div>
          <p className="eyebrow">DIVIDE THE ADDRESS SPACE</p>
          <h2 id="split-heading">Smaller networks, fewer hosts.</h2>
        </div>
        {children && (
          <label className="split-select">
            Split into{" "}
            <select
              value={splitPrefix}
              onChange={(event) => {
                setChildPrefix(Number(event.target.value));
                setPage(0);
              }}
              aria-label="Child subnet prefix"
            >
              {Array.from(
                { length: 32 - info.prefix },
                (_, index) => info.prefix + index + 1,
              ).map((prefix) => (
                <option value={prefix} key={prefix}>
                  /{prefix}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {children ? (
        <>
          <p>
            <span className="mono">
              {info.network}/{info.prefix}
            </span>{" "}
            contains{" "}
            <strong>
              {children.total.toLocaleString("en-US")} equal /{splitPrefix}{" "}
              subnets
            </strong>
            . Select one to inspect it.
          </p>
          <div className="subnet-blocks">
            {children.subnets.map((child) => {
              const address = parseIpv4(info.address)!;
              const contains =
                address >= parseIpv4(child.network)! &&
                address <= parseIpv4(child.highestAddress)!;
              return (
                <button
                  type="button"
                  key={child.network}
                  className={contains ? "contains-address" : ""}
                  onClick={() => calculate(child.network + "/" + child.prefix)}
                  aria-label={
                    "Inspect " +
                    child.network +
                    "/" +
                    child.prefix +
                    (contains ? ", contains entered address" : "")
                  }
                >
                  <strong className="mono">
                    {child.network}/{child.prefix}
                  </strong>
                  <span>
                    {child.totalAddresses.toLocaleString("en-US")} addresses
                  </span>
                  <small className="mono">through {child.highestAddress}</small>
                  {contains && (
                    <span className="subnet-selected-label">
                      Contains your address
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {children.pages > 1 && (
            <div className="split-pagination">
              <button
                type="button"
                className="button button-secondary"
                disabled={children.page === 0}
                onClick={() => setPage(children.page - 1)}
              >
                <ChevronLeft size={17} /> Previous
              </button>
              <p>
                Page {(children.page + 1).toLocaleString("en-US")} of{" "}
                {children.pages.toLocaleString("en-US")}
              </p>
              <button
                type="button"
                className="button button-secondary"
                disabled={children.page + 1 === children.pages}
                onClick={() => setPage(children.page + 1)}
              >
                Next <ChevronRight size={17} />
              </button>
            </div>
          )}
        </>
      ) : (
        <p>
          A /32 already contains one address. Move the prefix slider left to
          explore a larger network.
        </p>
      )}
    </section>
  );
}
