"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = {
  username: string;
  role: string;
  permissions: string[];
};

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api
      .me()
      .then((res) => {
        setStatus("authenticated");
        setUser({ username: res.username, role: res.role, permissions: res.permissions ?? [] });
      })
      .catch(() => {
        setStatus("unauthenticated");
        setUser(null);
      });
  }, []);

  return { status, user };
}
