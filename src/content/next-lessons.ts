import type { Lesson } from "./model";

export const nextLessons: Lesson[] = [
  {
    slug: "arp",
    order: 6,
    title: "ARP",
    question: "I know the next-hop IP address. How do I find its MAC address?",
    summary:
      "Follow a local ARP exchange and separate address resolution from routing and switch learning.",
    minutes: 4,
    objectives: [
      "Choose which next-hop IPv4 address needs resolving.",
      "Read the sender and target fields in an ARP request and reply.",
      "Distinguish an ARP cache from a switch MAC table.",
    ],
    sections: [
      {
        title: "Choose the next hop before asking for its MAC",
        body: [
          "Routing and address resolution answer different questions. Routing chooses where to send a packet next; ARP finds the Ethernet address for that chosen local next hop. A host first checks its routes, including the connected subnet. For a directly connected destination it resolves that host. For a remote destination reached through a gateway it resolves the gateway's local interface instead.",
          "Keep our laptop at 192.168.1.10/24 and the remote server at 10.0.0.20. The laptop's route selects gateway 192.168.1.1. Its ARP question is therefore about 192.168.1.1, while the waiting IPv4 packet still names 10.0.0.20 as its destination. ARP does not discover a route across the internet. Ordinary routers do not forward this local Ethernet broadcast into every other network.",
        ],
      },
      {
        title: "Broadcast the question; return the mapping",
        body: [
          "If there is no usable cached mapping, the laptop sends an ARP request on its local Ethernet network. The Ethernet destination is FF:FF:FF:FF:FF:FF, the broadcast address. The ARP fields identify the laptop's sender IP and MAC and the target IP, 192.168.1.1. The unresolved target MAC field is not the Ethernet destination field: our inspector displays zeros there because the answer is not yet known.",
          "The gateway recognizes its own target IP and sends an ordinary ARP reply directly to the laptop. Operation 1 means request; operation 2 means reply. The reply's sender fields provide the gateway IP-to-MAC mapping. ARP is carried directly in Ethernet using EtherType 0x0806; it is not a message inside the waiting IP packet. Once resolution succeeds, an IPv4 frame can carry that packet to the gateway.",
        ],
      },
      {
        title: "Read the right table when something fails",
        body: [
          "An ARP cache belongs to a host or router and associates next-hop IPv4 addresses with link-layer addresses on an interface. A switch MAC table has a different job: it associates learned MAC addresses with ports and VLANs. Seeing a gateway MAC in a switch table does not mean the laptop already has the gateway's IP-to-MAC mapping in its own cache.",
          "Real systems refresh or remove stale ARP entries, so a cache is not a permanent directory. A missing reply can follow a disconnected cable, a wrong subnet configuration, or an unavailable neighbor; it does not identify the cause by itself. In Packet Journey, inspect the ARP request separately from the pending IPv4 packet. In the guided cable exercise, check whether the selected next hop is reachable over the connected links.",
        ],
        callout: {
          label: "Keep the scope local",
          body: "First resolve 192.168.1.1 on the laptop's LAN. The router later resolves 10.0.0.20 on its own outgoing LAN; these are separate ARP exchanges.",
        },
      },
    ],
    concepts: [
      {
        term: "ARP request",
        definition:
          "A local address-resolution question containing the target protocol address and the sender's addresses.",
      },
      {
        term: "ARP cache",
        definition:
          "An interface's stored IPv4-to-link-layer address mappings, subject to validation and replacement.",
      },
      {
        term: "EtherType",
        definition:
          "The Ethernet header field identifying its payload protocol; 0x0806 identifies ARP.",
      },
    ],
    diagram: "arp",
    quiz: {
      id: "arp-check",
      prompt:
        "The laptop has no cached gateway mapping. Which ARP request lets it send to the remote server?",
      options: [
        {
          id: "a",
          text: "Broadcast a request for 192.168.1.1 on the laptop's local LAN.",
        },
        {
          id: "b",
          text: "Broadcast a request for 10.0.0.20 across every routed network.",
        },
        {
          id: "c",
          text: "Ask the switch MAC table to replace the packet's destination IP.",
        },
      ],
      correctOptionId: "a",
      explanation:
        "The route selects 192.168.1.1 as the local next hop. ARP resolves its MAC on that LAN; the waiting packet keeps the remote destination IP.",
      hint: "Choose the IP address of the next hop reachable on the laptop's own Ethernet network.",
    },
  },
  {
    slug: "icmp-ping",
    order: 7,
    title: "ICMP and Ping",
    question:
      "What does a ping reply prove, and what does a timeout leave unanswered?",
    summary:
      "Read IPv4 ICMP echo headers, follow the return path, and use ping results without overclaiming what they mean.",
    minutes: 4,
    objectives: [
      "Recognize ICMP echo request and echo reply type/code values.",
      "Explain why ping needs both outward and return delivery.",
      "Separate IP reachability evidence from application health.",
    ],
    sections: [
      {
        title: "A request that asks for a matching reply",
        body: [
          "Ping is a diagnostic tool that sends echo requests and waits for corresponding replies. For IPv4, these are Internet Control Message Protocol messages: an echo request has type 8 and code 0; an echo reply has type 0 and code 0. The IPv4 header's Protocol field is 1 for ICMP. This exchange does not use TCP or UDP ports.",
          "The echo header contains an identifier and a sequence number to help match replies with requests, followed by data. A normal echo reply returns those values and the data. The ICMP checksum covers the ICMP header and data; the separate IPv4 checksum covers only the IPv4 header. In a packet inspector, first identify the IP payload protocol, then read the type and code within that protocol.",
        ],
      },
      {
        title: "The reply makes its own journey",
        body: [
          "Suppose 192.168.1.10 sends an echo request to 10.0.0.20 through our router. Receiving the request is only the outward half of the exchange. The server creates a reply addressed back to 192.168.1.10 and needs a usable route for it. In this example it uses gateway 10.0.0.1. The reply travels in its own packets and local frames; a real return path can differ from the outward path.",
          "Ping reports round-trip time from sending a request to receiving its reply. That measurement includes both directions and processing along the way; it is not a one-way delay or a bandwidth measurement. Repeated probes give a small sample of replies and missing replies over time. Keep the target and conditions in mind when comparing results: a fast reply from your local gateway says little about the route to a distant server.",
        ],
      },
      {
        title: "Use evidence without guessing the whole story",
        body: [
          "A matching reply is evidence that this ICMP exchange worked at that moment. It does not establish that a website, database, or other application is healthy. A timeout means no matching reply arrived before the wait expired. The request could have been lost or filtered, the target could be unavailable, or the reply could have failed on its return route. A device can also restrict ICMP while serving other traffic.",
          "ICMP carries error reports as well as echo messages. For example, when a router expires an IPv4 packet's TTL in transit, an ICMP Time Exceeded report can help explain the failure. Reports can themselves be lost or filtered, so silence is not a diagnosis. Use the packet's last observed step, interface configuration, routing information, and the relevant application test to narrow the cause instead of treating one failed ping as a complete network verdict.",
        ],
        callout: {
          label: "What NetLearn currently simulates",
          body: "Packet Journey models one ICMP echo request. Delivered means the request reached its destination; the simulator does not generate the echo reply, measure round-trip time, or send ICMP error packets.",
        },
      },
    ],
    concepts: [
      {
        term: "Echo request / reply",
        definition:
          "ICMP messages used to request and return matching data: IPv4 types 8 and 0, both with code 0.",
      },
      {
        term: "Round-trip time",
        definition:
          "The elapsed time between sending a request and receiving its matching reply, covering both directions.",
      },
      {
        term: "Timeout",
        definition:
          "The waiting period ended without the expected reply; this alone does not identify which part failed.",
      },
    ],
    diagram: "echo",
    quiz: {
      id: "icmp-ping-check",
      prompt:
        "A ping times out, but a web page from the same host loads. What can you conclude?",
      options: [
        {
          id: "a",
          text: "The host must be offline because every service depends on ping replies.",
        },
        {
          id: "b",
          text: "The web request worked; the missing ICMP reply alone does not prove the host is offline.",
        },
        {
          id: "c",
          text: "The browser repaired the network by opening ICMP's TCP port.",
        },
      ],
      correctOptionId: "b",
      explanation:
        "A ping timeout describes a missing echo reply, while the successful web request is separate evidence. ICMP can be restricted independently and does not use a TCP port.",
      hint: "A test of one protocol does not automatically describe every application on the host.",
    },
  },
  {
    slug: "subnetting",
    order: 8,
    title: "Subnetting",
    question:
      "Do 192.168.10.70 and 192.168.10.130 belong to the same /26 subnet?",
    summary:
      "Turn a prefix into address boundaries, calculate a /26 range, and predict local or gateway delivery.",
    minutes: 4,
    objectives: [
      "Read a prefix length as a division between network and host bits.",
      "Find the network, broadcast, and usable host range of a /26.",
      "Use subnet boundaries to decide when a gateway is needed.",
    ],
    sections: [
      {
        title: "A prefix marks a bit boundary",
        body: [
          "An IPv4 address contains 32 bits. A /26 prefix fixes the first 26 as the network portion and leaves 6 host bits. Its subnet mask is 255.255.255.192: the final mask octet is binary 11000000. The two leading bits of that octet belong to the network; the remaining six vary within it. Do not decide subnet membership merely by matching the first three decimal numbers.",
          "There are 2 to the power of 6, or 64, addresses in each /26 block. Dividing 192.168.10.0/24 into equal /26 subnets produces four ranges: last octets 0–63, 64–127, 128–191, and 192–255. Each range begins on a multiple of 64. These boundaries follow the prefix bits; you cannot start an arbitrary /26 network at .70 just because that is a device's address.",
        ],
      },
      {
        title: "Work through 192.168.10.70/26",
        body: [
          "The final octet 70 falls in the 64–127 block, so the network address is 192.168.10.64. Keeping the network bits and setting all six host bits to one gives 192.168.10.127, the subnet broadcast address. The usual host range is 192.168.10.65 through 192.168.10.126. This ordinary /26 has 62 usable host addresses after reserving its network and broadcast addresses.",
          "Now compare .70 with .100 and .130. With the same /26 mask, .70 and .100 share the 192.168.10.64 network, while .130 belongs to 192.168.10.128/26. In our simple connected-subnet example, the first destination can be reached directly and the second needs a route through a gateway. The result changes if the prefix changes: all three addresses fit within 192.168.10.0/24.",
        ],
      },
      {
        title: "Connect the calculation to real delivery",
        body: [
          "Assume the laptop is 192.168.10.70/26 and its gateway is 192.168.10.65. To send to .130 on another subnet, it resolves .65 with ARP and sends the frame to that gateway; the IP destination stays .130. The gateway must have an onward route, and a response needs a return route too. Correct arithmetic identifies a boundary, but does not by itself create links or configure working routing.",
          "The usual total-minus-two host count has exceptions. A /31 on a point-to-point link uses both addresses as endpoints, without a subnet-directed broadcast; a /32 identifies one address, often used for a host route. In the Subnet Visualizer, enter 192.168.10.70/26 and compare the network, mask, and range with this example. Then change the prefix to /24 and observe which addresses now share the connected network.",
        ],
        callout: {
          label: "Same first three octets is not enough",
          body: "192.168.10.70/26 and 192.168.10.130/26 are in different subnets. Always compare the prefix-defined network portion, not just the dotted-decimal appearance.",
        },
      },
    ],
    concepts: [
      {
        term: "Prefix length",
        definition:
          "The number of leading address bits used for the network portion; /26 leaves six host bits in IPv4.",
      },
      {
        term: "Network address",
        definition:
          "The base address of a prefix block, formed by setting all host bits to zero.",
      },
      {
        term: "Subnet broadcast",
        definition:
          "The all-host-bits-one address of an ordinary IPv4 subnet; /31 point-to-point links are an exception.",
      },
    ],
    diagram: "subnet",
    quiz: {
      id: "subnetting-check",
      prompt: "Which is the usual usable host range for 192.168.10.70/26?",
      options: [
        {
          id: "a",
          text: "192.168.10.1 through 192.168.10.254: 254 hosts.",
        },
        {
          id: "b",
          text: "192.168.10.64 through 192.168.10.127: 64 hosts.",
        },
        {
          id: "c",
          text: "192.168.10.65 through 192.168.10.126: 62 hosts.",
        },
      ],
      correctOptionId: "c",
      explanation:
        "The /26 block containing .70 runs from .64 to .127. Reserving .64 as the network address and .127 as the broadcast leaves .65–.126, or 62 usable hosts.",
      hint: "Locate .70 in a 64-address block, then exclude its first and last addresses for this ordinary subnet.",
    },
  },
];
