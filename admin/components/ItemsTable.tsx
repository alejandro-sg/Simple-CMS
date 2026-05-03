"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";
import { ConfirmDialog } from "./ConfirmDialog";
import { Toast } from "./Toast";

type SortKey = "title" | "status" | "updatedAt";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(price: number | null) {
  if (price === null) return "Upon request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

type Props = {
  items: Item[];
  onRefresh: () => void;
};

export function ItemsTable({ items, onRefresh }: Props) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const sorted = [...items].sort((a, b) => {
    let av: string = a[sortKey] as string;
    let bv: string = b[sortKey] as string;
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteItem(deleteId);
      setToast({ message: "Item deleted", type: "success" });
      onRefresh();
    } catch {
      setToast({ message: "Failed to delete item", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const deleteItem = items.find((i) => i.id === deleteId);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-20 px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                Photo
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("title")}
              >
                Title{sortIndicator("title")}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("status")}
              >
                Status{sortIndicator("status")}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                Publish
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                Price
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                Category
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wide text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => toggleSort("updatedAt")}
              >
                Updated{sortIndicator("updatedAt")}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-base text-gray-400">
                  No items yet.{" "}
                  <Link href="/inventory/new" className="text-gray-700 underline">
                    Add your first item
                  </Link>
                </td>
              </tr>
            )}
            {sorted.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/inventory/${item.id}`)}
              >
                <td className="px-4 py-4">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
                      ◻
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900 truncate max-w-48">{item.title}</div>
                  {item.brand && <div className="text-sm text-gray-400 mt-0.5">{item.brand}</div>}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge label={item.status} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge label={item.postStatus} />
                </td>
                <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                  {formatPrice(item.price)}
                </td>
                <td className="px-4 py-4 text-gray-500">{item.category || "—"}</td>
                <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                  {formatDate(item.updatedAt)}
                </td>
                <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium px-2.5 py-1.5 rounded hover:bg-gray-100"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="text-sm text-red-500 hover:text-red-700 font-medium px-2.5 py-1.5 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete item?"
        message={`"${deleteItem?.title}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
