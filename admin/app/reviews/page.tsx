"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Review } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const STATUS_COLORS: Record<string, string> = {
  New: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
  Archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

type Filter = "All" | "New" | "Approved" | "Rejected" | "Archived";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("New");
  const [busy, setBusy] = useState<string | null>(null);

  // Confirm dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.listReviews();
      setReviews(res.reviews);
    } catch {
      setError("Failed to load reviews. Is the API running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Review["status"]) {
    setBusy(id);
    try {
      const updated = await api.updateReviewStatus(id, status);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      alert("Failed to update status.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDialogBusy(true);
    try {
      await api.deleteReview(deleteId);
      setReviews((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
    } catch {
      alert("Failed to delete review.");
    } finally {
      setDialogBusy(false);
    }
  }

  async function confirmArchive() {
    if (!archiveId) return;
    setDialogBusy(true);
    try {
      const updated = await api.updateReviewStatus(archiveId, "Archived");
      setReviews((prev) => prev.map((r) => (r.id === archiveId ? updated : r)));
      setArchiveId(null);
    } catch {
      alert("Failed to archive review.");
    } finally {
      setDialogBusy(false);
    }
  }

  const counts: Record<Filter, number> = {
    All: reviews.length,
    New: reviews.filter((r) => r.status === "New").length,
    Approved: reviews.filter((r) => r.status === "Approved").length,
    Rejected: reviews.filter((r) => r.status === "Rejected").length,
    Archived: reviews.filter((r) => r.status === "Archived").length,
  };

  const visible = filter === "All" ? reviews : reviews.filter((r) => r.status === filter);

  const deleteReview = reviews.find((r) => r.id === deleteId);
  const archiveReview = reviews.find((r) => r.id === archiveId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
          {!isLoading && (
            <p className="text-base text-gray-500 mt-0.5">{counts.New} pending moderation</p>
          )}
        </div>
        <button
          onClick={load}
          className="rounded-md border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(["New", "Approved", "Rejected", "Archived", "All"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-base font-medium border-b-2 transition-colors ${
              filter === f
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f}
            {counts[f] > 0 && (
              <span className="ml-1.5 text-sm text-gray-400">({counts[f]})</span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="py-20 text-center text-gray-400 text-base">Loading…</div>
      )}
      {error && (
        <div className="py-20 text-center text-red-500 text-base">{error}</div>
      )}
      {!isLoading && !error && visible.length === 0 && (
        <div className="py-20 text-center text-gray-400 text-base">
          No {filter !== "All" ? filter.toLowerCase() : ""} reviews.
        </div>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex gap-4"
            >
              {/* Left: rating + meta */}
              <div className="shrink-0 w-32 text-center">
                <div className="text-yellow-400 text-xl tracking-tight leading-none mb-1">
                  {STARS(r.rating)}
                </div>
                <p className="text-sm font-medium text-gray-700">{r.rating} / 5</p>
                <p className="text-sm text-gray-400 mt-2">{r.type}</p>
                <p className="text-sm text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Center: content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-medium text-gray-900">{r.name || "Anonymous"}</span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                {r.feedback ? (
                  <p className="text-base text-gray-600 leading-relaxed">{r.feedback}</p>
                ) : (
                  <p className="text-base text-gray-400 italic">No written feedback</p>
                )}
              </div>

              {/* Right: actions */}
              <div className="shrink-0 flex flex-col gap-2 items-end justify-start">
                {r.status !== "Approved" && r.status !== "Archived" && (
                  <button
                    onClick={() => setStatus(r.id, "Approved")}
                    disabled={busy === r.id}
                    className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    Approve
                  </button>
                )}
                {r.status !== "Rejected" && r.status !== "Archived" && (
                  <button
                    onClick={() => setStatus(r.id, "Rejected")}
                    disabled={busy === r.id}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                {r.status === "Rejected" && (
                  <button
                    onClick={() => setStatus(r.id, "New")}
                    disabled={busy === r.id}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Undo
                  </button>
                )}
                {r.status !== "Archived" && (
                  <button
                    onClick={() => setArchiveId(r.id)}
                    disabled={busy === r.id}
                    className="text-sm text-amber-500 hover:text-amber-700 disabled:opacity-50"
                  >
                    Archive
                  </button>
                )}
                {r.status === "Archived" && (
                  <button
                    onClick={() => setStatus(r.id, "New")}
                    disabled={busy === r.id}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
                <button
                  onClick={() => setDeleteId(r.id)}
                  disabled={busy === r.id}
                  className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive confirmation */}
      <ConfirmDialog
        open={!!archiveId}
        title="Archive this review?"
        message={`"${archiveReview?.name ?? "This review"}" will be moved to the Archived tab and hidden from moderation.`}
        confirmLabel="Archive"
        variant="warning"
        loading={dialogBusy}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveId(null)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete this review?"
        message={`"${deleteReview?.name ?? "This review"}" will be permanently deleted and cannot be recovered.`}
        confirmLabel="Delete"
        variant="danger"
        loading={dialogBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
