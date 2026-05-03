"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ItemFormValues, Item } from "@/lib/types";
import { api } from "@/lib/api";
import { ImageUploader } from "./ImageUploader";
import { Toast } from "./Toast";

// Customize these categories for your business
const CATEGORIES = ["Category A", "Category B", "Category C"];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];
const STATUSES = ["In Stock", "Reserved", "Sold"] as const;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyForm = (): ItemFormValues => ({
  title: "",
  slug: "",
  brand: "",
  category: "",
  condition: "",
  type: "",
  description: "",
  status: "In Stock",
  postStatus: "Draft",
  quantity: 1,
  featured: false,
  price: null,
  dimensions: { width: null, depth: null, height: null, weight: null },
  date: null,
  images: [],
});

function itemToForm(item: Item): ItemFormValues {
  return {
    title: item.title,
    slug: item.slug,
    brand: item.brand,
    category: item.category,
    condition: item.condition,
    type: item.type,
    description: item.description,
    status: item.status,
    postStatus: item.postStatus,
    quantity: item.quantity,
    featured: item.featured,
    price: item.price,
    dimensions: item.dimensions,
    date: item.date,
    images: item.images,
  };
}

type Props = {
  item?: Item;
};

export function ItemForm({ item }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ItemFormValues>(item ? itemToForm(item) : emptyForm());
  const [slugManual, setSlugManual] = useState(!!item);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-generate slug from title unless user has manually edited it
  useEffect(() => {
    if (!slugManual) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugManual]);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDim(key: keyof ItemFormValues["dimensions"], value: string) {
    const num = value === "" ? null : parseFloat(value);
    setForm((f) => ({ ...f, dimensions: { ...f.dimensions, [key]: isNaN(num!) ? null : num } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await api.updateItem(item.id, form);
        setToast({ message: "Saved successfully", type: "success" });
      } else {
        const created = await api.createItem(form);
        setToast({ message: "Item created", type: "success" });
        router.replace(`/inventory/${created.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";
  const labelCls = "block text-base font-medium text-gray-700 mb-1";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* Basic Info */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Basic Info</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputCls}
                placeholder="e.g. My Item Title"
              />
            </div>
            <div>
              <label className={labelCls}>
                Slug{" "}
                <span className="text-xs text-gray-400 font-normal">
                  {slugManual ? "(manual)" : "(auto)"}
                </span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugManual(true); set("slug", e.target.value); }}
                className={inputCls}
                placeholder="url-slug"
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as typeof form.status)} className={inputCls}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Publish Status</label>
              <select value={form.postStatus} onChange={(e) => set("postStatus", e.target.value as "Draft" | "Published")} className={inputCls}>
                <option value="Draft">Draft — hidden from website</option>
                <option value="Published">Published — visible on website</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900"
            />
            <label htmlFor="featured" className="text-base text-gray-700">
              Featured — highlight this item
            </label>
          </div>
        </section>

        {/* Pricing & Inventory */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Pricing & Inventory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($) — leave blank for "Upon request"</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value === "" ? null : parseFloat(e.target.value))}
                className={inputCls}
                placeholder="450.00"
              />
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => set("quantity", parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Classification */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputCls}
                placeholder="e.g. Sofa, Coffee Table, Pendant"
              />
            </div>
            <div>
              <label className={labelCls}>Brand / Maker</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                className={inputCls}
                placeholder="e.g. Herman Miller, Unknown"
              />
            </div>
            <div>
              <label className={labelCls}>Condition</label>
              <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className={inputCls}>
                <option value="">Select condition…</option>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Details</h2>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
              placeholder="Describe the item — style, materials, history, special features…"
            />
          </div>
          <div>
            <label className={labelCls}>Date Listed (optional)</label>
            <input
              type="date"
              value={form.date ?? ""}
              onChange={(e) => set("date", e.target.value || null)}
              className={`${inputCls} max-w-xs`}
            />
          </div>
        </section>

        {/* Dimensions */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Dimensions (optional)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["width", "depth", "height"] as const).map((dim) => (
              <div key={dim}>
                <label className={labelCls}>{dim.charAt(0).toUpperCase() + dim.slice(1)} (in)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.dimensions[dim] ?? ""}
                  onChange={(e) => setDim(dim, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className={labelCls}>Weight (lb)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.dimensions.weight ?? ""}
                onChange={(e) => setDim("weight", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Images */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">Images</h2>
          <ImageUploader images={form.images} onChange={(imgs) => set("images", imgs)} itemName={form.title} />
        </section>

        {/* Submit */}
        <div className="flex items-center gap-4 pb-12">
          <button
            type="submit"
            disabled={saving || !form.title}
            className="rounded-md bg-gray-900 px-6 py-3 text-base font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : item ? "Save Changes" : "Create Item"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/inventory")}
            className="rounded-md border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
