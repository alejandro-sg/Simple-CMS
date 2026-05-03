import Link from "next/link";
import type { SiteContent } from "@/lib/types";

export default function Nav({ content }: { content: SiteContent | null }) {
  const brand = content?.brand?.name ?? "Simple-CMS";
  const nav = content?.nav;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          {brand}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-gray-600 hover:text-black transition-colors">
            {nav?.home ?? "Home"}
          </Link>
          <Link href="/shop" className="text-gray-600 hover:text-black transition-colors">
            {nav?.shop ?? "Shop"}
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-black transition-colors">
            {nav?.about ?? "About"}
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            {nav?.contact ?? "Contact"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
