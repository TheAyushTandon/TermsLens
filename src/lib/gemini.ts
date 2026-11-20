/**
 * Server-side Gemini API client for TermsLens.
 * Uses native fetch to interact with the Google Gemini REST API.
 * Never exposes keys or allows client-side calls.
 */

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface GeminiGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
 * Calls the Google Gemini GenerateContent API.
 */
export async function callGemini(
  prompt: string,
  options?: GeminiGenerateOptions,
  config?: GeminiConfig
): Promise<string> {
  const apiKey = config?.apiKey || getGeminiApiKey();

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment or .env.local."
    );
  }

  const model = config?.model || getGeminiModel();
  const endpoint = `${API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMessage = errJson.error?.message || errorText;
    } catch {
      // use raw text
    }

    if (response.status === 429) {
      throw new Error(`Gemini API rate limit exceeded (429): ${parsedMessage}`);
    } else if (response.status === 400) {
      throw new Error(`Gemini API invalid request (400): ${parsedMessage}`);
    } else if (response.status === 403 || response.status === 401) {
      throw new Error(`Gemini API authentication failed (${response.status}): ${parsedMessage}`);
    } else {
      throw new Error(`Gemini API error (${response.status}): ${parsedMessage}`);
    }
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new Error("Gemini returned no candidates in response.");
  }

  if (candidate.finishReason === "SAFETY") {
    throw new Error("Gemini blocked generation due to safety settings.");
  }

  const textPart = candidate.content?.parts?.[0]?.text;
  if (!textPart) {
    throw new Error("Gemini candidate did not contain any text.");
  }

  return textPart;
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
