import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MousePointer2,
  BookOpen,
  Lightbulb,
  Network,
  Route,
} from "lucide-react";
import { PacketPreview } from "@/features/home/packet-preview";

import { lessons } from "@/content/lessons";
const previews = [
  { label: "Start here", icon: MousePointer2 },
  { label: "Build your intuition", icon: Route },
  { label: "Follow the frame", icon: Network },
];
const previewLessons = lessons.slice(0, 3).map((lesson, index) => ({
  ...lesson,
  ...previews[index],
  icon: previews[index]?.icon ?? BookOpen,
}));
export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="hero page-width">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" /> LEARN WHAT HAPPENS BETWEEN DEVICES
          </p>
          <h1>
            See networking <span>happen.</span>
          </h1>
          <p className="hero-description">
            Packets, switches, routers. Turn the things you can&apos;t see into
            the things you finally understand.
          </p>
          <div className="hero-actions">
            <Link href="/learn" className="button">
              Start learning <ArrowRight size={18} />
            </Link>
            <Link href="/labs/packet-journey" className="text-link">
              Follow a packet <ArrowUpRight size={17} />
            </Link>
          </div>
          <p className="hero-footnote">
            <Check size={15} /> Beginner friendly <span>·</span> No account
            needed
          </p>
        </div>
        <PacketPreview />
      </section>
      <div className="principles-strip">
        <div className="page-width principles-inner">
          <p>
            FROM &ldquo;WHAT IS IT?&rdquo;
            <br />
            <strong>TO &ldquo;I GET IT.&rdquo;</strong>
          </p>
          <span>
            <BookOpen size={20} /> Short, clear explanations
          </span>
          <span>
            <Route size={20} /> Ideas you can see
          </span>
          <span>
            <Lightbulb size={20} /> Questions that make it click
          </span>
        </div>
      </div>
      <section
        className="path-preview page-width"
        aria-labelledby="path-heading"
      >
        <div className="section-top">
          <div>
            <p className="eyebrow">YOUR FIRST FIVE CONNECTIONS</p>
            <h2 id="path-heading">Start small. Connect the dots.</h2>
          </div>
          <Link href="/learn" className="text-link">
            View all 5 lessons <ArrowRight size={17} />
          </Link>
        </div>
        <div className="lesson-preview-grid">
          {previewLessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={"/learn/" + lesson.slug}
              className="lesson-preview-card"
            >
              <div className="preview-card-top">
                <span className="lesson-number">
                  {String(lesson.order).padStart(2, "0")}
                </span>
                <lesson.icon size={24} />
              </div>
              <p className="tiny-label">{lesson.label}</p>
              <h3>{lesson.title}</h3>
              <p>{lesson.question}</p>
              <span className="card-open">
                Explore lesson <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
        <p className="path-preview-note">
          Then bring it together with <Link href="/learn/routers">Routers</Link>{" "}
          and <Link href="/learn/packet-travel">How a Packet Travels</Link>.
        </p>
      </section>
      <section
        id="how-it-works"
        className="how-section page-width"
        aria-labelledby="how-heading"
      >
        <div className="how-heading">
          <p className="eyebrow">UNDERSTANDING, ONE STEP AT A TIME</p>
          <h2 id="how-heading">
            Less memorizing.
            <br />
            More making sense.
          </h2>
          <p>
            Start with a question you actually have. Leave with an idea you can
            explain.
          </p>
        </div>
        <ol className="how-list">
          <li>
            <span>01</span>
            <div>
              <h3>Understand the idea</h3>
              <p>
                A focused explanation, in everyday language. No assumed
                networking background.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>See the connections</h3>
              <p>
                Follow a diagram to connect a new term to what a device actually
                does.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Make a prediction</h3>
              <p>
                Try a question, get an explanation, and take another shot.
                That&apos;s how it sticks.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section
        className="tools-preview page-width"
        aria-labelledby="tools-heading"
      >
        <div className="section-top">
          <div>
            <p className="eyebrow">TRY IT. CHANGE IT. UNDERSTAND IT.</p>
            <h2 id="tools-heading">A small network. Room to experiment.</h2>
          </div>
        </div>
        <div className="lesson-preview-grid">
          {[
            {
              href: "/labs/packet-journey",
              number: "01",
              title: "Packet Journey",
              copy: "Follow one packet across two networks. Inspect every decision, address, and table.",
              action: "Follow the journey",
            },
            {
              href: "/tools/subnet",
              number: "02",
              title: "Subnet Visualizer",
              copy: "Move the network boundary. See the bits, address ranges, and smaller subnets change.",
              action: "Explore an address",
            },
            {
              href: "/playground",
              number: "03",
              title: "Network Playground",
              copy: "Connect devices, configure their addresses, and discover why a packet arrives—or stops.",
              action: "Build a network",
            },
          ].map((tool) => (
            <Link
              className="lesson-preview-card"
              key={tool.href}
              href={tool.href}
            >
              <div className="preview-card-top">
                <span className="lesson-number">{tool.number}</span>
                <Network size={24} />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.copy}</p>
              <span className="card-open">
                {tool.action}
                <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
        <p className="path-preview-note">
          Ready to troubleshoot?{" "}
          <Link href="/labs/troubleshooting">Try the guided labs</Link> and use
          the packet trace to find what needs fixing.
        </p>
      </section>
      <section className="closing-section page-width">
        <div>
          <p className="eyebrow">YOUR NETWORKING JOURNEY STARTS HERE</p>
          <h2>One packet. A whole new perspective.</h2>
        </div>
        <Link href="/learn/network-basics" className="button">
          Take the first lesson <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
