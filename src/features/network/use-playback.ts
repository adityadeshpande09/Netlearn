import { useEffect, useState } from "react";
export function usePlayback(count: number, resetKey: string) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(1600);
  const [previousKey, setPreviousKey] = useState(resetKey);
  if (previousKey !== resetKey) {
    setPreviousKey(resetKey);
    setIndex(0);
    setPlaying(false);
  }
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setTimeout(() => {
      if (index >= count - 2) setPlaying(false);
      setIndex((current) => Math.min(current + 1, count - 1));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [playing, index, count, duration]);
  function goTo(next: number) {
    setPlaying(false);
    setIndex(Math.min(count - 1, Math.max(0, next)));
  }
  function toggle() {
    if (index >= count - 1) setIndex(0);
    setPlaying((current) => !current);
  }
  function reset() {
    setPlaying(false);
    setIndex(0);
  }
  return { index, playing, duration, setDuration, goTo, toggle, reset };
}
