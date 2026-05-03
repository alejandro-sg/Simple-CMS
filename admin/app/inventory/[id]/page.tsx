"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Item } from "@/lib/types";
import { ItemForm } from "@/components/ItemForm";

export default function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getItem(id)
      .then(setItem)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading…</div>;
  }
  if (notFound || !item) {
    return (
      <div className="py-20 text-center text-sm text-red-500">
        Item not found.{" "}
        <Link href="/inventory" className="underline text-gray-700">
          Back to Inventory
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Inventory
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2 truncate">{item.title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">ID: {item.id}</p>
      </div>
      <ItemForm item={item} />
    </div>
  );
}
