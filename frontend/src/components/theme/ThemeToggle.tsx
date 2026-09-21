"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "", showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle bright/dark mode"
        className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg border border-border bg-surface text-foreground-secondary flex items-center justify-center opacity-50 ${className}`}
        disabled
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Bright Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Bright Mode" : "Switch to Dark Mode"}
      className={`relative inline-flex items-center justify-center space-x-2 px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-lg border border-border bg-surface hover:bg-surface-secondary text-foreground hover:text-foreground transition-all duration-150 shadow-sm group ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-700 group-hover:-rotate-12 transition-transform duration-200" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Bright Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
};
