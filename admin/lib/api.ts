import type { AdminUser, ItemFormValues, Item, Review, SiteContent } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: isFormData
      ? options?.headers
      : { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || text || res.statusText);
    } catch {
      throw new Error(text || res.statusText);
    }
  }
  return res.json();
}

export const api = {
  login(username: string, password: string, code?: string) {
    return apiFetch<{ ok?: boolean; requiresTOTP?: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, code }),
    });
  },

  logout() {
    return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },

  me() {
    return apiFetch<{ ok: boolean; username: string; role: string; permissions: string[] }>("/api/auth/me");
  },

  // User management (admin only)
  listUsers() {
    return apiFetch<{ users: AdminUser[] }>("/api/admin/users");
  },

  createUser(data: { username: string; password: string; role: string; permissions: string[] }) {
    return apiFetch<AdminUser>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateUser(id: string, data: { permissions?: string[]; password?: string }) {
    return apiFetch<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteUser(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" });
  },

  listPermissions() {
    return apiFetch<{ permissions: string[] }>("/api/admin/users/permissions");
  },

  listItems() {
    return apiFetch<{ items: Item[] }>("/api/admin/items");
  },

  getItem(id: string) {
    return apiFetch<Item>(`/api/admin/items/${id}`);
  },

  createItem(data: ItemFormValues) {
    return apiFetch<Item>("/api/admin/items", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateItem(id: string, data: ItemFormValues) {
    return apiFetch<Item>(`/api/admin/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteItem(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/admin/items/${id}`, {
      method: "DELETE",
    });
  },

  downloadTemplate() {
    window.open(`${API}/api/admin/items/template`, "_blank");
  },

  importCSV(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ created: number; total: number; results: { row: number; title: string; error?: string; id?: string }[] }>(
      "/api/admin/items/import",
      { method: "POST", body: form }
    );
  },

  listReviews() {
    return apiFetch<{ reviews: Review[] }>("/api/admin/reviews");
  },

  updateReviewStatus(id: string, status: "New" | "Approved" | "Rejected" | "Archived") {
    return apiFetch<Review>(`/api/admin/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  deleteReview(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: "DELETE" });
  },

  totpStatus() {
    return apiFetch<{ enabled: boolean }>("/api/auth/totp/status");
  },

  totpSetup() {
    return apiFetch<{ secret: string; url: string }>("/api/auth/totp/setup");
  },

  totpConfirm(code: string) {
    return apiFetch<{ ok: boolean }>("/api/auth/totp/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  totpDisable(code: string) {
    return apiFetch<{ ok: boolean }>("/api/auth/totp/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  // Site content
  getSiteContentDraft() {
    return apiFetch<SiteContent>("/api/admin/site-content/draft");
  },

  saveSiteContentDraft(data: SiteContent) {
    return apiFetch<{ ok: boolean }>("/api/admin/site-content/draft", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  publishSiteContent() {
    return apiFetch<{ ok: boolean }>("/api/admin/site-content/publish", {
      method: "POST",
    });
  },

  uploadImage(file: File, itemName?: string) {
    const form = new FormData();
    form.append("image", file);
    if (itemName) form.append("itemName", itemName);
    return apiFetch<{ publicUrl: string }>("/api/admin/upload", {
      method: "POST",
      body: form,
    });
  },
};
