"use client";

import { useRef, useState } from "react";
import { photoFromFile, type Photo, type PhotoKind } from "@/lib/image";
import CameraModal from "./CameraModal";
import { CameraIcon, UploadIcon } from "./icons";

interface Props {
  kind: PhotoKind;
  /** Names the subject in the camera sheet: "the customer", "your garment". */
  subject: string;
  /** Shown under the camera viewfinder. */
  cameraHint: string;
  hasPhoto: boolean;
  disabled: boolean;
  /** Icons alone, for the narrow tile in the catalogue. */
  compact?: boolean;
  onPhoto: (photo: Photo) => void;
}

/** The two ways to bring in a photo: the camera, or a file. */
export default function PhotoButtons({
  kind,
  subject,
  cameraHint,
  hasPhoto,
  disabled,
  compact = false,
  onPhoto,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setProblem(null);
    try {
      onPhoto(await photoFromFile(file, kind));
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "This photo could not be used.");
    }
  }

  return (
    <div className={compact ? "photo-buttons photo-buttons--compact" : "photo-buttons"}>
      <div className="photo-buttons__row">
        <button
          type="button"
          className="btn"
          disabled={disabled}
          aria-label={compact ? `Take a photo of ${subject}` : undefined}
          onClick={() => {
            setProblem(null);
            setCameraOpen(true);
          }}
        >
          <CameraIcon />
          {!compact && (hasPhoto ? "Retake" : "Take photo")}
        </button>
        <button
          type="button"
          className="btn"
          disabled={disabled}
          aria-label={compact ? `Upload a photo of ${subject}` : undefined}
          onClick={() => fileRef.current?.click()}
        >
          <UploadIcon />
          {!compact && "Upload"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        data-testid={`${kind}-file`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onFile(file);
        }}
      />

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}

      {cameraOpen && (
        <CameraModal
          kind={kind}
          title={`Photo of ${subject}`}
          hint={cameraHint}
          onCapture={(captured) => {
            setCameraOpen(false);
            onPhoto(captured);
          }}
          onClose={() => setCameraOpen(false)}
          onUploadInstead={() => {
            setCameraOpen(false);
            fileRef.current?.click();
          }}
        />
      )}
    </div>
  );
}
