"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { fileToCompressedDataUrl, MAX_PHOTO_SOURCE_SIZE_BYTES } from "@/lib/image";

export interface PhotoValue {
  url: string;
  name: string;
}

const MAX_PHOTOS = 8;

export function PhotoUpload({
  photos,
  onChange,
}: {
  photos: PhotoValue[];
  onChange: (photos: PhotoValue[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_PHOTOS} photos per trade`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    const oversized = files.find((f) => f.size > MAX_PHOTO_SOURCE_SIZE_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" is too large (max 15MB)`);
      return;
    }

    setIsProcessing(true);
    try {
      const converted = await Promise.all(
        files.map(async (file) => ({
          url: await fileToCompressedDataUrl(file),
          name: file.name,
        }))
      );
      onChange([...photos, ...converted]);
    } catch {
      setError("Something went wrong processing one of the photos");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div
            key={`${photo.name}-${index}`}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e2e8f0]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.name}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              aria-label={`Remove ${photo.name}`}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cbd5e1] text-[#94a3b8] transition hover:bg-[#f8fafc] disabled:opacity-60"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-[11px] font-medium">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  );
}
