"use client";

import Link from "next/link";
import { useItems } from "@/hooks/useItems";
import { ItemsTable } from "@/components/ItemsTable";

export default function InventoryListPage() {
  const { items, isLoading, error, refresh } = useItems();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Items</h1>
          {!isLoading && (
            <p className="text-base text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/import"
            className="rounded-md border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            ↑ Import CSV
          </Link>
          <Link
            href="/inventory/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-base font-medium text-white hover:bg-gray-700"
          >
            + New Item
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-gray-400 text-base">Loading…</div>
      )}
      {error && (
        <div className="py-20 text-center text-red-500 text-base">Failed to load items. Is the API running?</div>
      )}
      {!isLoading && !error && (
        <ItemsTable items={items} onRefresh={refresh} />
      )}
    </div>
  );
}
