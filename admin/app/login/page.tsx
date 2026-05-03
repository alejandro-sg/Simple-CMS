"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timedOut = searchParams.get("reason") === "timeout";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password, requiresTOTP ? code : undefined);
      if (res.requiresTOTP) {
        setRequiresTOTP(true);
        setCode("");
      } else {
        // Hard navigate so the layout remounts and useAuth re-checks /me
        window.location.href = "/inventory";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("authenticator") || msg.includes("Invalid authenticator")) {
        setError("Invalid authenticator code — check your app and try again");
        setCode("");
      } else if (msg.includes("Too many")) {
        setError("Too many attempts — please wait a minute and try again");
      } else {
        setError("Incorrect username or password");
        setPassword("");
        setRequiresTOTP(false);
        setCode("");
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = username.length > 0 && password.length > 0 && (!requiresTOTP || code.length === 6);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Simple-CMS</h1>

      {timedOut && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          You were signed out due to inactivity.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            disabled={requiresTOTP}
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={requiresTOTP}
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter your password"
          />
        </div>

        {requiresTOTP && (
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
              Authenticator code
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              type="text"
              name="one-time-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base shadow-sm tracking-widest font-mono focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="000000"
            />
            <button
              type="button"
              onClick={() => { setRequiresTOTP(false); setCode(""); setError(""); }}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600"
            >
              ← Use a different account
            </button>
          </div>
        )}

        {error && <p className="text-base text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full rounded-md bg-gray-900 px-4 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : requiresTOTP ? "Verify" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm h-64" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
