"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg border border-slate-300/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-100"
    >
      {isDark ? "☀️ Light" : "🌙 Dim"}
    </button>
  );
}
