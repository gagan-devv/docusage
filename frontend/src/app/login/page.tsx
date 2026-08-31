"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { Mail, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestOtp(email.trim());
      setStep("otp");
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.verifyOtp(email.trim(), otpCode.trim());
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestOtp(demoEmail);
      const code = res.dev_otp || "123456";
      await api.verifyOtp(demoEmail, code);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Demo login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block">
            <Logo />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Enterprise Document Security & Auditing
          </h2>
          <p className="text-xs text-zinc-400">
            Sign in via Passwordless Email + OTP with dynamic seniority authorization
          </p>
        </div>

        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-6 shadow-2xl space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Work Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="counsel@acmelegal.com"
                    required
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-sans"
                  />
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                <span>{isLoading ? "Sending 6-Digit OTP..." : "Send Verification Code"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-zinc-300">Enter 6-Digit OTP Code</label>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-zinc-400 hover:text-zinc-200 text-[11px] underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-sm text-center tracking-widest text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                  />
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {devOtpHint && (
                  <p className="text-[11px] text-emerald-400 font-mono bg-emerald-950/30 p-1.5 rounded border border-emerald-800/40">
                    Dev Mode OTP Code: <strong>{devOtpHint}</strong>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                <span>{isLoading ? "Verifying & Issuing Tokens..." : "Verify & Sign In"}</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Quick Demo Role Switcher */}
          <div className="pt-3 border-t border-[#27272a] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Demo Personas (Pre-seeded RBAC):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin@docusage.ai")}
                className="p-2 rounded bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-left transition-colors"
              >
                <div className="font-medium text-zinc-200">Partner (Admin)</div>
                <div className="text-[10px] text-amber-400 font-mono">Priority 90 • Top Rank</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("senior@docusage.ai")}
                className="p-2 rounded bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-left transition-colors"
              >
                <div className="font-medium text-zinc-200">Senior Counsel</div>
                <div className="text-[10px] text-emerald-400 font-mono">Priority 70 • Senior</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("associate@docusage.ai")}
                className="p-2 rounded bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-left transition-colors"
              >
                <div className="font-medium text-zinc-200">Associate</div>
                <div className="text-[10px] text-blue-400 font-mono">Priority 40 • Mid-Level</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("junior@docusage.ai")}
                className="p-2 rounded bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-left transition-colors"
              >
                <div className="font-medium text-zinc-200">Junior Analyst</div>
                <div className="text-[10px] text-zinc-400 font-mono">Priority 20 • Junior</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-zinc-500 font-mono">
          Protected by 30-min Access Tokens & 7-day Refresh Tokens • Docusage Auth
        </div>
      </div>
    </div>
  );
}
