import { notFound } from "next/navigation";
import Link from "next/link";
import { getSiteContent, getItemBySlug, getItems } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const items = await getItems();
  return items.map((item) => ({ slug: item.slug }));
}

export default async function ItemPage({ params }: Props) {
  const { slug } = await params;

  const [item, content] = await Promise.all([
    getItemBySlug(slug),
    getSiteContent(),
  ]);

  if (!item) notFound();

  const shop = content?.shop;
  const smsBody = (shop?.smsTemplate ?? "Hi, I want to order {item}.")
    .replace("{item}", item.title)
    .replace("{price}", item.price != null ? `$${item.price.toFixed(2)}` : "");

  const hasDimensions =
    item.dimensions.width ||
    item.dimensions.depth ||
    item.dimensions.height ||
    item.dimensions.weight;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black mb-8"
      >
        ← {content?.nav?.shop ?? "Back to shop"}
      </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            {item.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
          {item.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {item.images.slice(1, 5).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img}
                  alt={`${item.title} ${i + 2}`}
                  className="aspect-square object-cover rounded-lg bg-gray-100"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <StatusBadge status={item.status} />
          <h1 className="text-2xl font-bold mt-3 mb-1">{item.title}</h1>
          <p className="text-xl font-semibold mb-4">
            {item.price != null ? `$${item.price.toFixed(2)}` : "Price on request"}
          </p>

          <dl className="text-sm text-gray-600 space-y-1 mb-6">
            {item.brand && <div><dt className="inline font-medium">Brand: </dt><dd className="inline">{item.brand}</dd></div>}
            {item.category && <div><dt className="inline font-medium">Category: </dt><dd className="inline">{item.category}</dd></div>}
            {item.condition && <div><dt className="inline font-medium">Condition: </dt><dd className="inline">{item.condition}</dd></div>}
            {item.type && <div><dt className="inline font-medium">Type: </dt><dd className="inline">{item.type}</dd></div>}
          </dl>

          {item.description && (
            <p className="text-gray-700 mb-6 leading-relaxed">{item.description}</p>
          )}

          {hasDimensions && (
            <div className="text-sm text-gray-600 mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">Dimensions</p>
              <div className="flex gap-4">
                {item.dimensions.width && <span>W: {item.dimensions.width}&Prime;</span>}
                {item.dimensions.depth && <span>D: {item.dimensions.depth}&Prime;</span>}
                {item.dimensions.height && <span>H: {item.dimensions.height}&Prime;</span>}
                {item.dimensions.weight && <span>{item.dimensions.weight} lb</span>}
              </div>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-6">
              {item.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTAs */}
          {item.status !== "Sold" ? (
            <div className="space-y-3">
              {shop?.smsNumber && (
                <a
                  href={`sms:${shop.smsNumber}&body=${encodeURIComponent(smsBody)}`}
                  className="flex items-center justify-center w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  {shop.smsCta ?? "Order by text"}
                </a>
              )}
              {content?.brand?.email && (
                <a
                  href={`mailto:${content.brand.email}?subject=${encodeURIComponent(`Inquiry: ${item.title}`)}`}
                  className="flex items-center justify-center w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {shop?.emailCta ?? "Order by email"}
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 text-sm py-2">This item has been sold.</p>
              {content?.brand?.email && (
                <a
                  href={`mailto:${content.brand.email}?subject=${encodeURIComponent(`Similar item inquiry: ${item.title}`)}`}
                  className="flex items-center justify-center w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {shop?.similarCta ?? "Ask about similar items"}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
