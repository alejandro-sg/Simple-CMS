"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/types";
import { ALL_PERMISSIONS } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type NewUserForm = {
  username: string;
  password: string;
  role: "admin" | "user";
  permissions: string[];
};

const EMPTY_FORM: NewUserForm = { username: "", password: "", role: "user", permissions: [] };

export default function UsersPage() {
  const { status, user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // New user form
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // Permissions editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && currentUser?.role !== "admin") {
      router.replace("/inventory");
    }
  }, [status, currentUser, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.listUsers();
      setUsers(res.users ?? []);
    } catch {
      setError("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const created = await api.createUser(form);
      setUsers((prev) => [...prev, created]);
      setShowNew(false);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setFormError(msg.includes("unique") || msg.includes("UNIQUE") ? "Username already taken" : (msg || "Failed to create user"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditPerms([...u.permissions]);
  }

  async function savePermissions(id: string) {
    setSaving(true);
    try {
      const updated = await api.updateUser(id, { permissions: editPerms });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEditingId(null);
    } catch {
      alert("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteUser(deleteId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteId));
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      alert(msg || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  function togglePerm(perm: string, checked: boolean) {
    setEditPerms((prev) =>
      checked ? [...prev, perm] : prev.filter((p) => p !== perm)
    );
  }

  function toggleFormPerm(perm: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      permissions: checked ? [...f.permissions, perm] : f.permissions.filter((p) => p !== perm),
    }));
  }

  const deleteUser = users.find((u) => u.id === deleteId);

  if (status === "loading") return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          {!isLoading && (
            <p className="text-base text-gray-500 mt-0.5">{users.length} {users.length === 1 ? "user" : "users"}</p>
          )}
        </div>
        <button
          onClick={() => { setShowNew(true); setFormError(""); setForm(EMPTY_FORM); }}
          className="rounded-md bg-gray-900 px-4 py-2 text-base font-medium text-white hover:bg-gray-700"
        >
          + New User
        </button>
      </div>

      {/* New user form */}
      {showNew && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create new user</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_\-]+"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-500 focus:outline-none"
                  placeholder="letters, numbers, _ -"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={12}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-gray-500 focus:outline-none"
                  placeholder="Min. 12 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="flex gap-4">
                {(["user", "admin"] as const).map((r) => (
                  <label key={r} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={form.role === r}
                      onChange={() => setForm((f) => ({ ...f, role: r, permissions: r === "admin" ? [] : f.permissions }))}
                      className="accent-gray-900"
                    />
                    {r === "admin" ? "Admin (all permissions)" : "User (custom permissions)"}
                  </label>
                ))}
              </div>
            </div>

            {form.role === "user" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(key)}
                        onChange={(e) => toggleFormPerm(key, e.target.checked)}
                        className="accent-gray-900"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <div className="py-20 text-center text-gray-400">Loading…</div>}
      {error && <div className="py-20 text-center text-red-500">{error}</div>}

      {!isLoading && !error && (
        <div className="space-y-3">
          {users.map((u) => {
            const isEditing = editingId === u.id;
            const isSelf = u.username === currentUser?.username;
            return (
              <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-gray-900">{u.username}</span>
                        {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        Created {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {u.role !== "admin" && !isEditing && (
                      <button
                        onClick={() => startEdit(u)}
                        className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                      >
                        Edit permissions
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm text-gray-600 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => savePermissions(u.id)}
                          disabled={saving}
                          className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                      </>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => setDeleteId(u.id)}
                        className="text-sm text-red-400 hover:text-red-600 px-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions display / edit */}
                {u.role === "admin" ? (
                  <p className="mt-3 text-sm text-gray-500">Full access to all features</p>
                ) : (
                  <div className="mt-3">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPerms.includes(key)}
                              onChange={(e) => togglePerm(key, e.target.checked)}
                              className="accent-gray-900"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    ) : u.permissions.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No permissions assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.permissions.map((p) => {
                          const def = ALL_PERMISSIONS.find((x) => x.key === p);
                          return (
                            <span key={p} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                              {def?.label ?? p}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this user?"
        message={`"${deleteUser?.username}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
