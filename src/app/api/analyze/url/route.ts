import { handleAnalyzeUrlRequest } from "./handler.ts";

/**
 * Standard Next.js route handler for POST /api/analyze/url.
 */
export async function POST(request: Request): Promise<Response> {
  return handleAnalyzeUrlRequest(request);
}
