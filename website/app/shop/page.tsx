import Link from "next/link";
import { getSiteContent, getItems } from "@/lib/api";
import ItemCard from "@/components/ItemCard";

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ShopPage({ searchParams }: Props) {
  const { category } = await searchParams;

  const [content, allItems] = await Promise.all([getSiteContent(), getItems()]);

  const shop = content?.shop;

  // Extract unique non-empty categories
  const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))];

  const items = category
    ? allItems.filter((i) => i.category === category)
    : allItems;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">{shop?.title ?? "Shop"}</h1>
        {shop?.description && (
          <p className="text-gray-600 max-w-2xl">{shop.description}</p>
        )}
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/shop"
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              !category
                ? "bg-black text-white border-black"
                : "border-gray-300 text-gray-700 hover:border-black"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/shop?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                category === cat
                  ? "bg-black text-white border-black"
                  : "border-gray-300 text-gray-700 hover:border-black"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {/* Items grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 py-16 text-center">
          {shop?.emptyMessage ?? "No items available right now — check back soon."}
        </p>
      )}
    </div>
  );
}
