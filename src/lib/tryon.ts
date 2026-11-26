/**
 * Runs a try-on on the free public demo servers hosted on Hugging Face.
 * The browser talks to them directly, so there is no key and no bill. In
 * exchange each network (IP address) gets a small free allowance per day:
 * a few runs, and a few minutes of GPU time.
 */

import { describeGarment, type Category, type Gender, type GarmentType } from "./garments";
import { finishPicture, padToFrame, photoToBlob, type Photo } from "./image";

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

/** The server took longer than it is given. */
class SlowError extends Error {}

interface Files {
  person: Blob;
  garment: Blob;
}

type FileRef = unknown;

interface Server {
  space: string;
  endpoint: string;
  categories: readonly Category[];
  /**
   * How a photo taller than 3:4 reaches the 3:4 frame the model works in:
   * the server keeps its shape, the server adds white side bars itself, or
   * the server would stretch it, so we add the bars before sending.
   */
  tallPhotos: "kept" | "server-pads" | "pad-first";
  /** True when one run asks for the whole day's free allowance up front. */
  needsWholeAllowance?: boolean;
  payload: (
    files: Files,
    request: TryOnRequest,
    file: (blob: Blob) => FileRef,
  ) => Record<string, unknown>;
}

const STEPS = 30;
/** OOTDiffusion's own default, and the fewest it accepts. */
const OOTD_STEPS = 20;
/** How long a server gets to answer the first hello, and then to finish. */
const CONNECT_TIMEOUT_MS = 30 * 1000;
const SERVER_TIMEOUT_MS = 4 * 60 * 1000;

/** IDM-VTON. Tops only, and the lightest on the free allowance. */
const IDM_VTON: Server = {
  space: "yisol/IDM-VTON",
  endpoint: "/tryon",
  categories: ["upper_body"],
  tallPhotos: "kept",
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

/** OOTDiffusion. Trousers, skirts and dresses, on the same light allowance as a top. */
const OOTD_FULL_BODY: Server = {
  space: "levihsu/OOTDiffusion",
  endpoint: "/process_dc",
  categories: ["lower_body", "dresses"],
  tallPhotos: "pad-first",
  payload: ({ person, garment }, request, file) => ({
    vton_img: file(person),
    garm_img: file(garment),
    category: request.type.category === "lower_body" ? "Lower-body" : "Dress",
    n_samples: 1,
    n_steps: OOTD_STEPS,
    image_scale: 2,
    seed: randomSeed(),
  }),
};

/** OOTDiffusion again, standing in for tops when IDM-VTON is down. */
const OOTD_TOPS: Server = {
  space: "levihsu/OOTDiffusion",
  endpoint: "/process_hd",
  categories: ["upper_body"],
  tallPhotos: "pad-first",
  payload: ({ person, garment }, _request, file) => ({
    vton_img: file(person),
    garm_img: file(garment),
    n_samples: 1,
    n_steps: OOTD_STEPS,
    image_scale: 2,
    seed: randomSeed(),
  }),
};

/** Leffa. Handles every garment area, but each run needs the full free allowance. */
const LEFFA: Server = {
  space: "franciszzj/Leffa",
  endpoint: "/leffa_predict_vt",
  categories: ["upper_body", "lower_body", "dresses"],
  tallPhotos: "server-pads",
  needsWholeAllowance: true,
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

/** In the order they are tried, for the garment areas each one handles. */
const SERVERS: readonly Server[] = [IDM_VTON, OOTD_FULL_BODY, OOTD_TOPS, LEFFA];

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
export function quotaMessage(raw: string): string | null {
  if (!/quota|runs limit/i.test(raw)) return null;
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

/** Settles with `work`, unless it takes longer than `ms` or the shopper cancels first. */
function within<T>(work: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const settle = (finish: () => void) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      finish();
    };
    const onAbort = () => settle(() => reject(new DOMException("Cancelled", "AbortError")));
    const timer = setTimeout(
      () => settle(() => reject(new SlowError("The server took too long."))),
      ms,
    );
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => settle(() => resolve(value)),
      (err) => settle(() => reject(err)),
    );
  });
}

/** Where the picture is in a server's answer: a single file, or the first file of a gallery. */
function pictureUrl(data: unknown): string | null {
  const first: unknown = Array.isArray(data) ? data[0] : null;
  const item: unknown = Array.isArray(first) ? first[0] : first;
  if (!item || typeof item !== "object") return null;
  const file: unknown = "image" in item ? item.image : item;
  const url = file && typeof file === "object" && "url" in file ? file.url : null;
  return typeof url === "string" ? url : null;
}

/** Follows a job to its picture, reporting progress on the way. */
async function pictureFrom(job: AsyncIterable<unknown>, request: TryOnRequest): Promise<Blob> {
  const { signal, onStage } = request;
  for await (const raw of job) {
    const event = raw as SpaceEvent;
    if (event.type === "status") {
      if (event.stage === "error") {
        const text = `${event.title ?? ""} ${event.message ?? ""}`.trim();
        const quota = quotaMessage(text);
        if (quota) throw new QuotaError(quota);
        throw new Error(text || "The server reported an error.");
      }
      if (event.stage === "pending" && (event.position ?? 0) > 0) {
        onStage({ step: "queued", ahead: event.position ?? 0 });
      } else if (event.stage === "pending" || event.stage === "generating") {
        onStage({ step: "fitting" });
      }
    } else if (event.type === "data") {
      const url = pictureUrl(event.data);
      if (!url) throw new Error("The server returned no picture.");
      const picture = await fetch(url, { signal });
      if (!picture.ok) throw new Error(`The picture could not be fetched (${picture.status}).`);
      return await picture.blob();
    }
  }
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  throw new Error("The server stopped before making a picture.");
}

async function runOn(server: Server, files: Files, request: TryOnRequest): Promise<Blob> {
  const { Client, handle_file } = await import("@gradio/client");
  const { signal, onStage } = request;

  onStage({ step: "connecting" });
  const connecting = Client.connect(server.space, { events: ["data", "status"] });
  const client = await within(connecting, CONNECT_TIMEOUT_MS, signal).catch((err) => {
    // If the server answers after we stopped waiting, hang up.
    void connecting.then((late) => late.close(), () => undefined);
    throw err;
  });

  const job = client.submit(
    server.endpoint,
    server.payload(files, request, (blob) => handle_file(blob)),
  );
  try {
    return await within(pictureFrom(job, request), SERVER_TIMEOUT_MS, signal);
  } catch (err) {
    if (signal.aborted || err instanceof SlowError) void job.cancel().catch(() => undefined);
    throw err;
  } finally {
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
  const shape = request.person.width / request.person.height;
  let framed: Blob | null = null;
  let anotherFailed = false;

  for (const server of servers) {
    try {
      let person = files.person;
      if (server.tallPhotos === "pad-first") person = framed ??= await padToFrame(files.person);
      const picture = await runOn(server, { ...files, person }, request);
      // Side bars added on the way in, by us or by the server, come off again.
      return await finishPicture(picture, server.tallPhotos === "kept" ? null : shape);
    } catch (err) {
      if (request.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        throw new DOMException("Cancelled", "AbortError");
      }
      if (err instanceof QuotaError) {
        // A server that asks for the whole day's allowance refuses long
        // before the day's try-ons are really used up, so after another
        // server has failed its refusal is not the thing to report.
        if (server.needsWholeAllowance && anotherFailed) break;
        throw new TryOnError(err.message);
      }
      anotherFailed = true;
      console.warn(`[tryon] ${server.space} failed:`, err);
    }
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new TryOnError("You are offline. Connect to the internet and try again.");
  }
  throw new TryOnError(
    "The free AI servers could not make this picture. Use a clear, front-facing photo of one person and a clear photo of the garment, or try again in a few minutes.",
  );
}
