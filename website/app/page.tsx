import Link from "next/link";
import { getSiteContent, getItems, getApprovedReviews } from "@/lib/api";
import ItemCard from "@/components/ItemCard";

export default async function HomePage() {
  const [content, featuredItems, reviews] = await Promise.all([
    getSiteContent(),
    getItems({ featured: true, limit: 6 }),
    getApprovedReviews(),
  ]);

  const home = content?.home;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50 py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {home?.eyebrow && (
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              {home.eyebrow}
            </p>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {home?.headline ?? "Welcome"}
          </h1>
          {home?.description && (
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {home.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/shop"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              {home?.ctaPrimary ?? "Shop Now"}
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              {home?.ctaSecondary ?? "Contact Us"}
            </Link>
          </div>
          {home?.trustLine && (
            <p className="text-sm text-gray-500 mt-6">{home.trustLine}</p>
          )}
        </div>
      </section>

      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-2xl font-bold">
                {home?.featuredTitle ?? "Featured Items"}
              </h2>
              <Link href="/shop" className="text-sm text-gray-600 hover:text-black underline underline-offset-4">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      {home?.howItWorks && home.howItWorks.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-10 text-center">
              {home.howItWorksTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {home.howItWorks.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Curation / brand story blurb */}
      {home?.curationTitle && (
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">{home.curationTitle}</h2>
            {home.curationDetail && (
              <p className="text-gray-600">{home.curationDetail}</p>
            )}
          </div>
        </section>
      )}

      {/* Reviews/Testimonials */}
      {reviews.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-10 text-center">
              {home?.testimonialsTitle ?? "What customers say"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={i < review.rating ? "text-yellow-400" : "text-gray-200"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 mb-4 italic">"{review.feedback}"</p>
                  <p className="text-sm font-semibold">{review.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Local intent / store info */}
      {home?.storeInfo && (
        <section className="py-10 px-4 bg-black text-white text-center">
          <p className="text-sm">{home.storeInfo}</p>
          {home.visitCta && (
            <Link href="/contact" className="inline-block mt-3 text-sm underline underline-offset-4 hover:opacity-80">
              {home.visitCta}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
