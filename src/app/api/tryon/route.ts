import { describeGarment, findType, isGender } from "@/lib/garments";
import { createPrediction, errorResponse, TryOnError } from "@/lib/replicate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
/** ~3 MB of image once decoded; the browser sends far less than this. */
const MAX_DATA_URL_LENGTH = 4_000_000;

function readImage(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TryOnError(`Add ${name} first.`, 400);
  }
  if (value.length > MAX_DATA_URL_LENGTH) {
    throw new TryOnError(`The ${name.replace(/^(a|the) /, "")} is too large.`, 413);
  }
  if (!DATA_URL.test(value)) {
    throw new TryOnError(`The ${name.replace(/^(a|the) /, "")} is not a valid image.`, 400);
  }
  return value;
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new TryOnError("The request could not be read.", 400);
    }
    if (!body || typeof body !== "object") {
      throw new TryOnError("The request could not be read.", 400);
    }

    const person = readImage(body.person, "a photo of the person");
    const garment = readImage(body.garment, "a photo of the garment");

    if (!isGender(body.gender)) {
      throw new TryOnError("Choose male or female.", 400);
    }
    const type = findType(body.type);
    if (!type || !type.genders.includes(body.gender)) {
      throw new TryOnError("Choose the type of garment.", 400);
    }

    const prediction = await createPrediction({
      human_img: person,
      garm_img: garment,
      garment_des: describeGarment(body.gender, type),
      category: type.category,
      // Works on the centre 3:4 of the photo and pastes the result back,
      // so a photo of any shape comes back the same shape.
      crop: true,
      // The base weights only know tops; trousers, skirts and dresses need
      // the DressCode weights.
      force_dc: type.category !== "upper_body",
      steps: 30,
      seed: Math.floor(Math.random() * 1_000_000),
    });

    return Response.json({ id: prediction.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
