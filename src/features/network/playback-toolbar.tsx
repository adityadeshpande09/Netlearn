import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import type { usePlayback } from "./use-playback";
export function PlaybackToolbar({
  playback,
  count,
}: {
  playback: ReturnType<typeof usePlayback>;
  count: number;
}) {
  const event = count > 0;
  const last = playback.index === count - 1;
  return (
    <div className="simulation-toolbar">
      <div className="playback-buttons">
        <button
          className="button"
          type="button"
          disabled={!event}
          onClick={playback.toggle}
        >
          {playback.playing ? <Pause size={17} /> : <Play size={17} />}
          {playback.playing
            ? "Pause"
            : last
              ? "Replay journey"
              : playback.index
                ? "Continue"
                : "Send packet"}
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Previous simulation step"
          disabled={!event || playback.index === 0}
          onClick={() => playback.goTo(playback.index - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Next simulation step"
          disabled={!event || last}
          onClick={() => playback.goTo(playback.index + 1)}
        >
          <ChevronRight size={20} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Reset simulation"
          disabled={!event}
          onClick={playback.reset}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <div className="playback-speed">
        <label htmlFor="playback-speed">Speed</label>
        <select
          id="playback-speed"
          value={playback.duration}
          onChange={(change) =>
            playback.setDuration(Number(change.target.value))
          }
        >
          <option value={2600}>Slow</option>
          <option value={1600}>Normal</option>
          <option value={800}>Fast</option>
        </select>
      </div>
      <span className="simulation-step-count mono">
        {event
          ? "Step " + (playback.index + 1) + " / " + count
          : "Configure the network"}
      </span>
    </div>
  );
}
