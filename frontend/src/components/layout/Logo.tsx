import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ size = "md" }) => {
  const iconSize = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <Link href="/" className="flex items-center space-x-2.5 group">
      {/* Origami Parchment / Folded Sage Leaf Geometric Icon */}
      <div className="relative flex items-center justify-center rounded bg-[#18181b] border border-[#27272a] p-1.5 transition-colors group-hover:border-zinc-500">
        <svg
          className={`${iconSize} text-zinc-100 transition-transform group-hover:scale-105`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized geometric parchment document with origami fold */}
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H16l5 5v12.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 19.5Z" />
          <path d="M16 2v5h5" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
          <path d="m14 17 2.5 2.5 4.5-4.5" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex items-center space-x-1.5">
        <span className={`font-semibold tracking-tight ${textSize} text-zinc-100`}>
          docusage
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          AI
        </span>
      </div>
    </Link>
  );
};
