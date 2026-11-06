import { preflight } from "@/lib/apiKeys";
import { openApiSpec } from "@/lib/openapi";
import { requestOrigin } from "@/lib/origin";

export const OPTIONS = preflight;

/** The OpenAPI 3.1 description of the public API. No key needed. */
export function GET(req: Request) {
  return Response.json(openApiSpec(requestOrigin(req)), { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } });
}
