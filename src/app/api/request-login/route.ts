import { newId } from "@/lib/server/auth";
import { json, phoneDigits, preflight, readBody, text } from "@/lib/server/http";
import { countRequests, saveRequest } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** More waiting requests than this means someone is flooding the form. */
const MAX_WAITING = 200;

export async function POST(request: Request): Promise<Response> {
  const data = await readBody(request);
  // A field people never see. Only a script fills it in.
  if (text(data.website, 200)) return json(request, { ok: true });

  const name = text(data.name, 60);
  const store = text(data.store, 80);
  const phone = phoneDigits(data.phone);
  if (name.length < 2) return json(request, { error: "Enter your name." }, 400);
  if (store.length < 2) return json(request, { error: "Enter your store's name." }, 400);
  if (!phone) return json(request, { error: "Enter a phone number we can reach you on." }, 400);

  if ((await countRequests()) >= MAX_WAITING) {
    return json(request, { error: "We cannot take more requests right now. Try again later." }, 503);
  }
  await saveRequest({ id: newId(), name, store, phone, createdAt: new Date().toISOString() });
  return json(request, { ok: true });
}
