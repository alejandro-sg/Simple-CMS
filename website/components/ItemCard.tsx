import Link from "next/link";
import type { Item } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link href={`/shop/${item.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 mb-3">
        {item.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>
      <StatusBadge status={item.status} />
      <h3 className="font-medium mt-1 group-hover:underline">{item.title}</h3>
      {item.brand && <p className="text-sm text-gray-500">{item.brand}</p>}
      <p className="text-sm font-semibold mt-1">
        {item.price != null ? `$${item.price.toFixed(2)}` : "Price on request"}
      </p>
    </Link>
  );
}
