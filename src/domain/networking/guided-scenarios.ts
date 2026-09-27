import { packetJourneyScenario } from "./scenarios";
import type { SimulationScenario } from "./types";

export type GuidedLabId = "gateway" | "link" | "ttl";
export type GuidedRepair =
  | { kind: "gateway"; address: string }
  | { kind: "ttl"; value: number }
  | { kind: "prefix"; value: number }
  | { kind: "reconnect" };

function sourceHost(scenario: SimulationScenario) {
  const source = scenario.devices.find(
    (device) => device.id === scenario.sourceId,
  );
  if (source?.kind !== "host") {
    throw new Error("The guided scenario requires a source computer.");
  }
  return source;
}

export function createGuidedScenario(id: GuidedLabId): SimulationScenario {
  const scenario = packetJourneyScenario();
  switch (id) {
    case "gateway":
      delete sourceHost(scenario).defaultGateway;
      break;
    case "link":
      scenario.links = scenario.links.filter((link) => link.id !== "link-ar");
      break;
    case "ttl":
      scenario.ttl = 1;
      break;
  }
  return scenario;
}

/** Every attempt starts from the original fault, so repairs never accumulate. */
export function applyGuidedRepair(
  id: GuidedLabId,
  repair: GuidedRepair,
): SimulationScenario {
  const scenario = createGuidedScenario(id);
  switch (repair.kind) {
    case "gateway":
      sourceHost(scenario).defaultGateway = repair.address;
      break;
    case "ttl":
      scenario.ttl = repair.value;
      break;
    case "prefix": {
      const port = sourceHost(scenario).interfaces[0];
      if (!port) throw new Error("The source computer requires an interface.");
      port.prefixLength = repair.value;
      break;
    }
    case "reconnect": {
      const link = packetJourneyScenario().links.find(
        (candidate) => candidate.id === "link-ar",
      );
      if (!link)
        throw new Error("The guided scenario requires its router link.");
      if (!scenario.links.some((candidate) => candidate.id === link.id)) {
        scenario.links.push(link);
      }
      break;
    }
  }
  return scenario;
}
