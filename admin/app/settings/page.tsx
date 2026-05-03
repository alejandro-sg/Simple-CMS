"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";

type Phase =
  | "loading"
  | "disabled"       // TOTP not set up
  | "setup"          // showing QR + waiting for first code
  | "confirming"     // verifying the first code
  | "enabled"        // TOTP active
  | "disabling";     // asking for current code to turn off

export default function SettingsPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [setupData, setSetupData] = useState<{ secret: string; url: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.totpStatus().then((s) => setPhase(s.enabled ? "enabled" : "disabled"));
  }, []);

  useEffect(() => {
    if ((phase === "setup" || phase === "disabling") && codeRef.current) {
      codeRef.current.focus();
    }
  }, [phase]);

  async function startSetup() {
    setError("");
    setSaving(true);
    try {
      const data = await api.totpSetup();
      setSetupData(data);
      const url = await QRCode.toDataURL(data.url, { width: 200, margin: 1 });
      setQrDataUrl(url);
      setCode("");
      setPhase("setup");
    } catch {
      setError("Failed to generate setup code. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmSetup() {
    setError("");
    setSaving(true);
    setPhase("confirming");
    try {
      await api.totpConfirm(code);
      setPhase("enabled");
      setSetupData(null);
      setQrDataUrl("");
      setCode("");
    } catch {
      setError("Code is incorrect — make sure your phone's time is in sync and try again.");
      setPhase("setup");
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    setError("");
    setSaving(true);
    try {
      await api.totpDisable(code);
      setPhase("disabled");
      setCode("");
    } catch {
      setError("Incorrect code.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Two-factor authentication (TOTP)
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Require a code from an authenticator app (Google Authenticator, Authy, 1Password, etc.)
          in addition to your password when signing in.
        </p>

        {phase === "loading" && (
          <p className="text-sm text-gray-400">Loading…</p>
        )}

        {phase === "disabled" && (
          <button
            onClick={startSetup}
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Setting up…" : "Enable two-factor auth"}
          </button>
        )}

        {(phase === "setup" || phase === "confirming") && setupData && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                1. Scan this QR code with your authenticator app
              </p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="TOTP QR code" className="rounded border border-gray-200" width={200} height={200} />
              )}
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Can't scan? Enter the secret manually
                </summary>
                <code className="mt-1 block text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all select-all">
                  {setupData.secret}
                </code>
              </details>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2. Enter the 6-digit code from your app to confirm
              </label>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirmSetup()}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono tracking-widest w-36 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="000000"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={confirmSetup}
                disabled={saving || code.length !== 6}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Verifying…" : "Activate"}
              </button>
              <button
                onClick={() => { setPhase("disabled"); setSetupData(null); setError(""); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {phase === "enabled" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Enabled
              </span>
            </div>
            <button
              onClick={() => { setPhase("disabling"); setCode(""); setError(""); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Disable two-factor auth
            </button>
          </div>
        )}

        {phase === "disabling" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter your current authenticator code to disable 2FA
              </label>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && disable()}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono tracking-widest w-36 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={disable}
                disabled={saving || code.length !== 6}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Disabling…" : "Disable 2FA"}
              </button>
              <button
                onClick={() => { setPhase("enabled"); setError(""); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
