"use client";
import { useState } from "react";

import { Calculator, RotateCcw } from "lucide-react";
import { calculateSubnet } from "@/domain/networking/subnet";
import { SubnetFacts } from "./subnet-facts";
import { BinaryAddress } from "./binary-address";
import { SubnetSplit } from "./subnet-split";
import "./subnet.css";
const example = "192.168.10.37/24";
export function SubnetVisualizer() {
  const [input, setInput] = useState(example);
  const [result, setResult] = useState(() => calculateSubnet(example));
  function calculate(value: string) {
    setInput(value);
    setResult(calculateSubnet(value));
  }
  const info = result.ok ? result.value : null;
  return (
    <div className="subnet-workspace">
      <section
        className="subnet-input-panel"
        aria-labelledby="calculate-heading"
      >
        <div>
          <p className="eyebrow">ADDRESS → NETWORK</p>
          <h2 id="calculate-heading">Find the boundary.</h2>
          <p>
            Enter an IPv4 address with its prefix. Move the boundary to see what
            changes.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            calculate(input);
          }}
        >
          <label htmlFor="cidr-input">IPv4 address / prefix</label>
          <div className="cidr-entry">
            <input
              id="cidr-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!result.ok}
              aria-describedby={!result.ok ? "subnet-error" : "cidr-help"}
            />
            <button className="button" type="submit">
              <Calculator size={18} /> Calculate
            </button>
          </div>
          <p id="cidr-help" className="field-help">
            For example, 192.168.10.37/24. Prefixes /0–/32 are supported.
          </p>
          {!result.ok && (
            <p className="form-error" role="alert" id="subnet-error">
              {result.error}
            </p>
          )}
        </form>
      </section>
      {info && (
        <>
          <section
            className="subnet-result"
            aria-labelledby="subnet-result-heading"
          >
            <div className="subnet-result-top">
              <div>
                <p className="eyebrow">YOUR SUBNET</p>
                <h2 id="subnet-result-heading" className="mono">
                  {info.network}/{info.prefix}
                </h2>
                <p>
                  Entered address <span className="mono">{info.address}</span>
                </p>
              </div>
              <button
                className="text-link reset-example"
                type="button"
                onClick={() => calculate(example)}
              >
                <RotateCcw size={15} /> Reset example
              </button>
            </div>
            <div className="prefix-control">
              <label htmlFor="prefix-range">
                Network prefix <strong className="mono">/{info.prefix}</strong>
              </label>
              <input
                id="prefix-range"
                type="range"
                min="0"
                max="32"
                step="1"
                value={info.prefix}
                onChange={(event) =>
                  calculate(info.address + "/" + event.target.value)
                }
                aria-valuetext={
                  info.prefix +
                  " network bits and " +
                  (32 - info.prefix) +
                  " host bits"
                }
              />
              <div className="range-labels">
                <span>/0 · all addresses</span>
                <span>/32 · one address</span>
              </div>
            </div>
            <p className="sr-only" role="status">
              Result: {info.network}/{info.prefix},{" "}
              {info.totalAddresses.toLocaleString("en-US")} total addresses.
            </p>
            <SubnetFacts info={info} />
          </section>
          <BinaryAddress info={info} />
          <SubnetSplit
            key={info.address + "/" + info.prefix}
            info={info}
            calculate={calculate}
          />
        </>
      )}
    </div>
  );
}
