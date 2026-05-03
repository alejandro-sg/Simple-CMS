import Link from "next/link";
import type { SiteContent } from "@/lib/types";

export default function Footer({ content }: { content: SiteContent | null }) {
  const brand = content?.brand;
  const nav = content?.nav;
  const location = content?.location;

  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <p className="font-semibold mb-2">{brand?.name ?? "Simple-CMS"}</p>
          {brand?.tagline && <p className="text-sm text-gray-600">{brand.tagline}</p>}
          {brand?.email && (
            <a href={`mailto:${brand.email}`} className="text-sm text-gray-600 hover:text-black block mt-2">
              {brand.email}
            </a>
          )}
        </div>
        <div>
          <p className="font-semibold mb-2 text-sm">Navigation</p>
          <ul className="space-y-1 text-sm text-gray-600">
            <li><Link href="/" className="hover:text-black">{nav?.home ?? "Home"}</Link></li>
            <li><Link href="/shop" className="hover:text-black">{nav?.shop ?? "Shop"}</Link></li>
            <li><Link href="/about" className="hover:text-black">{nav?.about ?? "About"}</Link></li>
            <li><Link href="/contact" className="hover:text-black">{nav?.contact ?? "Contact"}</Link></li>
          </ul>
        </div>
        <div>
          {location?.address && (
            <>
              <p className="font-semibold mb-2 text-sm">Visit us</p>
              <p className="text-sm text-gray-600">{location.address}</p>
              {location.hours && <p className="text-sm text-gray-600 mt-1">{location.hours}</p>}
            </>
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {brand?.name ?? "Simple-CMS"}. Powered by{" "}
        <a href="https://github.com/your-username/simple-cms" className="underline">Simple-CMS</a>.
      </div>
    </footer>
  );
}
