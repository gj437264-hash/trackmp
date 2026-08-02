import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Drop this anywhere — e.g. next to "Sign Out" in PublicLayout's header nav,
 * and again in DashboardLayout's sidebar footer once that layout is updated.
 */
export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      data-testid="theme-toggle"
      className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 ${className}`}
    >
      {theme === "dark" ? (
        <Sun size={16} className="text-slate-400" />
      ) : (
        <Moon size={16} className="text-slate-600" />
      )}
    </button>
  );
}
