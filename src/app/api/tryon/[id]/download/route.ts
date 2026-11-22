import {
  errorResponse,
  getPrediction,
  isReplicateFile,
  outputUrl,
  PREDICTION_ID,
  TryOnError,
} from "@/lib/replicate";

export const dynamic = "force-dynamic";

/** Serves the finished image from this site so the browser saves it as a file. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!PREDICTION_ID.test(id)) {
      throw new TryOnError("That try-on was not found. Start a new one.", 404);
    }

    const prediction = await getPrediction(id);
    const url = prediction.status === "succeeded" ? outputUrl(prediction) : null;
    if (!url || !isReplicateFile(url)) {
      throw new TryOnError("This image is not ready.", 404);
    }

    const image = await fetch(url, { cache: "no-store" });
    if (!image.ok || !image.body) {
      throw new TryOnError("This image has expired. Create it again.", 410);
    }

    const type = image.headers.get("content-type") ?? "image/jpeg";
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";

    return new Response(image.body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="trial-room-${id.slice(0, 8)}.${extension}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
