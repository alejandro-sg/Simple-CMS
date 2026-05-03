const statusColors: Record<string, string> = {
  "In Stock": "bg-green-100 text-green-800",
  Reserved: "bg-yellow-100 text-yellow-800",
  Sold: "bg-gray-100 text-gray-600",
  Published: "bg-blue-100 text-blue-700",
  Draft: "bg-orange-100 text-orange-700",
};

export function StatusBadge({ label }: { label: string }) {
  const cls = statusColors[label] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
