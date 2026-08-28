import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRiskScore(score: number): { label: string; color: string; badge: string } {
  if (score >= 0.6) {
    return {
      label: "Critical Risk",
      color: "text-red-400",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }
  if (score > 0.25) {
    return {
      label: "Moderate Risk",
      color: "text-amber-300",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    };
  }
  return {
    label: "Low Risk",
    color: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
