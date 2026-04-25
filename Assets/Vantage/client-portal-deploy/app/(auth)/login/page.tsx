"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "27manryan@gmail.com";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Full-page navigation so the middleware sees the freshly-set auth cookie
      // on the very next request. router.push races the cookie write.
      window.location.href = email === ADMIN_EMAIL ? "/admin" : "/dashboard";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected sign-in error.";
      setError(message);
      console.error("[login] sign-in failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setError("Enter your email above, then tap Forgot Password.");
      return;
    }
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setResetSent(true);
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Logo / Wordmark */}
          <div className="text-center mb-12">
            <p className="label mb-3">Client Portal</p>
            <h1 className="font-serif text-4xl font-semibold text-navy tracking-tight">
              Vantage Strategic<br />Communications
            </h1>
            <div className="mt-4 mx-auto w-12 h-px bg-gold" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {error && (
              <div className="bg-[#FFF3F3] border border-[#E8C4C4] px-4 py-3">
                <p className="text-xs text-[#7A3030]">{error}</p>
              </div>
            )}
            {resetSent && !error && (
              <div className="bg-[#F3F7F0] border border-[#C4D8BE] px-4 py-3">
                <p className="text-xs text-[#3A5A30]">
                  Check your inbox for a password reset link.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="label block mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label block mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>

            {/* Forgot password ghost link */}
            <div className="text-center pt-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleReset}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center border-t border-[#ECE8E0]">
        <p className="text-xs text-muted">
          © 2026 Vantage Strategic Communications
        </p>
      </footer>
    </div>
  );
}
