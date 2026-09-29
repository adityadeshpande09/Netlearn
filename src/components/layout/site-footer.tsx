import Link from "next/link";
import { Network, ArrowUpRight } from "lucide-react";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link href="/" className="brand" aria-label="NetLearn home">
          <Network size={20} /> NetLearn<span className="brand-period">.</span>
        </Link>
        <p>Learn the idea. Try it in a network.</p>
        <Link href="/learn">
          Explore the learning path <ArrowUpRight size={15} />
        </Link>
      </div>
    </footer>
  );
}
