"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

const MAX_IMAGES = 10;
const ACCEPTED = ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  itemName?: string;
};

export function ImageUploader({ images, onChange, itemName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (images.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setError("");
    setUploading(true);
    const added: string[] = [];

    for (const file of Array.from(files)) {
      if (images.length + added.length >= MAX_IMAGES) break;
      try {
        const { publicUrl } = await api.uploadImage(file, itemName);
        added.push(publicUrl);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(`Upload failed for ${file.name}: ${msg}`);
        break;
      }
    }

    if (added.length > 0) {
      onChange([...images, ...added]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    onChange(images.filter((img) => img !== url));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
          uploading
            ? "border-gray-300 bg-gray-50 cursor-wait"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading and compressing…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Drag photos here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG, WebP, HEIC · max {MAX_IMAGES} images · compressed automatically
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="w-full h-full object-cover rounded-md border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none"
                title="Remove image"
              >
                ✕
              </button>
              {i === 0 && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white rounded px-1">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {images.length}/{MAX_IMAGES} images · First image is the cover photo
      </p>
    </div>
  );
}
