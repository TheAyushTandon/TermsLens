/**
 * Server-side Gemini API client for TermsLens.
 * Uses native fetch with robust retries, jittered backoff, rate-limit classification,
 * request timeouts, and error discrimination.
 * Never exposes keys or allows client-side calls.
 */

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

export class GeminiError extends Error {
  public readonly status?: number;
  public readonly isRetryable: boolean;
  public readonly details?: unknown;

  constructor(message: string, status?: number, isRetryable: boolean = false, details?: unknown) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.isRetryable = isRetryable;
    this.details = details;
  }
}

export class GeminiAuthError extends GeminiError {
  constructor(message: string, status: number = 401, details?: unknown) {
    super(`Gemini API authentication failed (${status}): ${message}`, status, false, details);
    this.name = "GeminiAuthError";
  }
}

export class GeminiPermanentQuotaError extends GeminiError {
  constructor(message: string, details?: unknown) {
    super(
      `Gemini permanent quota / billing failure (429): ${message}. Check account billing and spend caps.`,
      429,
      false,
      details
    );
    this.name = "GeminiPermanentQuotaError";
  }
}

export class GeminiRateLimitError extends GeminiError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number, details?: unknown) {
    super(`Gemini API rate limit exceeded (429): ${message}`, 429, true, details);
    this.name = "GeminiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class GeminiTimeoutError extends GeminiError {
  constructor(timeoutMs: number) {
    super(`Gemini API request timed out after ${timeoutMs}ms.`, 504, true);
    this.name = "GeminiTimeoutError";
  }
}

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000; // 1 second
const DEFAULT_MAX_DELAY_MS = 10000; // 10 seconds

/**
 * Returns the configured Gemini API key, checking environment variables.
 */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/**
 * Returns the default model configured for the project.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * Parses Retry-After header or Google RetryInfo metadata.
 */
export function parseRetryDelay(
  retryAfterHeader: string | null,
  errorDetails?: any[]
): number | null {
  // 1. Check HTTP Retry-After header
  if (retryAfterHeader) {
    const parsedSec = parseFloat(retryAfterHeader);
    if (!isNaN(parsedSec) && parsedSec >= 0) {
      return Math.round(parsedSec * 1000);
    }
    const httpDate = Date.parse(retryAfterHeader);
    if (!isNaN(httpDate)) {
      const diff = httpDate - Date.now();
      return diff > 0 ? diff : 1000;
    }
  }

  // 2. Check Google RPC RetryInfo metadata in error details
  if (Array.isArray(errorDetails)) {
    for (const detail of errorDetails) {
      if (
        detail?.["@type"]?.includes("RetryInfo") ||
        typeof detail?.retryDelay !== "undefined"
      ) {
        const delayStr = String(detail.retryDelay || "");
        if (delayStr.endsWith("s")) {
          const sec = parseFloat(delayStr.slice(0, -1));
          if (!isNaN(sec) && sec >= 0) {
            return Math.round(sec * 1000);
          }
        }
        const numeric = parseFloat(delayStr);
        if (!isNaN(numeric) && numeric >= 0) {
          return Math.round(numeric * 1000);
        }
      }
    }
  }

  return null;
}

/**
 * Classifies whether a 429 error represents an unrecoverable quota / billing state.
 */
export function isPermanentQuotaFailure(
  status: number,
  message: string,
  details?: any[]
): boolean {
  if (status !== 429) return false;

  const lowerMsg = (message || "").toLowerCase();
  const permanentKeywords = [
    "billing",
    "spend cap",
    "spend_cap",
    "billing_disabled",
    "credit_exhausted",
    "insufficient quota",
    "plan and billing",
    "account suspended",
    "free tier limit exceeded",
  ];

  if (permanentKeywords.some((kw) => lowerMsg.includes(kw))) {
    return true;
  }

  if (Array.isArray(details)) {
    for (const detail of details) {
      const reason = String(detail?.reason || "").toLowerCase();
      if (
        reason === "billing_disabled" ||
        reason === "spend_cap_exceeded" ||
        reason === "credit_exhausted"
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if an error is eligible for retry.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof GeminiError) {
    return error.isRetryable;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes("abort") || name.includes("timeout")) return true;
    if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("fetch failed")) {
      return true;
    }
    if (msg.includes("network") || msg.includes("socket")) return true;
  }

  return false;
}

/**
 * Computes exponential backoff delay with jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
  serverHintMs: number | null = null
): number {
  if (serverHintMs !== null && serverHintMs > 0) {
    return Math.min(maxDelayMs, serverHintMs) + Math.round(Math.random() * 250);
  }

  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  const jitter = Math.round(Math.random() * (exponential * 0.3));
  return exponential + jitter;
}

/**
 * Calls the Google Gemini GenerateContent API with timeouts, retries, and backoff.
 */
export async function callGemini(
  prompt: string,
  options?: GeminiGenerateOptions,
  config?: GeminiConfig
): Promise<string> {
  const apiKey = config?.apiKey || getGeminiApiKey();

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    throw new GeminiAuthError(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment or .env.local.",
      401
    );
  }

  const model = config?.model || getGeminiModel();
  const endpoint = `${API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const timeoutMs =
    config?.timeoutMs ||
    Number(process.env.GEMINI_TIMEOUT_MS) ||
    DEFAULT_TIMEOUT_MS;
  const maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = config?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.1, // low temperature for deterministic extraction
  };

  if (options?.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (options?.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const serializedBody = JSON.stringify(requestBody);

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: serializedBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        let errorDetails: any[] = [];

        try {
          const errJson = JSON.parse(errorText);
          parsedMessage = errJson.error?.message || errorText;
          if (Array.isArray(errJson.error?.details)) {
            errorDetails = errJson.error.details;
          }
        } catch {
          // use raw text
        }

        const status = response.status;
        const retryAfterHeader = response.headers.get("retry-after");
        const serverHintMs = parseRetryDelay(retryAfterHeader, errorDetails);

        // 1. Permanent Quota or Billing Exceeded -> Non-retryable
        if (isPermanentQuotaFailure(status, parsedMessage, errorDetails)) {
          throw new GeminiPermanentQuotaError(parsedMessage, errorDetails);
        }

        // 2. Authentication / Forbidden -> Non-retryable
        if (status === 401 || status === 403) {
          throw new GeminiAuthError(parsedMessage, status, errorDetails);
        }

        // 3. Bad Request -> Non-retryable
        if (status === 400) {
          throw new GeminiError(`Gemini API invalid request (400): ${parsedMessage}`, 400, false, errorDetails);
        }

        // 4. Rate Limit (429) -> Retryable
        if (status === 429) {
          throw new GeminiRateLimitError(parsedMessage, serverHintMs || undefined, errorDetails);
        }

        // 5. Server Errors (500, 502, 503, 504) -> Retryable
        if (status >= 500 && status <= 599) {
          throw new GeminiError(`Gemini API server error (${status}): ${parsedMessage}`, status, true, errorDetails);
        }

        // Other client errors
        throw new GeminiError(`Gemini API error (${status}): ${parsedMessage}`, status, false, errorDetails);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      if (!candidate) {
        throw new GeminiError("Gemini returned no candidates in response.", 500, true);
      }

      if (candidate.finishReason === "SAFETY") {
        throw new GeminiError("Gemini blocked generation due to safety settings.", 400, false);
      }

      const textPart = candidate.content?.parts?.[0]?.text;
      if (!textPart) {
        throw new GeminiError("Gemini candidate did not contain any text.", 500, true);
      }

      return textPart;
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);

      let classifiedError: Error;
      if (err instanceof Error && err.name === "AbortError") {
        classifiedError = new GeminiTimeoutError(timeoutMs);
      } else if (err instanceof GeminiError) {
        classifiedError = err;
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        classifiedError = new GeminiError(`Network or connection error calling Gemini API: ${msg}`, 503, true);
      }

      lastError = classifiedError;

      // Check if we should retry
      const canRetry = isRetryableError(classifiedError) && attempt < maxRetries;
      if (!canRetry) {
        throw classifiedError;
      }

      // Compute backoff delay
      let serverHintMs: number | null = null;
      if (classifiedError instanceof GeminiRateLimitError && classifiedError.retryAfterMs) {
        serverHintMs = classifiedError.retryAfterMs;
      }

      const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, serverHintMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw (
    lastError ||
    new GeminiError(`Gemini API failed after ${maxRetries} retry attempts.`, 500, false)
  );
}

/**
 * Helper to clean and parse JSON that may be enclosed in markdown code fences.
 */
export function extractJsonFromResponse(raw: string): unknown {
  let cleaned = raw.trim();

  // Strip leading ```json or ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
    cleaned = cleaned.replace(/\n?```$/, "");
  }

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse Gemini output as JSON: ${message}. Raw output preview: ${raw.slice(0, 200)}...`
    );
  }
}
