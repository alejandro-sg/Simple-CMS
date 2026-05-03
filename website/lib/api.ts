import type { Item, Review, SiteContent } from "./types";

const API = process.env.API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export async function getSiteContent(): Promise<SiteContent | null> {
  try {
    return await apiFetch<SiteContent>("/api/site-content", {
      next: { revalidate: 3600 },
    });
  } catch {
    return null;
  }
}

export async function getItems(params?: {
  featured?: boolean;
  limit?: number;
  category?: string;
}): Promise<Item[]> {
  const q = new URLSearchParams();
  if (params?.featured) q.set("featured", "true");
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.category) q.set("category", params.category);
  const qs = q.toString();
  try {
    const data = await apiFetch<{ items: Item[] }>(
      `/api/items${qs ? `?${qs}` : ""}`,
      { next: { revalidate: 60 } }
    );
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function getItemBySlug(slug: string): Promise<Item | null> {
  try {
    return await apiFetch<Item>(`/api/items/${slug}`, {
      next: { revalidate: 60 },
    });
  } catch {
    return null;
  }
}

export async function getApprovedReviews(): Promise<Review[]> {
  try {
    const data = await apiFetch<{ reviews: Review[] }>("/api/reviews", {
      next: { revalidate: 3600 },
    });
    return data.reviews ?? [];
  } catch {
    return [];
  }
}
