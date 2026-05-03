"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;  // 8 hours
const WARN_BEFORE_MS  = 5 * 60 * 1000;        // warn 5 min before logout
const CHECK_INTERVAL  = 30_000;               // check every 30 s

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const lastActivity = useRef(Date.now());
  const [showWarning, setShowWarning]   = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(WARN_BEFORE_MS / 1000);

  const doLogout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    router.replace("/login?reason=timeout");
  }, [router]);

  const stayLoggedIn = useCallback(() => {
    lastActivity.current = Date.now();
    setShowWarning(false);
    setSecondsLeft(WARN_BEFORE_MS / 1000);
  }, []);

  // Track user activity
  useEffect(() => {
    if (pathname === "/login") return;
    const bump = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
  }, [pathname]);

  // Idle check loop
  useEffect(() => {
    if (pathname === "/login") return;

    const id = setInterval(() => {
      const idle = Date.now() - lastActivity.current;

      if (idle >= IDLE_TIMEOUT_MS) {
        clearInterval(id);
        doLogout();
        return;
      }

      const remaining = IDLE_TIMEOUT_MS - idle;
      if (remaining <= WARN_BEFORE_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(id);
  }, [pathname, doLogout]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/login") {
      router.replace("/login");
    }
  }, [status, router, pathname]);

  if (pathname === "/login") return <>{children}</>;
  if (status === "loading") return null;
  if (status === "unauthenticated") return null;

  return (
    <>
      {children}

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Session expiring soon
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              You&apos;ve been inactive for a while. For your security, you&apos;ll be
              signed out automatically.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-6">
              Signing out in{" "}
              <span className="tabular-nums">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={doLogout}
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Sign out now
              </button>
              <button
                onClick={stayLoggedIn}
                className="px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-700"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
