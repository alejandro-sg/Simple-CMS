import { getSiteContent } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const content = await getSiteContent();
  const about = content?.about;
  const brand = content?.brand;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold mb-6">{about?.title ?? "About Us"}</h1>

      {about?.intro && (
        <p className="text-lg text-gray-700 mb-8 leading-relaxed">{about.intro}</p>
      )}

      {about?.story && (
        <p className="text-gray-600 mb-10 leading-relaxed">{about.story}</p>
      )}

      {about?.values && about.values.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">{about.valuesTitle ?? "What guides us"}</h2>
          <ul className="space-y-2">
            {about.values.map((v, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {about?.ownersTitle && (
        <div className="pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-3">{about.ownersTitle}</h2>
          {about.ownersDescription && (
            <p className="text-gray-600">{about.ownersDescription}</p>
          )}
        </div>
      )}

      {brand?.tagline && (
        <blockquote className="mt-12 text-lg italic text-gray-500 border-l-2 border-gray-300 pl-4">
          "{brand.tagline}"
        </blockquote>
      )}
    </div>
  );
}
