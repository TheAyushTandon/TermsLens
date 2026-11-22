import { handleAnalyzeUrlRequest } from "./handler.ts";

export const maxDuration = 60;

/**
 * Standard Next.js route handler for POST /api/analyze/url.
 */
export async function POST(request: Request): Promise<Response> {
  return handleAnalyzeUrlRequest(request);
}
