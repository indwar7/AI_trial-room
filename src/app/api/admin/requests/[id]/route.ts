import { isAdmin } from "@/lib/server/auth";
import { json, notAllowed, preflight } from "@/lib/server/http";
import { deleteRequest } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Removes a request that will not get a login. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdmin(request)) return notAllowed(request);
  const { id } = await params;
  await deleteRequest(id);
  return json(request, { ok: true });
}
