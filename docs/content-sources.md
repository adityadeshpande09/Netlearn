# Networking content: source map

Verified 2026-09-09. The lesson prose, examples, questions, and quizzes are original. These primary references were used to check the underlying facts.

| Lesson / topic                                     | Verified fact                                                                                                                                            | Primary reference                                                                                                                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network Basics: LAN and service roles              | A LAN joins devices in a limited location; client/server describes a service relationship.                                                               | [Cisco: What Is a LAN?](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-a-lan-local-area-network.html)                                                                                          |
| Network Basics: WAN                                | A WAN connects networks across wider areas; the internet interconnects networks.                                                                         | [Cisco: What Is a WAN?](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-a-wan-wide-area-network.html)                                                                                           |
| Network Basics: IP layering                        | IP carries addressed datagrams using underlying network services.                                                                                        | [RFC 791: Internet Protocol, sections 1.3 and 2.1](https://www.rfc-editor.org/rfc/rfc791.html)                                                                                                                   |
| MAC vs IP: address format and prefix               | IPv4 addresses contain 32 bits; a mask identifies the network portion.                                                                                   | [Cisco: Configure IP Addresses and Unique Subnets for New Users](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html)                                                    |
| MAC vs IP: MAC assignment                          | Ethernet MAC addresses are commonly 48 bits; locally administered and changing MAC addresses exist.                                                      | [RFC 9724: State of Affairs for Randomized and Changing MAC Addresses, sections 2–3](https://www.rfc-editor.org/rfc/rfc9724.html)                                                                                |
| MAC vs IP / packet journey: ARP                    | Routing chooses the next hop before ARP resolves a local protocol address to an Ethernet address; an ordinary initial request is broadcast on that link. | [RFC 826: An Ethernet Address Resolution Protocol, Packet Generation and Packet Reception](https://www.rfc-editor.org/rfc/rfc826.html)                                                                           |
| MAC vs IP / Routers: local and remote destinations | A host uses its connected network information to choose direct delivery or a gateway.                                                                    | [RFC 1122: Requirements for Internet Hosts — Communication Layers, sections 3.3.1.1–3.3.1.2](https://www.rfc-editor.org/rfc/rfc1122.html)                                                                        |
| Switches: learning and aging                       | A Layer 2 switch learns source MAC addresses with incoming ports and VLANs; dynamic entries age out.                                                     | [Cisco: MAC Address and MAC Address Table Management](https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/cdp-lldp-mac-udld/cdp-lldp-mac-udld-configuration-guide/configure-mac.html)              |
| Switches: unknown unicast                          | Unknown destination traffic floods through forwarding ports in the same VLAN, excluding its incoming port.                                               | [Cisco: Unicast Flooding in Switched Campus Networks](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6000-series-switches/23563-143.html)                                                          |
| Switches: known destinations and broadcasts        | Destination MAC lookup guides forwarding; same-port traffic is filtered; Ethernet broadcasts remain within the VLAN during Layer 2 switching.            | [Cisco: Troubleshoot LAN Switching Environments](https://www.cisco.com/c/en/us/support/docs/lan-switching/ethernet/12006-chapter22.html)                                                                         |
| Routers: routes and resolution                     | Routing can use connected, static, or dynamically learned routes; address resolution maps the selected local next hop to a data-link address.            | [Cisco: Configuring IP Unicast Routing](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-15/configuration_guide/rtng/b_1715_rtng_9300_cg/configuring_ip_unicast_routing.html) |
| Routers: longest prefix and TTL                    | Forwarding chooses the most specific matching route; routers reduce TTL by at least one, discard expired packets, and update the IPv4 header checksum.   | [RFC 1812: Requirements for IP Version 4 Routers, sections 4.2.2.5, 5.2.4.3 and 5.3.1](https://www.rfc-editor.org/rfc/rfc1812.html)                                                                              |
| Packet journey: encapsulation                      | Routers deliver the packet using framing appropriate for the selected outgoing link; an incoming Ethernet frame is not an end-to-end internet envelope.  | [RFC 1812, sections 3.2 and 5.2.1](https://www.rfc-editor.org/rfc/rfc1812.html)                                                                                                                                  |
| Packet journey: NAT exception                      | NAT translates addresses; NAPT may translate transport identifiers as well.                                                                              | [RFC 3022: Traditional IP Network Address Translator, sections 2 and 3](https://www.rfc-editor.org/rfc/rfc3022.html)                                                                                             |

## Teaching assumptions

- The examples use ordinary unicast IPv4 over Ethernet, with a working switched topology. IPv6, tunneling, proxy ARP, policy routing, and advanced switch features are outside this introductory sequence.
- MAC addresses are never claimed to be permanent identifiers or guaranteed unique worldwide.
- Switch flooding is described using eligible forwarding ports within the relevant VLAN, excluding the incoming port. Unknown unicast remains a unicast-addressed frame.
- Routing uses prefix lengths, not obsolete address-class rules. The /24 examples are internally consistent.
- The final journey uses laptop 192.168.1.10/24, gateway 192.168.1.1/24, router outgoing interface 10.0.0.1/24, and server 10.0.0.20/24.
- That journey assumes usable routes, sufficient TTL and link capacity for the packet size, no blocking filters, and no NAT. Source/destination IP addresses continue; the frame, TTL, and header checksum change.
- ARP requests are separate exchanges on each local link. The laptop resolves its local gateway; the router resolves the directly connected server.
- The internet-outage printing example depends explicitly on a functioning local printing service.

## Content validation

All five entries use the requested field names, ordered slugs/titles, three objectives, three sections with two body paragraphs each, three glossary concepts, and one quiz with three options. Section body lengths are approximately 370–400 words per lesson. Reading estimates include time to inspect the accompanying diagram and short check.

## Subnet and simulation references

- [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021.html): both addresses on a /31 point-to-point link are endpoints; no subnet-directed broadcast.
- [RFC 4632](https://www.rfc-editor.org/rfc/rfc4632.html): classless prefixes, /32 host routes, and the /0 default route.
- [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html): limited broadcast and local/remote delivery. /0 host-capacity figures are labelled theoretical in the UI.
- [RFC 3986, section 3.2.2](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.2.2): strict four-octet IPv4 textual grammar used for input validation.
- [React Flow handles](https://reactflow.dev/learn/customization/handles) and [accessibility](https://reactflow.dev/learn/advanced-use/accessibility): distinct port IDs, loose connections, keyboard node interaction and descriptive labels.

## Detailed packet headers

The inspector uses original explanations checked against these primary references:

- [RFC 791, section 3.1](https://www.rfc-editor.org/rfc/rfc791.html#section-3.1): IPv4 field widths, IHL, total length, flags/offset, TTL, and header-only checksum.
- [RFC 792](https://www.rfc-editor.org/rfc/rfc792.html): ICMP echo type 8/code 0, identifier, sequence, data, and checksum over the complete ICMP message.
- [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html): ARP field widths, Ethernet hardware type, sender/target roles, requests and replies. The unresolved target hardware address is unspecified by this RFC; the model chooses all zeros.
- [RFC 1071, section 3](https://www.rfc-editor.org/rfc/rfc1071.html#section-3): independent checksum test vector, network-order words, carry folding and odd-byte padding.
- [RFC 894](https://www.rfc-editor.org/rfc/rfc894.html): IP over Ethernet, EtherType 0x0800 and link padding that is not part of IP total length.
- [RFC 2474](https://www.rfc-editor.org/rfc/rfc2474.html) and [RFC 3168](https://www.rfc-editor.org/rfc/rfc3168.html): the modern DSCP and ECN split of the IPv4 DS field.
- IANA [EtherTypes](https://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml), [IP protocol numbers](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml), and [ARP parameters](https://www.iana.org/assignments/arp-parameters/arp-parameters.xhtml): Ethernet IPv4/ARP, ICMP protocol 1, and ARP operation assignments.

IPv4 and ICMP checksums are computed from the modeled bytes. FCS and complete Ethernet framing remain outside the byte view. See model-limitations.md.

## Guided troubleshooting

The gateway, disconnected-link, and TTL exercises reuse the simulator's teaching
assumptions. Claims were checked against [RFC 1122, sections 3.3.1.1–3.3.1.2](https://www.rfc-editor.org/rfc/rfc1122.html)
for local versus gateway delivery, [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html)
for resolving a next hop over the connected Ethernet network, and
[RFC 1812, sections 4.2.2.5 and 5.3.1](https://www.rfc-editor.org/rfc/rfc1812.html)
for TTL decrement, expiry, and checksum updates. A repair is successful only when
the existing engine delivers the modeled request; the exercises do not claim to
diagnose arbitrary real networks.
