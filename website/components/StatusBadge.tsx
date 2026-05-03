type Status = "In Stock" | "Reserved" | "Sold";

const styles: Record<Status, string> = {
  "In Stock":  "bg-green-100 text-green-800",
  "Reserved":  "bg-yellow-100 text-yellow-800",
  "Sold":      "bg-gray-100 text-gray-500",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
