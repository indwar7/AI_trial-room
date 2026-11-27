/**
 * Makes a garment out of a design and a fabric, in the browser.
 *
 * The fabric photo is turned into a swatch that repeats without a seam, the
 * swatch is laid across the picture, the design's folds and seams are
 * multiplied over it, and the result is cut to the design's outline.
 */

import type { Design } from "./catalogue";
import type { Photo } from "./image";

export interface Fabric {
  /** A sample's id, or "own" for the store's photo. */
  id: string;
  name: string;
  /** The picture shown on the swatch button. */
  swatch: string;
  /** The fabric mirrored 2 x 2, so that it repeats without a seam. */
  tile: HTMLCanvasElement;
}

/** Half the tile: the size the fabric photo is worked at. */
const HALF = 256;
const GARMENT_WIDTH = 768;
const GARMENT_HEIGHT = 1024;
/** The cloth a design is shown in before any fabric is chosen. */
const PLAIN = "#D9D5CD";

const pictures = new Map<string, Promise<HTMLImageElement>>();

/** Loads a picture once, however many times it is asked for. */
export function loadPicture(url: string): Promise<HTMLImageElement> {
  let pending = pictures.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        pictures.delete(url);
        reject(new Error("The picture could not be loaded."));
      };
      img.src = url;
    });
    pictures.set(url, pending);
  }
  return pending;
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw pictures.");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/**
 * Takes out a light fall-off from one side of the photo to the other, which
 * would otherwise show as bands once the fabric repeats. Only a straight
 * slope is removed, so checks and stripes are left alone.
 */
function evenOut(ctx: CanvasRenderingContext2D, size: number): void {
  const image = ctx.getImageData(0, 0, size, size);
  const px = image.data;
  const mid = (size - 1) / 2;
  let total = 0;
  let slopeX = 0;
  let slopeY = 0;
  let spread = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const light = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      total += light;
      slopeX += (x - mid) * light;
      slopeY += (y - mid) * light;
      spread += (x - mid) * (x - mid);
    }
  }
  const mean = total / (size * size);
  if (mean < 1) return;
  const a = slopeX / spread;
  const b = slopeY / spread;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const fitted = mean + a * (x - mid) + b * (y - mid);
      const lift = Math.min(1.4, Math.max(0.72, mean / Math.max(fitted, 1)));
      px[i] = Math.min(255, px[i] * lift);
      px[i + 1] = Math.min(255, px[i + 1] * lift);
      px[i + 2] = Math.min(255, px[i + 2] * lift);
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** The centre square of a picture, mirrored 2 x 2 so its edges always meet. */
export function seamlessTile(source: HTMLImageElement, lightIsUneven: boolean): HTMLCanvasElement {
  const side = Math.min(source.naturalWidth, source.naturalHeight);
  const sx = (source.naturalWidth - side) / 2;
  const sy = (source.naturalHeight - side) / 2;
  const one = canvasOf(HALF, HALF);
  one.ctx.drawImage(source, sx, sy, side, side, 0, 0, HALF, HALF);
  if (lightIsUneven) evenOut(one.ctx, HALF);

  const tile = canvasOf(HALF * 2, HALF * 2);
  for (const [flipX, flipY] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ] as const) {
    tile.ctx.save();
    tile.ctx.translate(flipX ? HALF * 2 : 0, flipY ? HALF * 2 : 0);
    tile.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    tile.ctx.drawImage(one.canvas, 0, 0);
    tile.ctx.restore();
  }
  return tile.canvas;
}

export async function fabricFromPicture(
  id: string,
  name: string,
  url: string,
  lightIsUneven: boolean,
): Promise<Fabric> {
  return { id, name, swatch: url, tile: seamlessTile(await loadPicture(url), lightIsUneven) };
}

/**
 * Draws a design made in a fabric. `scale` is how wide the swatch is on the
 * garment, as a share of the picture's width. With `onWhite` the garment
 * sits on a white card, which is what the try-on servers expect; without, the
 * picture is transparent around it.
 */
export function dress(
  template: HTMLImageElement,
  fabric: Fabric | null,
  scale: number,
  width: number,
  height: number,
  onWhite: boolean,
): HTMLCanvasElement {
  const { canvas, ctx } = canvasOf(width, height);

  if (fabric) {
    // The mirrored tile holds the swatch twice in each direction.
    const repeat = Math.max(8, Math.round(width * scale)) * 2;
    const scaled = canvasOf(repeat, repeat);
    scaled.ctx.drawImage(fabric.tile, 0, 0, repeat, repeat);
    const pattern = ctx.createPattern(scaled.canvas, "repeat");
    if (pattern) {
      // Anchored on the centre line, so stripes and checks sit evenly on the garment.
      ctx.save();
      ctx.translate(width / 2, 0);
      ctx.fillStyle = pattern;
      ctx.fillRect(-width / 2, 0, width, height);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = PLAIN;
    ctx.fillRect(0, 0, width, height);
  }

  // Folds, seams and buttons, then the outline.
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(template, 0, 0, width, height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(template, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  if (!onWhite) return canvas;

  const card = canvasOf(width, height);
  card.ctx.fillStyle = "#ffffff";
  card.ctx.fillRect(0, 0, width, height);
  card.ctx.drawImage(canvas, 0, 0);
  return card.canvas;
}

/** The garment photo that goes to the try-on: the design in the fabric, on white. */
export async function garmentPhoto(design: Design, fabric: Fabric, scale: number): Promise<Photo> {
  const template = await loadPicture(design.template);
  const made = dress(template, fabric, scale, GARMENT_WIDTH, GARMENT_HEIGHT, true);
  return { dataUrl: made.toDataURL("image/jpeg", 0.92), width: GARMENT_WIDTH, height: GARMENT_HEIGHT };
}
