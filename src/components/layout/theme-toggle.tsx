"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("netlearn-theme-change", notify);
  return () => window.removeEventListener("netlearn-theme-change", notify);
}
const snapshot = () => document.documentElement.dataset.theme === "dark";
const serverSnapshot = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function toggle() {
    const theme = snapshot() ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("netlearn-theme", theme);
    } catch {
      /* Theme still works when browser storage is unavailable. */
    }
    window.dispatchEvent(new Event("netlearn-theme-change"));
  }
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <Sun className="theme-sun" size={20} aria-hidden="true" />
      <Moon className="theme-moon" size={20} aria-hidden="true" />
    </button>
  );
}
