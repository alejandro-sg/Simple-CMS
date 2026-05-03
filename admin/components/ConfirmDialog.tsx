"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmLabel?: string;
  variant?: "danger" | "warning";
};

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel,
  variant = "danger",
}: Props) {
  if (!open) return null;

  const confirmClasses =
    variant === "warning"
      ? "px-4 py-2 text-sm rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
      : "px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50";

  const defaultLabel = variant === "warning" ? "Archive" : "Delete";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={confirmClasses}
          >
            {loading ? `${confirmLabel ?? defaultLabel}…` : (confirmLabel ?? defaultLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
