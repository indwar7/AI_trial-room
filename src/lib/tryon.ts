/**
 * Runs a try-on on the free public demo servers hosted on Hugging Face.
 * The browser talks to them directly, so there is no key and no bill. In
 * exchange each network (IP address) gets a small free allowance per day:
 * a few runs, and a few minutes of GPU time.
 */

import { describeGarment, type Category, type Gender, type GarmentType } from "./garments";
import { finishPicture, photoToBlob, type Photo } from "./image";

export type Stage =
  | { step: "connecting" }
  | { step: "queued"; ahead: number }
  | { step: "fitting" };

export interface TryOnRequest {
  person: Photo;
  garment: Photo;
  gender: Gender;
  type: GarmentType;
  signal: AbortSignal;
  onStage: (stage: Stage) => void;
}

/** A failure whose message is safe to show to the person using the app. */
export class TryOnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TryOnError";
  }
}

/** The server said no for a reason another server will not fix. */
class QuotaError extends Error {}

interface Files {
  person: Blob;
  garment: Blob;
}

type FileRef = unknown;

interface Server {
  space: string;
  endpoint: string;
  categories: readonly Category[];
  /** True when the server pads a tall photo to 3:4 with white side bars. */
  padsTallPhotos: boolean;
  payload: (
    files: Files,
    request: TryOnRequest,
    file: (blob: Blob) => FileRef,
  ) => Record<string, unknown>;
}

const STEPS = 30;
const SERVER_TIMEOUT_MS = 4 * 60 * 1000;

/** IDM-VTON. Tops only, and the lightest on the free allowance. */
const IDM_VTON: Server = {
  space: "yisol/IDM-VTON",
  endpoint: "/tryon",
  categories: ["upper_body"],
  padsTallPhotos: false,
  payload: ({ person, garment }, request, file) => ({
    dict: { background: file(person), layers: [], composite: null },
    garm_img: file(garment),
    garment_des: describeGarment(request.gender, request.type),
    is_checked: true, // find the garment area automatically
    is_checked_crop: true, // work on the centre 3:4 and paste it back
    denoise_steps: STEPS,
    seed: randomSeed(),
  }),
};

/** Leffa. Handles every garment area, but each run needs the full free allowance. */
const LEFFA: Server = {
  space: "franciszzj/Leffa",
  endpoint: "/leffa_predict_vt",
  categories: ["upper_body", "lower_body", "dresses"],
  padsTallPhotos: true,
  payload: ({ person, garment }, request, file) => ({
    src_image_path: file(person),
    ref_image_path: file(garment),
    ref_acceleration: false,
    step: STEPS,
    scale: 2.5,
    seed: randomSeed(),
    vt_model_type: request.type.category === "upper_body" ? "viton_hd" : "dress_code",
    vt_garment_type: request.type.category,
    vt_repaint: false,
  }),
};

/** In the order they are tried. */
const SERVERS: readonly Server[] = [IDM_VTON, LEFFA];

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

/** "Try again in 23:58:37" -> " They reset in 23 h 58 min." */
function resetIn(raw: string): string {
  const m = raw.match(/Try again in (\d+):(\d{2}):(\d{2})/i);
  // The run-count limit comes without a time.
  if (!m) return " Try again tomorrow.";
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const parts = [hours > 0 && `${hours} h`, `${minutes} min`].filter(Boolean);
  return ` They reset in ${parts.join(" ")}.`;
}

/**
 * Turns the server's daily-limit messages into something a shopper can act
 * on. There are two: a time allowance ("You have exceeded your ZeroGPU quota
 * (180s requested vs. 144s left). Try again in 23:58:37.") and a run count
 * ("You have exceeded your ZeroGPU runs limit."). Returns null for anything
 * else.
 */
export function quotaMessage(raw: string, category: Category): string | null {
  if (!/quota|runs limit/i.test(raw)) return null;
  if (category !== "upper_body") {
    // These only run on the server that needs the whole allowance, so
    // being refused here says nothing about tops.
    return `Today's free allowance for trousers, skirts and dresses is used up on this network. Tops may still work.${resetIn(raw)}`;
  }
  return `Today's free try-ons on this network are used up.${resetIn(raw)}`;
}

interface SpaceEvent {
  type: string;
  stage?: string;
  position?: number;
  message?: string | null;
  title?: string;
  data?: unknown;
}

async function runOn(server: Server, files: Files, request: TryOnRequest): Promise<Blob> {
  const { Client, handle_file } = await import("@gradio/client");
  const { signal, onStage } = request;

  onStage({ step: "connecting" });
  const client = await Client.connect(server.space, { events: ["data", "status"] });
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");

  const job = client.submit(
    server.endpoint,
    server.payload(files, request, (blob) => handle_file(blob)),
  );
  const stop = () => void job.cancel().catch(() => undefined);
  signal.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(stop, SERVER_TIMEOUT_MS);

  try {
    for await (const raw of job) {
      const event = raw as SpaceEvent;
      if (event.type === "status") {
        if (event.stage === "error") {
          const text = `${event.title ?? ""} ${event.message ?? ""}`.trim();
          const quota = quotaMessage(text, request.type.category);
          if (quota) throw new QuotaError(quota);
          throw new Error(text || "The server reported an error.");
        }
        if (event.stage === "pending" && (event.position ?? 0) > 0) {
          onStage({ step: "queued", ahead: event.position ?? 0 });
        } else if (event.stage === "pending" || event.stage === "generating") {
          onStage({ step: "fitting" });
        }
      } else if (event.type === "data") {
        const first = Array.isArray(event.data) ? (event.data[0] as { url?: string } | null) : null;
        if (!first?.url) throw new Error("The server returned no picture.");
        const picture = await fetch(first.url, { signal });
        if (!picture.ok) throw new Error(`The picture could not be fetched (${picture.status}).`);
        return await picture.blob();
      }
    }
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    throw new Error("The server stopped before making a picture.");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    client.close();
  }
}

/** Returns the finished picture as a JPEG. Throws TryOnError, or AbortError when cancelled. */
export async function runTryOn(request: TryOnRequest): Promise<Blob> {
  const files: Files = {
    person: await photoToBlob(request.person),
    garment: await photoToBlob(request.garment),
  };
  const servers = SERVERS.filter((s) => s.categories.includes(request.type.category));

  for (const server of servers) {
    try {
      const picture = await runOn(server, files, request);
      const tall = request.person.width / request.person.height;
      return await finishPicture(picture, server.padsTallPhotos ? tall : null);
    } catch (err) {
      if (request.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        throw new DOMException("Cancelled", "AbortError");
      }
      if (err instanceof QuotaError) throw new TryOnError(err.message);
      console.warn(`[tryon] ${server.space} failed:`, err);
    }
  }

  throw new TryOnError(
    "The free AI servers could not make this picture. Use a clear, front-facing photo of one person and a clear photo of the garment, or try again in a few minutes.",
  );
}
