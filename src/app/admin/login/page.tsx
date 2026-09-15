"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, Lock, Mail, AlertCircle, Loader2, UserPlus } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user && !data.session) {
          setSuccessMsg(
            "Account registered! Please check your email inbox to confirm your account or sign in if email confirmation is disabled in Supabase."
          );
        } else {
          router.push("/admin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/admin");
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (msg.toLowerCase().includes("rate limit")) {
        setErrorMsg(
          "Supabase email rate limit exceeded (free tier allows ~3 confirmation emails/hr). Quick fix: In Supabase Dashboard → Authentication → Providers → Email, turn OFF 'Confirm email', or create the user directly in Authentication → Users with 'Auto Confirm' ON."
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-spoon-cream px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-8 sm:p-10 shadow-warm-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-spoon-sand border border-spoon-border text-spoon-caramel shadow-xs">
            <UtensilsCrossed className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
            Kitchen Admin Portal
          </h1>
          <p className="mt-1.5 text-xs text-spoon-muted">
            The Indulgent Spoon — Restaurant Management Console
          </p>
        </div>

        {/* Tab switch between Sign In and Create Account */}
        <div className="flex rounded-xl bg-spoon-sand/70 p-1 mb-6 border border-spoon-border/60">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              !isSignUp
                ? "bg-white text-spoon-dark shadow-xs"
                : "text-spoon-muted hover:text-spoon-dark"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              isSignUp
                ? "bg-white text-spoon-dark shadow-xs"
                : "text-spoon-muted hover:text-spoon-dark"
            }`}
          >
            Register Owner
          </button>
        </div>

        {/* Error / Success feedback */}
        {errorMsg && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 leading-relaxed">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 leading-relaxed">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-spoon-dark mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-spoon-muted" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@theindulgentspoon.com"
                required
                className="pl-10 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-spoon-dark mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-spoon-muted" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="pl-10 text-xs"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 text-xs uppercase tracking-wider font-bold py-3 shadow-warm-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Admin Account</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Demo instructions */}
        <div className="mt-6 rounded-2xl bg-spoon-sand/40 border border-spoon-border/60 p-3.5 text-center text-[11px] text-spoon-muted leading-relaxed">
          <span>Connected directly to Supabase Auth. Provide valid credentials or register an owner account above.</span>
        </div>

        <div className="mt-6 text-center text-xs text-spoon-muted">
          <Link
            href="/"
            className="hover:text-spoon-caramel transition-colors font-medium"
          >
            ← Return to Public Website
          </Link>
        </div>

      </div>
    </div>
  );
}
