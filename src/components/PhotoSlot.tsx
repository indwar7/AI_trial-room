"use client";

import { useRef, useState, type ReactNode } from "react";
import { photoFromFile, type Photo, type PhotoKind } from "@/lib/image";
import CameraModal from "./CameraModal";
import { CameraIcon, UploadIcon } from "./icons";

interface Props {
  kind: PhotoKind;
  step: string;
  title: string;
  /** Shown in the empty frame. */
  hint: string;
  /** Shown under the camera viewfinder. */
  cameraHint: string;
  placeholder: ReactNode;
  photo: Photo | null;
  disabled: boolean;
  onPhoto: (photo: Photo) => void;
}

export default function PhotoSlot({
  kind,
  step,
  title,
  hint,
  cameraHint,
  placeholder,
  photo,
  disabled,
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
    <section className="slot" aria-labelledby={`${kind}-title`}>
      <p className="eyebrow">{step}</p>
      <h2 id={`${kind}-title`} className="slot__title">
        {title}
      </h2>

      <div className={photo ? "frame frame--filled" : "frame"}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="frame__img" src={photo.dataUrl} alt={`Your photo of ${title.toLowerCase()}`} />
        ) : (
          <div className="frame__empty">
            {placeholder}
            <p>{hint}</p>
          </div>
        )}
      </div>

      <div className="slot__actions">
        <button
          type="button"
          className="btn"
          disabled={disabled}
          onClick={() => {
            setProblem(null);
            setCameraOpen(true);
          }}
        >
          <CameraIcon />
          {photo ? "Retake" : "Take photo"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <UploadIcon />
          Upload
        </button>
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
      </div>

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}

      {cameraOpen && (
        <CameraModal
          kind={kind}
          title={`Photo of ${title.toLowerCase()}`}
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
    </section>
  );
}
