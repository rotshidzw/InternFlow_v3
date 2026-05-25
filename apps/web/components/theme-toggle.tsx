"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="if-btn if-btn-secondary min-w-[108px] px-3 py-1.5 text-xs font-medium"
    >
      {!mounted ? "Theme" : isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
