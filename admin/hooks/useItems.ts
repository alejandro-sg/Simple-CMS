"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { Item } from "@/lib/types";

export function useItems() {
  const { data, error, isLoading, mutate } = useSWR<{ items: Item[] }>(
    "/api/admin/items",
    () => api.listItems(),
    { revalidateOnFocus: false }
  );

  return {
    items: data?.items ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
