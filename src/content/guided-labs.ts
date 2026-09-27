import type {
  GuidedLabId,
  GuidedRepair,
} from "@/domain/networking/guided-scenarios";

export interface GuidedLabChoice {
  id: string;
  label: string;
  repair: GuidedRepair;
  explanation: string;
}

export interface GuidedLab {
  id: GuidedLabId;
  title: string;
  objective: string;
  investigation: string;
  hints: readonly [string, string];
  choices: readonly GuidedLabChoice[];
}

export const guidedLabs: readonly GuidedLab[] = [
  {
    id: "gateway",
    title: "01 · A packet cannot leave home",
    objective:
      "Help PC-A reach PC-B on another subnet. Find the missing setting before changing the network.",
    investigation:
      "Compare PC-A’s address and prefix with the destination. Inspect PC-A’s gateway and find the last event in the original trace.",
    hints: [
      "PC-A is 192.168.1.10/24 and PC-B is 10.0.0.20/24. PC-A needs a next hop on its own local network.",
      "Router R1’s G0/0 interface is 192.168.1.1/24. That local interface is the gateway PC-A can reach directly.",
    ],
    choices: [
      {
        id: "local-gateway",
        label: "Set PC-A’s gateway to 192.168.1.1",
        repair: { kind: "gateway", address: "192.168.1.1" },
        explanation:
          "PC-A can now resolve its local router interface with ARP and send the frame to that next hop. The packet’s destination IP remains PC-B’s address.",
      },
      {
        id: "remote-gateway",
        label: "Set PC-A’s gateway to 10.0.0.1",
        repair: { kind: "gateway", address: "10.0.0.1" },
        explanation:
          "10.0.0.1 is the router interface on PC-B’s network. It is outside PC-A’s /24 subnet, so it cannot serve as PC-A’s directly reachable gateway in this model.",
      },
      {
        id: "more-ttl",
        label: "Raise the starting TTL to 128",
        repair: { kind: "ttl", value: 128 },
        explanation:
          "A larger TTL does not tell PC-A where to send remote traffic. The gateway is still missing, so the packet stops before reaching a router.",
      },
    ],
  },
  {
    id: "link",
    title: "02 · ARP gets no answer",
    objective:
      "Find why PC-A cannot learn the gateway’s MAC address, then restore delivery to PC-B.",
    investigation:
      "Inspect the ARP target IP and follow the broadcast through Switch A. Compare the links on the canvas with the router interface PC-A is trying to reach.",
    hints: [
      "PC-A already has the correct gateway, 192.168.1.1. An ARP broadcast needs a connected Ethernet path to reach that interface.",
      "The link from Switch A Port 2 to Router R1 G0/0 is missing. Changing TTL or the gateway address cannot reconnect it.",
    ],
    choices: [
      {
        id: "other-gateway",
        label: "Set PC-A’s gateway to 192.168.1.99",
        repair: { kind: "gateway", address: "192.168.1.99" },
        explanation:
          "The ARP target changes to 192.168.1.99, but no device here owns that address. The disconnected router link also remains missing.",
      },
      {
        id: "reconnect-router",
        label: "Reconnect Switch A Port 2 to Router R1 G0/0",
        repair: { kind: "reconnect" },
        explanation:
          "Restoring the Ethernet path lets the ARP request reach the gateway and its reply return to PC-A. The packet can then travel through Router R1 to PC-B.",
      },
      {
        id: "more-ttl",
        label: "Raise the starting TTL to 128",
        repair: { kind: "ttl", value: 128 },
        explanation:
          "TTL limits the packet’s routed lifetime. It cannot restore a missing link, so PC-A still receives no ARP reply from its gateway.",
      },
    ],
  },
  {
    id: "ttl",
    title: "03 · A packet runs out of hops",
    objective:
      "Find why a packet with working links and addresses stops at Router R1. Make one change that lets it reach PC-B.",
    investigation:
      "Select the Decrement TTL event in the original trace. Inspect the IPv4 TTL and checksum, then compare the final event with the ARP exchanges that succeeded.",
    hints: [
      "The packet starts with TTL 1. A forwarding router decreases TTL; an expired packet cannot be forwarded.",
      "This path has one forwarding router. Starting at TTL 2 leaves TTL 1 for the final network. Switches do not consume IPv4 TTL in this model.",
    ],
    choices: [
      {
        id: "wider-prefix",
        label: "Change PC-A’s prefix from /24 to /16",
        repair: { kind: "prefix", value: 16 },
        explanation:
          "10.0.0.20 is still outside PC-A’s local network. The packet still needs Router R1, and its starting TTL is still 1.",
      },
      {
        id: "other-gateway",
        label: "Set PC-A’s gateway to 192.168.1.99",
        repair: { kind: "gateway", address: "192.168.1.99" },
        explanation:
          "No device in this topology answers ARP for 192.168.1.99. This creates an earlier failure while leaving the low TTL unchanged.",
      },
      {
        id: "enough-ttl",
        label: "Raise the starting TTL to 2",
        repair: { kind: "ttl", value: 2 },
        explanation:
          "Router R1 decreases TTL from 2 to 1 and updates the IPv4 header checksum. That is enough for this one-router path. Longer paths need a larger starting TTL.",
      },
    ],
  },
];
