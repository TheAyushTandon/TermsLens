import net from "node:net";
import dns from "node:dns/promises";

/**
 * Standardized error class for URL validation, SSRF blocks, and extraction failures.
 */
export class SafeUrlError extends Error {
  readonly code:
    | "INVALID_URL"
    | "SSRF_BLOCKED"
    | "TOO_MANY_REDIRECTS"
    | "FILE_TOO_LARGE"
    | "UNSUPPORTED_MEDIA_TYPE"
    | "TIMEOUT"
    | "EXTRACTION_FAILED";
  readonly statusCode: number;
  readonly remediation?: string;

  constructor(
    code: SafeUrlError["code"],
    message: string,
    statusCode: number,
    remediation?: string
  ) {
    super(message);
    this.name = "SafeUrlError";
    this.code = code;
    this.statusCode = statusCode;
    this.remediation = remediation;
  }
}

/**
 * Validates an IPv4 address string to ensure it is not private, loopback,
 * link-local, multicast, cloud metadata, or otherwise reserved.
 */
export function isForbiddenIpv4(ip: string): boolean {
  const octets = ip.split(".").map((n) => Number.parseInt(n, 10));
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
    return true;
  }

  const [a, b, c, d] = octets;
  const ipInt = ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;

  // 0.0.0.0/8 (Current network / "this" network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private-Use RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared address space / Carrier Grade NAT RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback RFC 1122)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. 169.254.169.254 RFC 3927)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private-Use RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments RFC 6890)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1 RFC 5737)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast RFC 7526)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 (Private-Use RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking RFC 2544: 198.18.0.0 - 198.19.255.255)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2 RFC 5737)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3 RFC 5737)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast RFC 5771: 224.0.0.0 - 239.255.255.255)
  // and 240.0.0.0/4 (Reserved for future use RFC 1112: 240.0.0.0 - 255.255.255.254)
  // and 255.255.255.255 (Limited Broadcast RFC 919)
  if (a >= 224) return true;

  return false;
}

/**
 * Validates an IPv6 address string to ensure it is not loopback, link-local,
 * unique local, multicast, documentation, or reserved.
 */
export function isForbiddenIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:") || normalized.startsWith("0:0:0:0:0:ffff:")) {
    const parts = normalized.split(":");
    const lastPart = parts[parts.length - 1];
    if (net.isIPv4(lastPart)) {
      return isForbiddenIpv4(lastPart);
    }
    if (parts.length >= 3) {
      const hi = parseInt(parts[parts.length - 2], 16);
      const lo = parseInt(parts[parts.length - 1], 16);
      if (!isNaN(hi) && !isNaN(lo)) {
        const a = (hi >> 8) & 0xff;
        const b = hi & 0xff;
        const c = (lo >> 8) & 0xff;
        const d = lo & 0xff;
        return isForbiddenIpv4(`${a}.${b}.${c}.${d}`);
      }
    }
  }

  // Loopback ::1
  if (normalized === "::1" || /^0*(:0*)*:1$/.test(normalized)) return true;

  // Unspecified ::
  if (normalized === "::" || /^0*(:0*)*:0$/.test(normalized)) return true;

  // Unique Local Addresses (fc00::/7 -> fc00:... to fdff:...)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-Local Unicast (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Deprecated Site-Local (fec0::/10)
  if (/^fec[0-9a-f]/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (normalized.startsWith("ff")) return true;

  // Discard Prefix (100::/64)
  if (normalized.startsWith("100:")) return true;

  // Documentation Prefix (2001:db8::/32)
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) return true;

  // IPv4/IPv6 Translation (64:ff9b::/96)
  if (normalized.startsWith("64:ff9b:")) return true;

  return false;
}

/**
 * Master check for any IP address (v4 or v6).
 */
export function isForbiddenIp(ipStr: string): boolean {
  if (!ipStr) return true;
  const trimmed = ipStr.trim();

  // Strip brackets if present [::1]
  const cleanIp = trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;

  const ipFamily = net.isIP(cleanIp);
  if (ipFamily === 4) {
    return isForbiddenIpv4(cleanIp);
  }
  if (ipFamily === 6) {
    return isForbiddenIpv6(cleanIp);
  }

  // If not recognized as valid IP format, reject for safety
  return true;
}

/**
 * Validates the syntax, protocol, ports, credentials, and hostnames of a given URL.
 */
export function validateUrlFormat(urlString: string): URL {
  if (!urlString || typeof urlString !== "string" || !urlString.trim()) {
    throw new SafeUrlError("INVALID_URL", "URL is required and cannot be empty.", 400);
  }

  const trimmed = urlString.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new SafeUrlError("INVALID_URL", `Malformed URL format: "${trimmed}".`, 400);
  }

  // Protocol check: only http: and https:
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SafeUrlError(
      "INVALID_URL",
      `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are permitted.`,
      400
    );
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) {
    throw new SafeUrlError(
      "INVALID_URL",
      "URLs containing embedded user credentials are not permitted.",
      400
    );
  }

  // Port check: only standard HTTP (80) and HTTPS (443) ports
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    throw new SafeUrlError(
      "INVALID_URL",
      `Unsupported port "${parsed.port}". Only standard HTTP (80) and HTTPS (443) ports are supported.`,
      400
    );
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) {
    throw new SafeUrlError("INVALID_URL", "URL must have a valid hostname.", 400);
  }

  // Check forbidden hostnames
  const forbiddenHostnames = [
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
    "metadata.azure.com",
  ];

  if (forbiddenHostnames.includes(hostname)) {
    throw new SafeUrlError(
      "SSRF_BLOCKED",
      `Access to internal or cloud metadata hostname "${hostname}" is forbidden.`,
      400
    );
  }

  // Disallow internal / private top-level or subdomains
  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".corp") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".invalid")
  ) {
    throw new SafeUrlError(
      "SSRF_BLOCKED",
      `Access to private or local domain "${hostname}" is forbidden.`,
      400
    );
  }

  // Direct IP in hostname check
  const cleanHost = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  if (net.isIP(cleanHost)) {
    if (isForbiddenIp(cleanHost)) {
      throw new SafeUrlError(
        "SSRF_BLOCKED",
        `Access to private, loopback, or reserved IP address "${cleanHost}" is forbidden.`,
        400
      );
    }
  }

  return parsed;
}

/**
 * Resolves a hostname via DNS and verifies that all resolved IP addresses are safe.
 */
export async function resolveAndValidateDns(
  hostname: string,
  customDns?: (h: string) => Promise<Array<{ address: string; family: number }>>
): Promise<Array<{ address: string; family: number }>> {
  const cleanHost = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  // If the host is already an explicit IP literal
  if (net.isIP(cleanHost)) {
    if (isForbiddenIp(cleanHost)) {
      throw new SafeUrlError(
        "SSRF_BLOCKED",
        `Access to prohibited IP address "${cleanHost}" is blocked.`,
        400
      );
    }
    return [{ address: cleanHost, family: net.isIP(cleanHost) }];
  }

  try {
    let records: Array<{ address: string; family: number }>;
    if (customDns) {
      records = await customDns(hostname);
    } else {
      const res = await dns.lookup(hostname, { all: true });
      records = res.map((r) => ({ address: r.address, family: r.family }));
    }

    if (!records || records.length === 0) {
      throw new SafeUrlError("INVALID_URL", `Unable to resolve DNS for hostname "${hostname}".`, 400);
    }

    for (const record of records) {
      if (isForbiddenIp(record.address)) {
        throw new SafeUrlError(
          "SSRF_BLOCKED",
          `Security violation: Hostname "${hostname}" resolved to prohibited IP address "${record.address}".`,
          400
        );
      }
    }

    return records;
  } catch (err: unknown) {
    if (err instanceof SafeUrlError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new SafeUrlError("INVALID_URL", `DNS resolution failure for "${hostname}": ${msg}`, 400);
  }
}

/**
 * Decodes common HTML entities into their plain text equivalents.
 */
export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) ? String.fromCharCode(code) : _m;
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) ? String.fromCharCode(code) : _m;
    });
}

/**
 * Cleans raw HTML and extracts structured, readable policy text,
 * discarding scripts, styling, navigation, headers, footers, and cookie banners.
 */
export function extractPolicyTextFromHtml(html: string, _sourceUrl: string): {
  text: string;
  title: string;
  wordCount: number;
} {
  if (!html || typeof html !== "string") {
    throw new SafeUrlError(
      "EXTRACTION_FAILED",
      "Empty webpage content received.",
      422,
      "Please copy and paste the policy text directly into the Paste Text tab."
    );
  }

  // 1. Extract title
  let title = "";
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
  }

  // 2. Remove script, style, noscript, svg, canvas, iframe, head
  let clean = html
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");

  // 3. Remove navigational and boilerplate containers
  clean = clean
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "");

  // Remove common cookie notice or banner wrappers
  clean = clean.replace(
    /<div\b[^>]*(?:class|id)=["'][^"']*(?:cookie|consent|banner|ad-|advertisement)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  );

  // If title was not found in <title>, check first <h1>
  if (!title) {
    const h1Match = clean.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      title = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    }
  }

  if (!title) {
    title = "Website Policy Document";
  }

  // 4. Convert structural HTML elements to clean text layout
  clean = clean.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_match, content) => {
    return `\n\n### ${content.trim()}\n\n`;
  });

  clean = clean.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_match, content) => {
    return `\n\n${content.trim()}\n\n`;
  });

  clean = clean.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, content) => {
    return `\n- ${content.trim()}`;
  });

  clean = clean.replace(/<br\s*\/?>/gi, "\n");
  clean = clean.replace(/<hr\s*\/?>/gi, "\n\n");
  clean = clean.replace(/<\/(div|section|article|blockquote|tr|table)>/gi, "\n\n");

  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  clean = decodeHtmlEntities(clean);

  // Normalize whitespace
  clean = clean
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10 || clean.length < 50) {
    throw new SafeUrlError(
      "EXTRACTION_FAILED",
      "Webpage contains insufficient readable text (empty page, client-side JavaScript required, or anti-bot challenge).",
      422,
      "Try copying and pasting the policy text directly into the Paste Text tab."
    );
  }

  return {
    text: clean,
    title,
    wordCount,
  };
}

/**
 * Normalizes plain text documents fetched from a URL.
 */
export function normalizePlainText(text: string): {
  text: string;
  title: string;
  wordCount: number;
} {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10 || clean.length < 50) {
    throw new SafeUrlError(
      "EXTRACTION_FAILED",
      "Text document contains insufficient readable text.",
      422,
      "Try copying and pasting the policy text directly into the Paste Text tab."
    );
  }

  return {
    text: clean,
    title: "Policy Document",
    wordCount,
  };
}

export interface SafeFetchOptions {
  maxRedirects?: number;
  maxSizeBytes?: number;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  fetchFn?: typeof fetch;
  dnsLookupFn?: (host: string) => Promise<Array<{ address: string; family: number }>>;
}

export interface SafeFetchResult {
  text: string;
  documentTitle: string;
  finalUrl: string;
  contentType: string;
  wordCount: number;
}

/**
 * Securely retrieves a public webpage, validating protocols, hostnames, DNS records,
 * redirect chains, response sizes, and timeouts, then extracts clean text.
 */
export async function safeFetchUrl(
  initialUrl: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResult> {
  const maxRedirects = options?.maxRedirects ?? 3;
  const maxSizeBytes = options?.maxSizeBytes ?? 5 * 1024 * 1024; // 5 MB
  const connectTimeoutMs = options?.connectTimeoutMs ?? 8000; // 8s
  const readTimeoutMs = options?.readTimeoutMs ?? 10000; // 10s
  const fetchFn = options?.fetchFn ?? globalThis.fetch;

  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (true) {
    // 1. Syntax, protocol, port, hostname validation
    const parsed = validateUrlFormat(currentUrl);

    // 2. Initial DNS resolution and SSRF address blocklist validation
    await resolveAndValidateDns(parsed.hostname, options?.dnsLookupFn);

    // 3. DNS Rebinding Protection: Verify addresses at connection time
    if (options?.dnsLookupFn) {
      const connectAddresses = await options.dnsLookupFn(parsed.hostname);
      for (const record of connectAddresses) {
        if (isForbiddenIp(record.address)) {
          throw new SafeUrlError(
            "SSRF_BLOCKED",
            `DNS rebinding detected: Hostname "${parsed.hostname}" resolved to prohibited address "${record.address}" at connection time.`,
            400
          );
        }
      }
    }

    // 4. Execute fetch with timeouts and manual redirect control
    const timeoutMs = Math.min(connectTimeoutMs, readTimeoutMs);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let res: Response;
    try {
      res = await fetchFn(currentUrl, {
        method: "GET",
        headers: {
          Accept: "text/html, text/plain, application/xhtml+xml;q=0.9",
          "User-Agent": "TermsLens-PolicyBot/1.0 (+https://github.com/TheAyushTandon/TermsLens)",
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      if (controller.signal.aborted) {
        throw new SafeUrlError(
          "TIMEOUT",
          `Connection or read timeout exceeded (${timeoutMs} ms) while requesting "${currentUrl}".`,
          504,
          "The website took too long to respond. Please copy and paste the policy text directly into the Paste Text tab."
        );
      }
      if (fetchErr instanceof SafeUrlError) throw fetchErr;
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new SafeUrlError(
        "EXTRACTION_FAILED",
        `Network error accessing "${currentUrl}": ${msg}`,
        422,
        "Please copy and paste the policy text directly into the Paste Text tab."
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    // 5. Handle redirects
    const status = res.status;
    if ([301, 302, 303, 307, 308].includes(status)) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new SafeUrlError(
          "TOO_MANY_REDIRECTS",
          `Exceeded maximum allowed redirect limit of ${maxRedirects}.`,
          400
        );
      }

      const locationHeader = res.headers.get("location");
      if (!locationHeader) {
        throw new SafeUrlError(
          "INVALID_URL",
          `Redirect response (${status}) missing Location header.`,
          400
        );
      }

      // Resolve relative redirect against current URL
      try {
        currentUrl = new URL(locationHeader, currentUrl).toString();
      } catch {
        throw new SafeUrlError(
          "INVALID_URL",
          `Invalid redirect location URL: "${locationHeader}".`,
          400
        );
      }

      // Loop to next redirect target
      continue;
    }

    // 6. Handle non-200 responses
    if (status < 200 || status >= 300) {
      throw new SafeUrlError(
        "EXTRACTION_FAILED",
        `Website server responded with error status ${status} ${res.statusText || ""}.`,
        422,
        "Please copy and paste the policy text directly into the Paste Text tab."
      );
    }

    // 7. Validate Content-Type
    const rawContentType = res.headers.get("content-type") || "";
    const mimeType = rawContentType.split(";")[0].trim().toLowerCase();
    const allowedMimeTypes = ["text/html", "text/plain", "application/xhtml+xml"];

    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      throw new SafeUrlError(
        "UNSUPPORTED_MEDIA_TYPE",
        `Unsupported content type "${rawContentType}". Only text/html, text/plain, and application/xhtml+xml are supported.`,
        415,
        "Try copying and pasting the policy text directly into the Paste Text tab."
      );
    }

    // 8. Stream read response body with size limit enforcement
    let rawContent = "";
    if (res.body && typeof res.body.getReader === "function") {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxSizeBytes) {
            await reader.cancel();
            throw new SafeUrlError(
              "FILE_TOO_LARGE",
              `Webpage response exceeded maximum allowed size of 5 MB (${maxSizeBytes} bytes).`,
              413
            );
          }
          chunks.push(value);
        }
      }
      rawContent = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    } else {
      const text = await res.text();
      const byteLength = Buffer.byteLength(text, "utf-8");
      if (byteLength > maxSizeBytes) {
        throw new SafeUrlError(
          "FILE_TOO_LARGE",
          `Webpage response exceeded maximum allowed size of 5 MB (${maxSizeBytes} bytes).`,
          413
        );
      }
      rawContent = text;
    }

    // 9. Extract and sanitize policy text
    if (mimeType === "text/plain") {
      const result = normalizePlainText(rawContent);
      return {
        text: result.text,
        documentTitle: result.title,
        finalUrl: currentUrl,
        contentType: mimeType,
        wordCount: result.wordCount,
      };
    } else {
      const result = extractPolicyTextFromHtml(rawContent, currentUrl);
      return {
        text: result.text,
        documentTitle: result.title,
        finalUrl: currentUrl,
        contentType: mimeType,
        wordCount: result.wordCount,
      };
    }
  }
}
