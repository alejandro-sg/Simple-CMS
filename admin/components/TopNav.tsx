"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();

  if (pathname === "/login") return null;

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.push("/login");
    }
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-gray-600 hover:text-gray-900 ${pathname.startsWith(href) ? "font-medium text-gray-900" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-base tracking-wide">Simple-CMS</span>
        <nav className="flex items-center gap-6 text-base">
          {navLink("/inventory", "Items")}
          {navLink("/reviews", "Reviews")}
          {(user?.role === "admin" || user?.permissions?.includes("content:write")) &&
            navLink("/site-content", "Site Content")}
          {user?.role === "admin" && navLink("/users", "Users")}
          {navLink("/settings", "Settings")}
          {status === "authenticated" && (
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900"
            >
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
