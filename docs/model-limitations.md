# Teaching model boundaries

## Packet Journey and Playground

The app sends no real network traffic. Each trace starts with empty ARP/MAC tables and models a single ICMP echo request. The fixed lab crosses two networks through one router; its normal trace contains 26 events. Playground routes may cross multiple routers using connected/static routes.

- Up to eight devices in the UI; one interface per host, four ports per switch, two interfaces per router.
- Ethernet interfaces accept /1–/30 prefixes. Addresses must be distinct in the workspace and valid unicast host addresses.
- Connected switch groups represent one VLAN. ARP broadcasts stay within that local network. Switch loops are rejected because STP is not modeled.
- Routers preserve IP endpoints, decrement TTL, and create a new outgoing Ethernet header. Equal-prefix route ties use stable input order, with connected routes first; metrics and administrative distance are outside the model.
- Header inspection models Ethernet II (14 bytes), Ethernet/IPv4 ARP (28 bytes), IPv4 without options (20 bytes), and ICMP Echo Request (8-byte header plus the 8 ASCII bytes `NetLearn`). The IPv4 and ICMP checksums are computed from these serialized bytes. IPv4 DSCP/ECN are zero, identification is 1, DF is set, MF is clear, and fragment offset is zero; ICMP identifier and sequence are 1. These are deterministic example choices, not universal protocol defaults.
- ARP request target MAC is all zeros by convention in this model; it is distinct from the broadcast Ethernet destination. The inspector keeps the waiting IP datagram separate from ARP and labels cached/failed exchanges as the last observed frame. Hexadecimal output contains the modeled headers/message, not a full capture: Ethernet padding, preamble, SFD, and FCS are omitted.
- No reply path, NAT, DHCP, IPv6, dynamic routing, STP, packet queues/loss/corruption, fragmentation, path MTU discovery, or real protocol timing. A TTL-zero packet is shown as discarded; no ICMP Time Exceeded reply is generated.
- Playback speed changes presentation only. Reset starts the same deterministic trace. Changing configuration regenerates it.
- Unsaved canvas changes disappear on reload. Week 2 adds up to 20 named snapshots in the current browser/origin, including positions, topology, source/destination and TTL. Reopening replaces the workspace after confirmation; deleting a snapshot leaves the open workspace intact. Device/route form changes must be applied before saving. Snapshots do not sync across devices; clearing browser data removes them.

## Subnet arithmetic

The calculator accepts /0–/32 independently of the Playground's Ethernet constraints. A /31 assumes a point-to-point link with two endpoints and no subnet-directed broadcast; /32 names one address. /0 covers IPv4 and represents the default-route prefix. Its theoretical host count is arithmetic, not an inventory of assignable internet addresses; 255.255.255.255 is limited broadcast.

Ordinary host capacities subtract network and broadcast addresses but do not enumerate all special-purpose reservations. Child subnet lists are paginated, with 16 results per page, to keep even billions of theoretical children bounded in memory.

## Learning progress

Completion is saved only in the current browser/origin. localhost and 127.0.0.1, different ports, devices, and future deployment URLs each have separate storage. Invalid/future-version data is preserved. If storage is blocked or full, tab-memory progress survives client navigation but not a full reload. No accounts or synchronization service exist in Week 1.
