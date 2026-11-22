import {
  cancelPrediction,
  errorResponse,
  friendlyFailure,
  getPrediction,
  outputUrl,
  PREDICTION_ID,
  progressFromLogs,
  TryOnError,
} from "@/lib/replicate";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function readId(context: Context): Promise<string> {
  const { id } = await context.params;
  if (!PREDICTION_ID.test(id)) {
    throw new TryOnError("That try-on was not found. Start a new one.", 404);
  }
  return id;
}

export async function GET(_request: Request, context: Context) {
  try {
    const id = await readId(context);
    const prediction = await getPrediction(id);

    let output: string | null = null;
    let error: string | null = null;
    let status = prediction.status;

    if (status === "succeeded") {
      output = outputUrl(prediction);
      if (!output) {
        status = "failed";
        error = friendlyFailure("no output");
      }
    } else if (status === "failed") {
      console.error(`[tryon] ${id} failed:`, prediction.error);
      error = friendlyFailure(prediction.error);
    } else if (status === "canceled") {
      error = "This try-on was cancelled.";
    }

    return Response.json(
      {
        status,
        progress: status === "processing" ? progressFromLogs(prediction.logs) : null,
        output,
        error,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/** Stops a running try-on so it does not keep using the AI account. */
export async function DELETE(_request: Request, context: Context) {
  try {
    const id = await readId(context);
    await getPrediction(id);
    await cancelPrediction(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
