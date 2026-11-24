/**
 * Browser-side photo preparation. Photos are shrunk before upload so they
 * travel fast on a phone connection and stay well inside the server limit.
 */

export type PhotoKind = "person" | "garment";

export interface Photo {
  dataUrl: string;
  width: number;
  height: number;
}

type Source = HTMLImageElement | HTMLVideoElement;

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The models work at 768 x 1024, so nothing much larger than this is useful. */
const PERSON_LONG_SIDE = 1280;
const GARMENT_WIDTH = 768;
const GARMENT_HEIGHT = 1024;
const MIN_SIDE = 200;
const JPEG_QUALITY = 0.9;

export const FRAME_RATIO = 3 / 4;

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare photos.");
  // White behind transparent PNGs, and around a garment that is not 3:4.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function prepare(source: Source, region: Region, kind: PhotoKind): Photo {
  if (Math.min(region.width, region.height) < MIN_SIDE) {
    throw new Error("This photo is too small. Use a larger one.");
  }

  if (kind === "garment") {
    // The models expect a 768 x 1024 garment photo, so it is fitted whole
    // onto a 3:4 white card rather than stretched.
    const { canvas, ctx } = canvasOf(GARMENT_WIDTH, GARMENT_HEIGHT);
    const scale = Math.min(GARMENT_WIDTH / region.width, GARMENT_HEIGHT / region.height);
    const w = Math.round(region.width * scale);
    const h = Math.round(region.height * scale);
    ctx.drawImage(
      source,
      region.x, region.y, region.width, region.height,
      Math.round((GARMENT_WIDTH - w) / 2), Math.round((GARMENT_HEIGHT - h) / 2), w, h,
    );
    return {
      dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      width: GARMENT_WIDTH,
      height: GARMENT_HEIGHT,
    };
  }

  // A photo wider than 3:4 loses its sides, so the person fills the frame
  // the model works in. A taller photo is kept whole.
  let { x, width: rw } = region;
  const { y, height: rh } = region;
  if (rw / rh > FRAME_RATIO) {
    const kept = Math.round(rh * FRAME_RATIO);
    x += Math.round((rw - kept) / 2);
    rw = kept;
  }

  const scale = Math.min(1, PERSON_LONG_SIDE / Math.max(rw, rh));
  const width = Math.round(rw * scale);
  const height = Math.round(rh * scale);
  const { canvas, ctx } = canvasOf(width, height);
  ctx.drawImage(source, x, y, rw, rh, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), width, height };
}

export async function photoToBlob(photo: Photo): Promise<Blob> {
  return (await fetch(photo.dataUrl)).blob();
}

/**
 * Turns the model's picture into a JPEG. When `contentRatio` is given, the
 * model padded a tall photo with white side bars to reach 3:4, and those
 * bars are cut off again.
 */
export async function finishPicture(picture: Blob, contentRatio: number | null): Promise<Blob> {
  const img = await loadImage(picture);
  const h = img.naturalHeight;
  let w = img.naturalWidth;
  let x = 0;
  if (contentRatio !== null && contentRatio < w / h - 0.01) {
    const kept = Math.round(h * contentRatio);
    x = Math.round((w - kept) / 2);
    w = kept;
  }
  const { canvas, ctx } = canvasOf(w, h);
  ctx.drawImage(img, x, 0, w, h, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The picture could not be saved."))),
      "image/jpeg",
      0.92,
    );
  });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file could not be opened as a photo. Use a JPG or PNG."));
    };
    img.src = url;
  });
}

export async function photoFromFile(file: Blob, kind: PhotoKind): Promise<Photo> {
  const img = await loadImage(file);
  return prepare(
    img,
    { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight },
    kind,
  );
}

/** Captures the centre 3:4 of the live camera, which is what the viewfinder shows. */
export function photoFromVideo(video: HTMLVideoElement, kind: PhotoKind): Photo {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error("The camera is not ready yet.");

  const wide = vw / vh > FRAME_RATIO;
  const width = wide ? Math.round(vh * FRAME_RATIO) : vw;
  const height = wide ? vh : Math.round(vw / FRAME_RATIO);
  return prepare(
    video,
    { x: Math.round((vw - width) / 2), y: Math.round((vh - height) / 2), width, height },
    kind,
  );
}
