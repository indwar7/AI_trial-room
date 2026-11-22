"use client";

import { useEffect, useRef, useState } from "react";
import { photoFromVideo, type Photo, type PhotoKind } from "@/lib/image";
import { CloseIcon, FlipIcon } from "./icons";

type Facing = "user" | "environment";

interface Props {
  kind: PhotoKind;
  title: string;
  hint: string;
  onCapture: (photo: Photo) => void;
  onClose: () => void;
  onUploadInstead: () => void;
}

function cameraProblem(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow the camera for this site in your browser settings, or upload a photo instead.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. Upload a photo instead.";
  }
  if (name === "NotReadableError") {
    return "The camera is in use by another app. Close it and try again, or upload a photo instead.";
  }
  return "The camera could not be started. Upload a photo instead.";
}

export default function CameraModal({
  kind,
  title,
  hint,
  onCapture,
  onClose,
  onUploadInstead,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Someone else usually holds the phone, so the back camera comes first.
  const [facing, setFacing] = useState<Facing>("environment");
  const [mirrored, setMirrored] = useState(false);
  const [ready, setReady] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const video = videoRef.current;

    async function start() {
      setReady(false);
      setProblem(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem("This browser cannot open the camera here. Upload a photo instead.");
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (stopped) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;

        const actual = media.getVideoTracks()[0]?.getSettings().facingMode;
        // A laptop webcam reports no direction and faces the user.
        setMirrored(actual !== "environment");

        if (video) {
          video.srcObject = media;
          await video.play().catch(() => undefined);
        }

        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!stopped) {
          setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
        }
      } catch (err) {
        if (!stopped) setProblem(cameraProblem(err));
      }
    }

    start();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [facing]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      onCapture(photoFromVideo(video, kind));
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "The photo could not be taken.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="camera"
      aria-labelledby="camera-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="camera__sheet">
        <div className="camera__bar">
          <h2 id="camera-title" className="camera__title">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close camera">
            <CloseIcon />
          </button>
        </div>

        <div className="camera__view">
          <video
            ref={videoRef}
            className={mirrored ? "camera__video is-mirrored" : "camera__video"}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={() => setReady(true)}
          />
          {!problem && !ready && <p className="camera__note">Starting the camera…</p>}
          {problem && (
            <p className="camera__note camera__note--problem" role="alert">
              {problem}
            </p>
          )}
        </div>

        {problem ? (
          <div className="camera__controls">
            <button type="button" className="btn btn--primary" onClick={onUploadInstead}>
              Upload a photo
            </button>
          </div>
        ) : (
          <>
            <p className="camera__hint">{hint}</p>
            <div className="camera__controls">
              <span className="camera__side" />
              <button
                type="button"
                className="shutter"
                onClick={capture}
                disabled={!ready}
                aria-label="Take the photo"
                autoFocus
              />
              <span className="camera__side">
                {canFlip && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                    aria-label="Switch camera"
                  >
                    <FlipIcon />
                  </button>
                )}
              </span>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
