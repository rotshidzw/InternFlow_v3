"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      aria-label="Use dark theme"
      onClick={() => setTheme("dark")}
      className="if-btn if-btn-secondary if-btn-nav min-w-[112px] font-medium"
    >
      {!mounted ? "Theme" : "Dark Theme"}
    </button>
  );
}
