"use client";
import { useEffect, useRef, useState } from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import {
  Laptop,
  Network,
  Router,
  Server,
  Play,
  Pause,
  RotateCcw,
  Check,
} from "lucide-react";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion-preference";

const stops = [
  {
    name: "Your laptop",
    detail: "The journey starts here",
    icon: Laptop,
    x: 135,
    y: 90,
    label: "A message leaves your device.",
    explanation: "Your laptop sends data inside an Ethernet frame.",
  },
  {
    name: "Switch",
    detail: "Connects local devices",
    icon: Network,
    x: 405,
    y: 90,
    label: "The switch forwards the frame.",
    explanation:
      "A switch uses the destination MAC address to forward within the local network.",
  },
  {
    name: "Router",
    detail: "Connects networks",
    icon: Router,
    x: 135,
    y: 230,
    label: "The router selects the next network.",
    explanation:
      "A router uses the destination IP address to choose where to forward the packet.",
  },
  {
    name: "Server",
    detail: "The destination",
    icon: Server,
    x: 405,
    y: 230,
    label: "The data reaches the server.",
    explanation:
      "The destination can receive the data. A reply makes its own return journey.",
  },
] as const;
export function PacketPreview() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const liveReducedMotion = useReducedMotionPreference();
  const reduce = liveReducedMotion || systemReducedMotion === null;
  const current = stops[step] ?? stops[0];
  const done = step === stops.length - 1;
  const [scope, animate] = useAnimate<SVGCircleElement>();
  const active = useRef<ReturnType<typeof animate> | null>(null);
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    if (!reduce || !active.current) return;
    const timer = window.setTimeout(() => {
      generation.current++;
      active.current?.stop();
      active.current = null;
      animate(
        scope.current,
        { cx: [405, 405], cy: [230, 230] },
        { duration: 0 },
      ).complete();
      setStep(3);
      setPlaying(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reduce, animate, scope]);

  function reset() {
    generation.current++;
    active.current?.stop();
    active.current = null;
    animate(
      scope.current,
      { cx: [135, 135], cy: [90, 90] },
      { duration: 0 },
    ).complete();
    setStarted(false);
    setStep(0);
    setPlaying(false);
  }

  async function run() {
    const token = generation.current;
    setStarted(true);
    setPlaying(true);
    // These are presentation keyframes for a fixed concept preview, not a simulation engine.
    const hops = [
      { cx: [135, 405], cy: [90, 90], duration: 0.65 },
      {
        cx: [405, 525, 525, 15, 15, 135],
        cy: [90, 90, 180, 180, 230, 230],
        duration: 1.1,
      },
      { cx: [135, 405], cy: [230, 230], duration: 0.65 },
    ];
    for (const [index, hop] of hops.entries()) {
      const playback = animate(
        scope.current,
        { cx: hop.cx, cy: hop.cy },
        { duration: hop.duration, delay: 0.55, ease: "easeInOut" },
      );
      active.current = playback;
      await playback;
      if (token !== generation.current) return;
      setStep(index + 1);
    }
    active.current = null;
    setPlaying(false);
  }

  function play() {
    if (reduce) {
      generation.current++;
      active.current?.stop();
      active.current = null;
      animate(
        scope.current,
        { cx: [405, 405], cy: [230, 230] },
        { duration: 0 },
      ).complete();
      setStep(3);
      setPlaying(false);
    } else if (playing) {
      active.current?.pause();
      setPlaying(false);
    } else if (active.current) {
      active.current.play();
      setPlaying(true);
    } else {
      if (done) reset();
      void run();
    }
  }
  return (
    <section
      id="packet-demo"
      className="packet-preview"
      aria-label="Animated packet preview"
    >
      <div className="packet-bar">
        <span>
          <span className="status-dot" /> A PACKET&apos;S JOURNEY
        </span>
        <span className="mono">01 — 04</span>
      </div>
      <div
        className="network-canvas"
        role="img"
        aria-label="Simplified path: your laptop, a switch, a router, then a server."
      >
        <svg
          className="network-wires"
          viewBox="0 0 540 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M135 90H525V180H15V230H405"
            fill="none"
            stroke="var(--network-line)"
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          <circle
            ref={scope}
            cx={135}
            cy={90}
            r="6"
            fill="var(--network-accent)"
          />
        </svg>
        {stops.map((stop, index) => {
          const Icon = stop.icon;
          return (
            <div
              key={stop.name}
              className={
                "network-stop " +
                (index <= step ? "is-reached" : "") +
                (index === step ? " is-current" : "")
              }
              style={{
                left: (stop.x / 540) * 100 + "%",
                top: (stop.y / 320) * 100 + "%",
              }}
              aria-hidden="true"
            >
              <div className="network-device">
                <Icon size={27} strokeWidth={1.6} />
                <span className="stop-number">{index + 1}</span>
              </div>
              <strong>{stop.name}</strong>
              <span>{stop.detail}</span>
            </div>
          );
        })}
      </div>
      <div className="packet-caption" aria-live="polite" aria-atomic="true">
        <span className="packet-step">
          {done ? <Check size={16} /> : String(step + 1).padStart(2, "0")}
        </span>
        <div>
          <strong>{current.label}</strong>
          <p>{current.explanation}</p>
        </div>
      </div>
      <div className="packet-controls">
        <button type="button" className="button button-inverse" onClick={play}>
          {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
          {playing
            ? "Pause"
            : done
              ? "Send again"
              : started
                ? "Continue"
                : "Send a packet"}
        </button>
        <button
          type="button"
          className="packet-reset"
          onClick={reset}
          aria-label="Reset packet preview"
        >
          <RotateCcw size={17} />
        </button>
        <span className="packet-note">Simplified concept preview</span>
      </div>
    </section>
  );
}
