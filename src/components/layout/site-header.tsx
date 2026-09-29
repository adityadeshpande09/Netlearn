"use client";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X, Network } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SiteHeader() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 801px)");
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) setExpanded(false);
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);
  const links = [
    { href: "/", label: "Overview" },
    { href: "/learn", label: "Learning path" },
    { href: "/labs/packet-journey", label: "Packet Journey" },
    { href: "/labs/troubleshooting", label: "Guided labs" },
    { href: "/tools/subnet", label: "Subnet" },
    { href: "/playground", label: "Playground" },
  ];
  function close() {
    setExpanded(false);
  }
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="NetLearn home"
          onClick={close}
        >
          <span className="brand-symbol">
            <Network size={22} strokeWidth={2.2} />
          </span>
          NetLearn<span className="brand-period">.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? pathname === href : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="button button-small header-cta" href="/account">
          Your account <ArrowUpRight size={16} />
        </Link>
        <ThemeToggle />
        <button
          ref={trigger}
          type="button"
          className="icon-button mobile-menu-trigger"
          aria-label={expanded ? "Close navigation" : "Open navigation"}
          aria-expanded={expanded}
          aria-controls="mobile-navigation"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {expanded && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close();
              trigger.current?.focus();
            }
          }}
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={
                (href === "/" ? pathname === href : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={close}
            aria-current={pathname === "/account" ? "page" : undefined}
          >
            Your account
          </Link>
        </nav>
      )}
    </header>
  );
}
