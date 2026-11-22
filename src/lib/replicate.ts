/**
 * Server-side Replicate client for the IDM-VTON virtual try-on model.
 * Never import this from a client component: it reads the API token.
 */

/** cuuupid/idm-vton */
export const MODEL_VERSION =
  "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985";

const DEFAULT_API_BASE = "https://api.replicate.com/v1";
const API_BASE = (process.env.REPLICATE_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");

export const PREDICTION_ID = /^[a-z0-9]{8,64}$/;

export type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export interface Prediction {
  id: string;
  status: PredictionStatus;
  version?: string;
  output?: unknown;
  error?: unknown;
  logs?: string | null;
}

export interface TryOnInput {
  human_img: string;
  garm_img: string;
  garment_des: string;
  category: "upper_body" | "lower_body" | "dresses";
  crop: boolean;
  force_dc: boolean;
  steps: number;
  seed: number;
}

/** An error that is safe to show to the person using the app. */
export class TryOnError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TryOnError";
  }
}

function token(): string {
  const value = process.env.REPLICATE_API_TOKEN?.trim();
  if (!value) {
    throw new TryOnError(
      "The AI service is not set up yet: REPLICATE_API_TOKEN is missing on the server.",
      503,
    );
  }
  return value;
}

async function call(path: string, init?: RequestInit): Promise<Prediction> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    if (err instanceof TryOnError) throw err;
    console.error("[replicate] network error", err);
    throw new TryOnError("Could not reach the AI service. Try again in a moment.", 502);
  }

  if (res.ok) return (await res.json()) as Prediction;

  const detail = await res.text().catch(() => "");
  console.error(`[replicate] ${res.status} on ${path}: ${detail.slice(0, 500)}`);

  switch (res.status) {
    case 401:
    case 403:
      throw new TryOnError("The AI service rejected the API token set on the server.", 502);
    case 402:
      throw new TryOnError("The AI account is out of credit. Add billing on Replicate.", 502);
    case 404:
      throw new TryOnError("That try-on was not found. Start a new one.", 404);
    case 429:
      throw new TryOnError("The AI service is busy. Wait a few seconds and try again.", 429);
    default:
      throw new TryOnError("The AI service returned an error. Try again in a moment.", 502);
  }
}

export function createPrediction(input: TryOnInput): Promise<Prediction> {
  return call("/predictions", {
    method: "POST",
    body: JSON.stringify({ version: MODEL_VERSION, input }),
  });
}

/** Fetches a prediction, refusing anything this app did not create. */
export async function getPrediction(id: string): Promise<Prediction> {
  const prediction = await call(`/predictions/${id}`);
  if (typeof prediction.version === "string" && prediction.version !== MODEL_VERSION) {
    throw new TryOnError("That try-on was not found. Start a new one.", 404);
  }
  return prediction;
}

export function cancelPrediction(id: string): Promise<Prediction> {
  return call(`/predictions/${id}/cancel`, { method: "POST" });
}

/** The model returns one image URL; tolerate a list as well. */
export function outputUrl(prediction: Prediction): string | null {
  const out = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  return typeof out === "string" && out.length > 0 ? out : null;
}

/** Reads the last tqdm percentage ("40%|████") out of the model logs. */
export function progressFromLogs(logs: string | null | undefined): number | null {
  if (!logs) return null;
  const matches = logs.match(/(\d{1,3})%\|/g);
  if (!matches) return null;
  const value = parseInt(matches[matches.length - 1], 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

/** Only ever proxy images that Replicate itself is serving. */
export function isReplicateFile(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (API_BASE !== DEFAULT_API_BASE && parsed.origin === new URL(API_BASE).origin) {
    return true; // a local stand-in for Replicate, used by the smoke test
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname;
  return (
    host === "replicate.delivery" ||
    host.endsWith(".replicate.delivery") ||
    host.endsWith(".replicate.com")
  );
}

/** Turns a model failure into something a shopper can act on. */
export function friendlyFailure(error: unknown): string {
  const raw = typeof error === "string" ? error : JSON.stringify(error ?? "");
  if (/nsfw/i.test(raw)) {
    return "The AI declined these photos. Try different ones.";
  }
  if (/out of memory|cuda/i.test(raw)) {
    return "The AI ran out of capacity. Try again in a moment.";
  }
  return "The AI could not fit this garment. Use a clear, front-facing photo of one person and a clear photo of the garment, then try again.";
}

export function errorResponse(err: unknown): Response {
  if (err instanceof TryOnError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("[tryon] unexpected error", err);
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
