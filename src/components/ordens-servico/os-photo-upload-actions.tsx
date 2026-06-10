"use client";

import { useRef } from "react";

import { t } from "@/lib/i18n";

type Props = {
  disabled?: boolean;
  onFilesSelected: (files: FileList | null) => void;
  takePhotoLabel?: string;
  choosePhotosLabel?: string;
  className?: string;
};

const buttonClass =
  "flex-1 rounded-sm border border-dashed border-cc-border px-4 py-4 text-sm font-light text-cc-muted transition hover:border-cc-blue-soft hover:bg-cc-blue-soft/20 disabled:pointer-events-none disabled:opacity-40";

/** Camera capture + gallery pick for field photo uploads. */
export function OsPhotoUploadActions({
  disabled = false,
  onFilesSelected,
  takePhotoLabel = t("os.visit.takePhoto"),
  choosePhotosLabel = t("os.visit.choosePhotos"),
  className,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function clearInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    onFilesSelected(files);
    clearInputs();
  }

  return (
    <div className={className ?? "mt-2 flex flex-col gap-2 sm:flex-row"}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className={buttonClass}
      >
        {takePhotoLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
        className={buttonClass}
      >
        {choosePhotosLabel}
      </button>
    </div>
  );
}
