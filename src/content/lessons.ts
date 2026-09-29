import type { Lesson } from "./model";
import { nextLessons } from "./next-lessons";
export const lessons: Lesson[] = [
  {
    slug: "network-basics",
    order: 1,
    title: "Network Basics",
    question:
      "Can my laptop still use a network printer when the internet is down?",
    summary:
      "Meet hosts, clients, servers, and the local networks that connect everyday devices.",
    minutes: 3,
    objectives: [
      "Identify hosts and the links between them.",
      "Explain client and server roles with an everyday example.",
      "Distinguish a local network from a wide area network.",
    ],
    sections: [
      {
        title: "Start with connected devices",
        body: [
          "A computer network lets devices exchange information over connections called links. Your laptop, a printer, and a file server can all be hosts: devices that send or receive data for their own applications. Network interfaces connect them to the network. An Ethernet adapter uses a cable; a Wi-Fi adapter uses radio signals. A device can have more than one interface.",
          "Communication needs shared rules, called protocols. These rules describe things such as addressing and message formats, so different devices can understand one another. In the IPv4 Ethernet examples in this course, application data travels in IP packets, carried inside Ethernet frames across the local network. You will meet the two kinds of addresses used by these layers in the next lesson.",
        ],
      },
      {
        title: "Clients request; servers respond",
        body: [
          "Client and server describe roles in a conversation. When your browser requests a web page, the browser acts as a client and the web service acts as a server. When a laptop submits a print job, it uses a service offered by a printer or print server. A server does not have to be a special kind of physical computer.",
          "The same machine can provide one service while using another. For example, a computer may share files with colleagues and also browse a website. Some applications let peers exchange data without one permanent central server. These roles explain who requests or provides a service; they do not tell you whether the devices are in the same room or across the country.",
        ],
      },
      {
        title: "Local connections and wider journeys",
        body: [
          "A local area network, or LAN, connects devices within a limited area such as a home, office, or campus. Ethernet switches connect wired devices, and access points connect wireless devices. A wide area network, or WAN, links networks across larger distances. An organization can use a WAN to connect offices in different cities. The internet interconnects many independently operated networks.",
          "Local communication does not automatically require an internet connection. If your laptop and printer remain connected and the printing service works locally, you may still print during an internet outage. A cloud printing service would need its remote connection. When troubleshooting, separate the local link, the route to another network, and the application service: a failure in one does not prove that every part has failed.",
        ],
        callout: {
          label: "Try the distinction",
          body: "A working Wi-Fi connection shows a local connection. It does not, by itself, prove that a remote website is reachable.",
        },
      },
    ],
    concepts: [
      {
        term: "Host",
        definition:
          "A device that sends or receives network data for its own applications.",
      },
      {
        term: "Protocol",
        definition:
          "Agreed rules that let devices exchange and interpret messages.",
      },
      {
        term: "LAN",
        definition:
          "A local area network connecting devices within a limited area.",
      },
    ],
    diagram: "lan",
    quiz: {
      id: "network-basics-check",
      prompt:
        "A laptop and printer share a working local network. The internet connection fails. What is still possible?",
      options: [
        {
          id: "a",
          text: "Local printing can work if the printing service does not need the cloud.",
        },
        {
          id: "b",
          text: "All communication between the laptop and printer must stop.",
        },
        {
          id: "c",
          text: "The printer must become an internet router.",
        },
      ],
      correctOptionId: "a",
      explanation:
        "The local network can carry a print job without an internet connection. A service that depends on a cloud server would still need that remote connection.",
      hint: "Think about whether the print job needs to leave the local network.",
    },
  },
  {
    slug: "mac-vs-ip",
    order: 2,
    title: "MAC vs IP",
    question: "Why does my laptop need both a MAC address and an IP address?",
    summary:
      "Separate Ethernet delivery on a local link from IP addressing across networks.",
    minutes: 3,
    objectives: [
      "Recognize a MAC address and an IPv4 address.",
      "Explain the different jobs of a frame and a packet.",
      "Choose the correct local Ethernet destination for a remote packet.",
    ],
    sections: [
      {
        title: "MAC addresses deliver Ethernet frames",
        body: [
          "An Ethernet frame has source and destination MAC addresses in its header. A typical Ethernet MAC address is 48 bits long, often written as six hexadecimal pairs, such as 02:1A:2B:3C:4D:5E. A switch uses the destination MAC address to decide where to send the frame within the local Ethernet network. The source address identifies the interface that sent that frame onto the link.",
          "A MAC address is associated with an interface, not a permanent personal identity. Devices may have several interfaces, and software can use locally assigned or randomized addresses. Do not assume every MAC address is fixed forever or guaranteed unique worldwide. In a working local Ethernet network, conflicting addresses can still cause delivery problems because switches rely on those addresses to locate interfaces.",
        ],
      },
      {
        title: "IP addresses describe network destinations",
        body: [
          "IPv4 uses 32-bit addresses, normally written as four decimal numbers, such as 192.168.1.10. An interface also has a subnet mask or prefix length. In 192.168.1.10/24, the first 24 bits identify the subnet, 192.168.1.0/24. For this example, 192.168.1.20 is in the same subnet, while 10.0.0.20 is outside it. The prefix matters; the address alone is not enough to make that decision.",
          "IP addresses support communication across connected networks. Routers examine a packet's destination IP address and select a route toward it. An address can change when a device joins another network or receives a new assignment. Private IPv4 addresses can also be reused in separate networks. Neither an IP address nor a MAC address should be treated as a reliable identifier of a person.",
        ],
      },
      {
        title: "One packet, a local envelope",
        body: [
          "On Ethernet, an IP packet is carried inside a frame. Think of the packet as the message addressed to the final destination, and the frame as the envelope for the current local delivery. If a destination is directly reachable on the local subnet, the sender uses that destination's MAC address. For a remote destination reached through a gateway, the sender uses the gateway interface's MAC address.",
          "The remote device's IP address remains the packet's destination; choosing a gateway does not replace it with the gateway's IP address. For ordinary IPv4 Ethernet communication, ARP resolves the chosen local next-hop IP address to a MAC address when needed. A router then removes the incoming frame and creates a suitable new frame for its outgoing link. Ordinary Layer 2 switching does not perform this routed handoff.",
        ],
        callout: {
          label: "Keep the two destinations separate",
          body: "A frame can be addressed to your gateway while the packet inside is addressed to a server on another network.",
        },
      },
    ],
    concepts: [
      {
        term: "MAC address",
        definition: "A link-layer address used for Ethernet frame delivery.",
      },
      {
        term: "IPv4 address",
        definition:
          "A 32-bit network-layer address used as an IP packet source or destination.",
      },
      {
        term: "ARP",
        definition:
          "Address Resolution Protocol; it resolves a local next-hop IPv4 address to a link-layer address.",
      },
    ],
    diagram: "addresses",
    quiz: {
      id: "mac-vs-ip-check",
      prompt:
        "Your laptop sends a packet to a remote server through its gateway. Which addresses are in the first Ethernet frame and its IP packet?",
      options: [
        {
          id: "a",
          text: "Destination MAC: remote server. Destination IP: gateway.",
        },
        {
          id: "b",
          text: "Destination MAC: gateway. Destination IP: remote server.",
        },
        {
          id: "c",
          text: "Destination MAC: gateway. Destination IP: gateway.",
        },
      ],
      correctOptionId: "b",
      explanation:
        "The Ethernet frame reaches the local gateway. The IP packet inside still names the remote server as its destination.",
      hint: "The frame serves the local delivery; the packet names the final destination.",
    },
  },
  {
    slug: "switches",
    order: 3,
    title: "Switches",
    question: "How does a switch know which cable leads to my computer?",
    summary:
      "See how a switch learns source addresses, forwards known traffic, and handles unknown destinations.",
    minutes: 3,
    objectives: [
      "Explain how incoming source MAC addresses build a switch table.",
      "Predict forwarding for known and unknown destination MAC addresses.",
      "Describe the VLAN boundary for Ethernet broadcasts.",
    ],
    sections: [
      {
        title: "Learn from the source",
        body: [
          "A basic Layer 2 Ethernet switch connects devices within a local network. Its MAC address table records which addresses are reachable through which ports, together with their VLAN. A VLAN is a logical separation within a switched network. For this lesson, imagine one VLAN with a laptop on port 1, a printer on port 2, and a gateway on port 3.",
          "When a frame arrives from the laptop on port 1, the switch learns the frame's source MAC address on that port in that VLAN. It does not learn the printer's location merely because the laptop sends something to the printer. When the printer sends a frame, the switch can learn its source address too. Dynamic entries age out, and later incoming frames can refresh or update them.",
        ],
      },
      {
        title: "Forward using the destination",
        body: [
          "After learning from the source, the switch looks up the frame's destination MAC address in the relevant VLAN. If the table says the printer is reachable through port 2, a frame for that printer can leave through port 2. Other ordinary ports do not need a copy. The outgoing port might lead directly to the printer or to another switch that leads toward it.",
          "If the destination is known on the same port where the frame arrived, the switch filters that frame instead of sending it back along that path. This can happen when several devices are reachable behind one port. Notice the two separate jobs: the source tells the switch where a sender was seen, while the destination guides the current forwarding decision. The table is not a list of remote IP routes.",
        ],
      },
      {
        title: "Flood within the VLAN",
        body: [
          "If a unicast destination is missing from the table, ordinary switch behavior is to flood the frame through the other eligible forwarding ports in that VLAN. Flooding gives the unknown destination a chance to receive it. A reply may then teach the switch the destination's location. The original frame keeps its unicast destination address; the switch does not turn it into a broadcast frame.",
          "An Ethernet broadcast uses the destination FF:FF:FF:FF:FF:FF. A switch normally forwards it through the other eligible ports in the same VLAN, even if its MAC table contains many entries. ARP requests commonly use this behavior. Another VLAN does not receive that broadcast through ordinary Layer 2 switching. Communication between VLANs requires routing. Port state and configured controls can further restrict which ports may forward traffic.",
        ],
        callout: {
          label: "Remember the decision order",
          body: "Learn from the source. Look up the destination. Forward or flood within the relevant VLAN.",
        },
      },
    ],
    concepts: [
      {
        term: "MAC address table",
        definition:
          "A switch's mapping of MAC addresses and VLANs to reachable ports.",
      },
      {
        term: "Unknown unicast",
        definition:
          "A frame addressed to one interface whose MAC address is absent from the switch's table.",
      },
      {
        term: "VLAN",
        definition:
          "A logical Layer 2 network that separates a group of switch ports and its broadcast traffic.",
      },
    ],
    diagram: "switch",
    quiz: {
      id: "switches-check",
      prompt:
        "A frame enters port 1 in VLAN 10. Its destination MAC is unknown. Under ordinary switching behavior, where does it go?",
      options: [
        {
          id: "a",
          text: "Only back through port 1.",
        },
        {
          id: "b",
          text: "Through every port in every VLAN.",
        },
        {
          id: "c",
          text: "Through the other eligible forwarding ports in VLAN 10.",
        },
      ],
      correctOptionId: "c",
      explanation:
        "Unknown unicast traffic is flooded within its VLAN, excluding the incoming port. The switch also learns the source MAC address from the incoming frame.",
      hint: "Keep both boundaries in mind: the incoming port and the VLAN.",
    },
  },
  {
    slug: "routers",
    order: 4,
    title: "Routers",
    question:
      "What does my default gateway do when a destination is outside my subnet?",
    summary:
      "Follow a router's choice of interface and next hop, including longest-prefix matching and TTL.",
    minutes: 3,
    objectives: [
      "Explain why a host uses a local gateway for remote destinations.",
      "Choose the most specific matching route from a small routing table.",
      "Explain how TTL prevents packets from circulating indefinitely.",
    ],
    sections: [
      {
        title: "Use a gateway to leave the subnet",
        body: [
          "A router forwards IP packets between networks. An interface is one of its network connections, which may be physical or logical. In a simple two-LAN setup, the router might use 192.168.1.1/24 on one interface and 10.0.0.1/24 on another. Each address makes the router reachable within that interface's subnet. The router can then move suitable traffic between those connected networks.",
          "A laptop at 192.168.1.10/24 can use 192.168.1.1 as its default gateway. When its routing table has no more specific route for a remote destination, the default route sends the packet toward that gateway. The gateway must be reachable on the local link in this ordinary Ethernet setup. The packet still carries the remote destination IP address; the gateway is the next step, not the final recipient.",
        ],
      },
      {
        title: "Choose the most specific matching route",
        body: [
          "A router consults a table of routes. Each route describes a destination prefix and how to reach it, such as an outgoing interface and possibly another router as the next hop. Some routes represent connected networks. Others are configured by an administrator or learned through routing protocols. A route does not need to list every individual computer in its destination network.",
          "For a destination of 10.0.0.20, suppose the table contains 10.0.0.0/24, 10.0.0.0/8, and the default route 0.0.0.0/0. All three match, but /24 is the longest prefix and therefore the most specific match. It wins the ordinary destination lookup. The default route is a fallback for addresses without a more specific match. If no usable route matches, the router cannot forward the packet toward that destination.",
        ],
      },
      {
        title: "Forward with a limited lifetime",
        body: [
          "After selecting an Ethernet next hop, the router needs a suitable destination MAC address on the outgoing link. It can use an existing ARP entry or resolve that address when needed. The incoming frame ends at the router; the outgoing frame uses the router's outgoing interface as its source and the next hop as its destination. The IP packet continues inside this new frame.",
          "IPv4 also includes a time-to-live field, or TTL. A forwarding router reduces it by at least one; in normal fast forwarding, one hop consumes one count. If the remaining value cannot survive forwarding, the packet is discarded, usually with an ICMP Time Exceeded response. This limits the damage from routing loops. The IPv4 header checksum is updated after the header changes. TTL does not measure the number of switches crossed.",
        ],
        callout: {
          label: "A router is more than an internet exit",
          body: "Two local subnets can communicate through a router even when neither has an internet connection.",
        },
      },
    ],
    concepts: [
      {
        term: "Default gateway",
        definition:
          "The local router a host uses through its default route when no more specific route matches.",
      },
      {
        term: "Longest-prefix match",
        definition:
          "Selecting the matching route with the greatest number of destination prefix bits.",
      },
      {
        term: "TTL",
        definition:
          "An IPv4 field reduced during router forwarding to limit a packet's lifetime.",
      },
    ],
    diagram: "router",
    quiz: {
      id: "routers-check",
      prompt:
        "A router has routes 10.0.0.0/24, 10.0.0.0/8, and 0.0.0.0/0. Which is the most specific match for 10.0.0.20?",
      options: [
        {
          id: "a",
          text: "10.0.0.0/24",
        },
        {
          id: "b",
          text: "10.0.0.0/8",
        },
        {
          id: "c",
          text: "0.0.0.0/0",
        },
      ],
      correctOptionId: "a",
      explanation:
        "All three prefixes include the destination, but /24 matches the greatest number of leading address bits. It is more specific than /8 and the default /0 route.",
      hint: "A longer matching prefix describes a smaller destination range.",
    },
  },
  {
    slug: "packet-travel",
    order: 5,
    title: "How a Packet Travels",
    question:
      "What changes when a packet crosses from one Ethernet network to another?",
    summary:
      "Trace a packet from 192.168.1.10 to 10.0.0.20 through one router and two local Ethernet deliveries.",
    minutes: 4,
    objectives: [
      "Trace the local and remote decisions in a two-subnet journey.",
      "Identify the IP address resolved by ARP on each Ethernet link.",
      "Distinguish changing frame addresses from continuing packet addresses.",
    ],
    sections: [
      {
        title: "Choose the first local destination",
        body: [
          "Imagine a laptop at 192.168.1.10/24 sending to a server at 10.0.0.20/24. One router connects both Ethernet LANs: its laptop-side interface is 192.168.1.1/24, and its server-side interface is 10.0.0.1/24. The laptop uses 192.168.1.1 as its default gateway. Assume working links and routes, enough TTL, a packet that fits both links, no filtering, and no network address translation, or NAT.",
          "The laptop's subnet is 192.168.1.0/24, so 10.0.0.20 is remote. Its default route selects 192.168.1.1 as the next hop. If the laptop lacks a valid ARP entry for that gateway, it broadcasts a local ARP request for 192.168.1.1. The router's local interface replies with its MAC address. The laptop does not broadcast an ARP request across the router to discover the remote server.",
        ],
      },
      {
        title: "Reach the router, then make a new frame",
        body: [
          "The laptop now sends an Ethernet frame with its own MAC address as source and the gateway's local MAC address as destination. Inside, the IPv4 packet has source 192.168.1.10 and destination 10.0.0.20. The LAN switch forwards using the Ethernet destination and its MAC table. Receiving this frame does not make the gateway's IP address the packet's destination.",
          "The router accepts the frame, removes the Ethernet encapsulation, and looks up 10.0.0.20. Its connected route for 10.0.0.0/24 selects the server-side interface. The router reduces TTL and updates the IPv4 header checksum. Because the server is directly connected on that outgoing subnet, the router resolves 10.0.0.20 with ARP on that LAN if it has no valid entry. This is a separate local ARP exchange.",
        ],
      },
      {
        title: "Complete the final Ethernet delivery",
        body: [
          "The router builds a new Ethernet frame. Its source MAC is the router's server-side interface; its destination MAC is the server's interface. The IP source remains 192.168.1.10 and the IP destination remains 10.0.0.20 because this example has no NAT. The destination LAN's switch delivers the frame toward the server, which processes the packet and passes its contents to the appropriate protocol and application.",
          "For a response, the server makes its own routing decision and can use 10.0.0.1 as its gateway back to the laptop's subnet. A successful outward delivery alone does not establish a return route. Across the example, remember what changed at the router: the Ethernet frame, TTL, and IPv4 header checksum. The original source and destination IP addresses continue across the routed hop; they are not a claim that the whole packet is unchanged.",
        ],
        callout: {
          label: "Track two layers",
          body: "First frame: laptop to gateway. Second frame: router to server. Both carry an IP packet from 192.168.1.10 to 10.0.0.20.",
        },
      },
    ],
    concepts: [
      {
        term: "Next hop",
        definition:
          "The directly reachable host or router selected for the next local delivery.",
      },
      {
        term: "Encapsulation",
        definition:
          "Carrying data inside a protocol's header and, where applicable, trailer; here, an IP packet inside an Ethernet frame.",
      },
      {
        term: "NAT",
        definition:
          "Network address translation; a function that changes IP addresses in packets and may also translate transport ports.",
      },
    ],
    diagram: "journey",
    quiz: {
      id: "packet-travel-check",
      prompt:
        "Before its first frame to 10.0.0.20, which IP address does the laptop resolve with ARP if its cache is empty?",
      options: [
        {
          id: "a",
          text: "10.0.0.20, the remote server.",
        },
        {
          id: "b",
          text: "10.0.0.1, the router's remote interface.",
        },
        {
          id: "c",
          text: "192.168.1.1, the laptop's local gateway.",
        },
      ],
      correctOptionId: "c",
      explanation:
        "The destination is outside 192.168.1.0/24, so the laptop sends to its local gateway. ARP resolves that next hop on the laptop's own Ethernet link.",
      hint: "ARP must reach a next hop on the sender's local link.",
    },
  },
  ...nextLessons,
];
export function getLesson(slug: string) {
  return lessons.find((lesson) => lesson.slug === slug);
}
