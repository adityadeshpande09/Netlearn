# Teaching model boundaries

## Packet Journey and Playground

The app sends no real network traffic. Each trace starts with empty ARP/MAC tables and models a single ICMP echo request. The fixed lab crosses two networks through one router; its normal trace contains 26 events. Playground routes may cross multiple routers using connected/static routes.

- Up to eight devices in the UI; one interface per host, four ports per switch, two interfaces per router.
- Ethernet interfaces accept /1–/30 prefixes. Addresses must be distinct in the workspace and valid unicast host addresses.
- Connected switch groups represent one VLAN. ARP broadcasts stay within that local network. Switch loops are rejected because STP is not modeled.
- Routers preserve IP endpoints, decrement TTL, and create a new outgoing Ethernet header. Equal-prefix route ties use stable input order, with connected routes first; metrics and administrative distance are outside the model.
- No reply path, NAT, DHCP, IPv6, dynamic routing, STP, packet queues/loss/corruption, fragmentation, checksum computation, or real protocol timing.
- Playback speed changes presentation only. Reset starts the same deterministic trace. Changing configuration regenerates it.
- Unsaved canvas changes disappear on reload. Week 2 adds up to 20 named snapshots in the current browser/origin, including positions, topology, source/destination and TTL. Reopening replaces the workspace after confirmation; deleting a snapshot leaves the open workspace intact. Device/route form changes must be applied before saving. Snapshots do not sync across devices; clearing browser data removes them.

## Subnet arithmetic

The calculator accepts /0–/32 independently of the Playground's Ethernet constraints. A /31 assumes a point-to-point link with two endpoints and no subnet-directed broadcast; /32 names one address. /0 covers IPv4 and represents the default-route prefix. Its theoretical host count is arithmetic, not an inventory of assignable internet addresses; 255.255.255.255 is limited broadcast.

Ordinary host capacities subtract network and broadcast addresses but do not enumerate all special-purpose reservations. Child subnet lists are paginated, with 16 results per page, to keep even billions of theoretical children bounded in memory.

## Learning progress

Completion is saved only in the current browser/origin. localhost and 127.0.0.1, different ports, devices, and future deployment URLs each have separate storage. Invalid/future-version data is preserved. If storage is blocked or full, tab-memory progress survives client navigation but not a full reload. No accounts or synchronization service exist in Week 1.
