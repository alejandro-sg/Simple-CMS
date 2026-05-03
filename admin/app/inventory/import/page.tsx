"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type RowResult = {
  row: number;
  title: string;
  error?: string;
  id?: string;
};

type ImportResult = {
  created: number;
  total: number;
  results: RowResult[];
};

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError("");
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await api.importCSV(file);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const failures = result?.results.filter((r) => r.error) ?? [];
  const successes = result?.results.filter((r) => !r.error) ?? [];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/inventory" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Inventory
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Bulk Import via CSV</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV file to create multiple items at once.
        </p>
      </div>

      {/* Step 1 — Download template */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Step 1 — Download the template</h2>
        <p className="text-sm text-gray-500 mb-4">
          Fill in the CSV template with your items. Do not change the column headers.
        </p>
        <button
          onClick={() => api.downloadTemplate()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ↓ Download items-template.csv
        </button>

        {/* Column reference */}
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Column</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Required</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Accepted values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["title", "Yes", "Any text"],
                ["brand", "No", "Any text"],
                ["category", "No", "Furniture · Home Decor · Lighting & Art"],
                ["condition", "No", "New · Like New · Good · Fair · Poor"],
                ["type", "No", "Any text (e.g. Sofa, Table, Pendant)"],
                ["description", "No", "Any text"],
                ["status", "No", "In Stock · Reserved · Sold  (default: In Stock)"],
                ["post_status", "No", "Draft · Published  (default: Draft)"],
                ["quantity", "No", "Integer  (default: 1)"],
                ["featured", "No", "true · false  (default: false)"],
                ["price", "No", "Number e.g. 450  (blank = Upon request)"],
                ["width_in", "No", "Number in inches"],
                ["depth_in", "No", "Number in inches"],
                ["height_in", "No", "Number in inches"],
                ["weight_lb", "No", "Number in pounds"],
                ["date", "No", "YYYY-MM-DD"],
              ].map(([col, req, vals]) => (
                <tr key={col}>
                  <td className="px-3 py-1.5 font-mono text-gray-800">{col}</td>
                  <td className="px-3 py-1.5 text-gray-500">{req}</td>
                  <td className="px-3 py-1.5 text-gray-500">{vals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Step 2 — Upload your filled CSV</h2>
        <p className="text-sm text-gray-500 mb-4">
          Items with <strong>post_status = Published</strong> will appear on the website immediately after import.
          Leave as <strong>Draft</strong> to review each item first.
        </p>

        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Click to choose a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 5 MB</p>
            </>
          )}
        </div>

        {file && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="mt-4 rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import Items"}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Import complete — {result.created} of {result.total} items created
          </h2>

          {successes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                Created ({successes.length})
              </p>
              <ul className="space-y-1">
                {successes.map((r) => (
                  <li key={r.row} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    <span>Row {r.row} — {r.title}</span>
                    {r.id && (
                      <Link href={`/inventory/${r.id}`} className="text-xs text-gray-400 hover:text-gray-700 underline">
                        edit
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failures.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                Failed ({failures.length})
              </p>
              <ul className="space-y-1">
                {failures.map((r) => (
                  <li key={r.row} className="flex items-center gap-2 text-sm">
                    <span className="text-red-400">✕</span>
                    <span className="text-gray-700">Row {r.row} — {r.title}</span>
                    <span className="text-red-500 text-xs">{r.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.created > 0 && (
            <Link
              href="/inventory"
              className="mt-5 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              View Inventory →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
