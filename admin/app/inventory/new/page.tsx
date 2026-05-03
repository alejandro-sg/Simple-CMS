import Link from "next/link";
import { ItemForm } from "@/components/ItemForm";

export default function NewInventoryPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Inventory
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">New Item</h1>
      </div>
      <ItemForm />
    </div>
  );
}
