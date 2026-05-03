import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-32 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 mb-8">This page doesn't exist.</p>
      <Link href="/" className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
        Go home
      </Link>
    </div>
  );
}
