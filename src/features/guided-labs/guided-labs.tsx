"use client";

import { useMemo, useState, type FormEvent } from "react";
import { guidedLabs, type GuidedLab } from "@/content/guided-labs";
import {
  applyGuidedRepair,
  createGuidedScenario,
} from "@/domain/networking/guided-scenarios";
import { simulatePacket } from "@/domain/networking/simulator";
import { SimulationSession } from "@/features/network/simulation-session";
import "./guided-labs.css";

export function GuidedLabs() {
  const [labId, setLabId] = useState(guidedLabs[0]!.id);
  const lab = guidedLabs.find((candidate) => candidate.id === labId)!;

  return (
    <div className="guided-labs">
      <div className="guided-lab-picker">
        <label htmlFor="guided-lab">Choose an exercise</label>
        <select
          id="guided-lab"
          value={lab.id}
          onChange={(event) => {
            const next = guidedLabs.find(
              (candidate) => candidate.id === event.target.value,
            );
            if (next) setLabId(next.id);
          }}
          aria-describedby="guided-lab-storage"
        >
          {guidedLabs.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.title}
            </option>
          ))}
        </select>
        <p id="guided-lab-storage">
          Practice stays on this page. Changing exercises or leaving the page
          clears attempts; these labs do not mark lessons complete.
        </p>
      </div>
      <GuidedExercise key={lab.id} lab={lab} />
    </div>
  );
}

function GuidedExercise({ lab }: { lab: GuidedLab }) {
  const [selectedId, setSelectedId] = useState("");
  const [attempt, setAttempt] = useState<{
    choiceId: string;
    count: number;
  } | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [trace, setTrace] = useState<"original" | "repair">("original");
  const baseline = useMemo(() => createGuidedScenario(lab.id), [lab.id]);
  const originalResult = useMemo(() => simulatePacket(baseline), [baseline]);
  const originalEnd = originalResult.events.at(-1);
  const appliedChoice = lab.choices.find(
    (choice) => choice.id === attempt?.choiceId,
  );
  const scenario = useMemo(
    () =>
      appliedChoice
        ? applyGuidedRepair(lab.id, appliedChoice.repair)
        : baseline,
    [appliedChoice, baseline, lab.id],
  );
  const result = useMemo(() => simulatePacket(scenario), [scenario]);
  const finalEvent = result.events.at(-1);

  function runRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lab.choices.some((choice) => choice.id === selectedId)) return;
    setAttempt((previous) => ({
      choiceId: selectedId,
      count: (previous?.count ?? 0) + 1,
    }));
    setTrace("repair");
  }

  function resetExercise() {
    setAttempt(null);
    setSelectedId("");
    setResetCount((value) => value + 1);
    setTrace("original");
  }

  return (
    <>
      <section className="guided-brief" aria-labelledby="guided-objective">
        <p className="eyebrow">INVESTIGATE · CHANGE ONE THING · TEST</p>
        <h2 id="guided-objective">{lab.title}</h2>
        <p>{lab.objective}</p>
        <p>{lab.investigation}</p>
        <a className="text-link" href="#guided-trace">
          Inspect the trace below ↓
        </a>
        <div className="guided-original">
          <h3>Original failure</h3>
          <p>{originalEnd?.explanation}</p>
        </div>
        <details className="guided-hints" key={resetCount}>
          <summary>Hint 1: where to look</summary>
          <p>{lab.hints[0]}</p>
          <details>
            <summary>Hint 2: narrow it down</summary>
            <p>{lab.hints[1]}</p>
          </details>
        </details>
      </section>

      <form className="guided-repair" onSubmit={runRepair}>
        <fieldset aria-describedby="guided-repair-note">
          <legend>Choose one repair to test</legend>
          <p id="guided-repair-note">
            Each test applies just this change to the original broken network.
            Earlier repairs never carry over.
          </p>
          <div className="guided-choices">
            {lab.choices.map((choice) => (
              <label key={choice.id} className="guided-choice">
                <input
                  type="radio"
                  name="repair"
                  value={choice.id}
                  required
                  checked={selectedId === choice.id}
                  onChange={() => setSelectedId(choice.id)}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="guided-actions">
          <button type="submit" className="button">
            Test repair
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={resetExercise}
          >
            Reset exercise
          </button>
        </div>
      </form>

      <div
        className={
          "guided-feedback " +
          (attempt && result.outcome === "delivered" ? "guided-delivered" : "")
        }
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {attempt && appliedChoice ? (
          <>
            <h3>
              Attempt {attempt.count}:{" "}
              {result.outcome === "delivered"
                ? "packet delivered"
                : result.outcome === "dropped"
                  ? "delivery still stopped"
                  : "configuration needs attention"}
            </h3>
            <p>Tested: {appliedChoice.label}.</p>
            <p>{finalEvent?.explanation ?? result.errors.join(" ")}</p>
            <p>{appliedChoice.explanation}</p>
            <p>
              {result.outcome === "delivered"
                ? "Inspect the repaired trace to see why it works, or reset the exercise to investigate again."
                : "Follow the trace below, then try another repair."}
            </p>
          </>
        ) : (
          <p>
            {resetCount > 0
              ? "Exercise reset. The original fault is restored and attempts are cleared."
              : "The original broken network is ready to inspect. Choose a repair when you have a hypothesis."}
          </p>
        )}
      </div>

      <section aria-labelledby="guided-trace">
        <div className="guided-trace-heading">
          <p className="eyebrow">FOLLOW THE EVIDENCE</p>
          <h2 id="guided-trace" tabIndex={-1}>
            {trace === "repair"
              ? "Trace after your repair"
              : "Original network trace"}
          </h2>
          <p>
            Use the step buttons or timeline to inspect each event. The packet
            inspector shows the headers at that step. Playback reset rewinds
            this trace; Reset exercise restores the original fault.
          </p>
          {attempt && (
            <div className="guided-lab-picker guided-trace-picker">
              <label htmlFor="guided-trace-select">Trace to inspect</label>
              <select
                id="guided-trace-select"
                value={trace}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "original" || value === "repair")
                    setTrace(value);
                }}
              >
                <option value="original">Original network</option>
                <option value="repair">Latest repair</option>
              </select>
              <p>
                Switch traces to compare the evidence without clearing your
                attempt.
              </p>
            </div>
          )}
        </div>
        <SimulationSession
          key={`${resetCount}-${attempt?.count ?? 0}-${trace}`}
          scenario={trace === "repair" ? scenario : baseline}
        />
      </section>
      <details className="lab-model-notes">
        <summary>About these exercises</summary>
        <p>
          Each exercise tests one ICMP echo request from PC-A to PC-B using the
          same simulation as Packet Journey. Delivery means the request reaches
          PC-B; no echo reply or real network traffic is modeled. Every attempt
          starts with empty ARP and MAC tables. Hints explain these specific
          scenarios, not every possible cause of a real network failure.
        </p>
      </details>
    </>
  );
}
