"use client";

import React from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col justify-center items-center p-4 relative transition-colors duration-150">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <AuthForm initialMode="signup" />
    </div>
  );
}
