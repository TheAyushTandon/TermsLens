import zlib from "node:zlib";
import { validatePolicyInput, normalizePolicyText } from "./segmentation.ts";

export type SupportedFileType = "pdf" | "docx" | "txt";

export class DocumentExtractionError extends Error {
  code: "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE" | "INVALID_DOCUMENT" | "EXTRACTION_FAILED";
  httpStatus: number;

  constructor(
    message: string,
    code: "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE" | "INVALID_DOCUMENT" | "EXTRACTION_FAILED",
    httpStatus: number
  ) {
    super(message);
    this.name = "DocumentExtractionError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates file extension, magic bytes, size, and encryption signatures.
 */
export function validateUploadedFile(
  filename: string,
  buffer: Buffer,
  _clientMimeType?: string
): { fileType: SupportedFileType } {
  // 1. File size check
  if (!buffer || buffer.length === 0) {
    throw new DocumentExtractionError(
      "Uploaded file is empty (0 bytes).",
      "INVALID_DOCUMENT",
      400
    );
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new DocumentExtractionError(
      `File size exceeds the 25 MB limit (${(buffer.length / (1024 * 1024)).toFixed(1)} MB uploaded).`,
      "FILE_TOO_LARGE",
      413
    );
  }

  // 2. Extension check
  const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "";

  if (ext !== "pdf" && ext !== "docx" && ext !== "txt") {
    throw new DocumentExtractionError(
      "Unsupported file type. TermsLens accepts PDF (.pdf), Word (.docx), and Plain Text (.txt) documents.",
      "UNSUPPORTED_FILE_TYPE",
      415
    );
  }

  // 3. Magic bytes & content signature validation
  if (ext === "pdf") {
    const header = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("latin1");
    if (!header.includes("%PDF-") && !header.startsWith("%PDF")) {
      throw new DocumentExtractionError(
        "File signature does not match a valid PDF document.",
        "UNSUPPORTED_FILE_TYPE",
        415
      );
    }

    // Check for password protection / encryption
    const fullAscii = buffer.toString("latin1");
    if (/\/(?:Encrypt)\s*(\d+\s+\d+\s+R|<<)/.test(fullAscii)) {
      throw new DocumentExtractionError(
        "This document appears to be encrypted, password-protected, or corrupted. Please decrypt and re-upload.",
        "INVALID_DOCUMENT",
        400
      );
    }

    return { fileType: "pdf" };
  }

  if (ext === "docx") {
    // Check for OLE compound binary (password-protected or legacy .doc)
    if (
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      throw new DocumentExtractionError(
        "This document appears to be encrypted, password-protected, or in an unsupported legacy format. Please provide a standard DOCX file.",
        "INVALID_DOCUMENT",
        400
      );
    }

    // Standard DOCX is a PK ZIP archive starting with PK\x03\x04
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      throw new DocumentExtractionError(
        "File signature does not match a valid OpenXML Word document (.docx).",
        "UNSUPPORTED_FILE_TYPE",
        415
      );
    }

    return { fileType: "docx" };
  }

  // Plain Text
  if (ext === "txt") {
    // Check if buffer contains binary NUL bytes
    const checkSample = buffer.subarray(0, Math.min(buffer.length, 2048));
    for (let i = 0; i < checkSample.length; i++) {
      if (checkSample[i] === 0) {
        throw new DocumentExtractionError(
          "File contains binary data and is not a valid plain text document.",
          "UNSUPPORTED_FILE_TYPE",
          415
        );
      }
    }

    return { fileType: "txt" };
  }

  throw new DocumentExtractionError(
    "Unsupported file type. TermsLens accepts PDF, DOCX, and TXT files.",
    "UNSUPPORTED_FILE_TYPE",
    415
  );
}

/**
 * Extracts plain text safely from a TXT buffer.
 */
export function extractTextFromTxt(buffer: Buffer): string {
  let text = buffer.toString("utf-8");
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Extracts and inflates a specific entry from a ZIP buffer using standard OpenXML structure.
 */
function extractZipEntry(buffer: Buffer, targetEntryName: string): string | null {
  // Method 1: Scan Central Directory from End of Central Directory (EOCD)
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;

  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65535 - 22); i--) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    let currentCd = cdOffset;
    for (let i = 0; i < totalEntries; i++) {
      if (currentCd + 46 > buffer.length) break;
      if (buffer.readUInt32LE(currentCd) !== 0x02014b50) break;

      const compression = buffer.readUInt16LE(currentCd + 10);
      const compressedSize = buffer.readUInt32LE(currentCd + 20);
      const nameLen = buffer.readUInt16LE(currentCd + 28);
      const extraLen = buffer.readUInt16LE(currentCd + 30);
      const commentLen = buffer.readUInt16LE(currentCd + 32);
      const localHeaderOffset = buffer.readUInt32LE(currentCd + 42);

      const entryName = buffer.toString("utf-8", currentCd + 46, currentCd + 46 + nameLen);

      if (entryName.toLowerCase() === targetEntryName.toLowerCase()) {
        // Read local header to get exact data offset
        if (localHeaderOffset + 30 <= buffer.length) {
          const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

          if (dataOffset + compressedSize <= buffer.length) {
            const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);
            if (compression === 8) {
              return zlib.inflateRawSync(compressedData).toString("utf-8");
            } else if (compression === 0) {
              return compressedData.toString("utf-8");
            }
          }
        }
      }

      currentCd += 46 + nameLen + extraLen + commentLen;
    }
  }

  // Method 2: Sequential Local File Header scan fallback
  let offset = 0;
  while (offset + 30 < buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset++;
      continue;
    }

    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);

    if (offset + 30 + nameLen > buffer.length) break;

    const entryName = buffer.toString("utf-8", offset + 30, offset + 30 + nameLen);
    const dataOffset = offset + 30 + nameLen + extraLen;

    if (entryName.toLowerCase() === targetEntryName.toLowerCase() && compressedSize > 0) {
      if (dataOffset + compressedSize <= buffer.length) {
        const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);
        if (compression === 8) {
          return zlib.inflateRawSync(compressedData).toString("utf-8");
        } else if (compression === 0) {
          return compressedData.toString("utf-8");
        }
      }
    }

    offset = dataOffset + compressedSize;
  }

  return null;
}

/**
 * Extracts formatted paragraph and heading text from OpenXML document.xml.
 */
function parseDocxXml(xml: string): string {
  // Match all paragraph elements: <w:p ...>...</w:p>
  const pRegex = /<w:p(?: [^>]*)?>([\s\S]*?)<\/w:p>/g;
  const paragraphs: string[] = [];

  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];

    // Detect heading styles: Heading1..Heading6, Title, Subtitle
    const isHeading = /<w:pStyle[^>]*w:val="(?:Heading[1-6]|Title|Subtitle)"/i.test(pContent);

    // Extract text from text elements: <w:t ...>text</w:t>
    const tRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let pText = "";
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }

    // Decode basic XML entities
    const decoded = pText
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (decoded) {
      if (isHeading) {
        paragraphs.push(`\n${decoded}\n`);
      } else {
        paragraphs.push(decoded);
      }
    }
  }

  return paragraphs.join("\n\n");
}

/**
 * Extracts paragraphs and headings from a DOCX buffer.
 */
export function extractTextFromDocx(buffer: Buffer): string {
  try {
    const documentXml = extractZipEntry(buffer, "word/document.xml");
    if (!documentXml) {
      throw new DocumentExtractionError(
        "Could not extract document text from DOCX package: word/document.xml missing.",
        "EXTRACTION_FAILED",
        422
      );
    }

    const text = parseDocxXml(documentXml);
    if (!text || text.trim().length === 0) {
      throw new DocumentExtractionError(
        "The uploaded DOCX document contains no readable text content.",
        "EXTRACTION_FAILED",
        422
      );
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof DocumentExtractionError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new DocumentExtractionError(
      `Corrupted or invalid DOCX document: ${msg}`,
      "INVALID_DOCUMENT",
      400
    );
  }
}

/**
 * Decodes PDF string literals: handles escapes and octal values.
 */
function decodePdfLiteralString(raw: string): string {
  let result = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === "n") {
        result += "\n";
        i += 2;
      } else if (next === "r") {
        result += "\r";
        i += 2;
      } else if (next === "t") {
        result += "\t";
        i += 2;
      } else if (next === "b") {
        result += "\b";
        i += 2;
      } else if (next === "f") {
        result += "\f";
        i += 2;
      } else if (next === "(" || next === ")" || next === "\\") {
        result += next;
        i += 2;
      } else if (/[0-7]/.test(next)) {
        // Octal escape \ooo
        let octalStr = next;
        let j = i + 2;
        while (j < raw.length && /[0-7]/.test(raw[j]) && j - i <= 3) {
          octalStr += raw[j];
          j++;
        }
        result += String.fromCharCode(parseInt(octalStr, 8));
        i = j;
      } else {
        result += next;
        i += 2;
      }
    } else {
      result += raw[i];
      i++;
    }
  }

  // Check for UTF-16BE encoding (starts with 0xFE 0xFF)
  if (result.length >= 2 && result.charCodeAt(0) === 0xfe && result.charCodeAt(1) === 0xff) {
    let utf16 = "";
    for (let k = 2; k < result.length - 1; k += 2) {
      utf16 += String.fromCharCode((result.charCodeAt(k) << 8) | result.charCodeAt(k + 1));
    }
    return utf16;
  }

  return result;
}

/**
 * Extracts plain text from a decompressed PDF content stream.
 */
function extractTextFromContentStream(streamText: string): string {
  const textChunks: string[] = [];

  // Match BT ... ET blocks
  const btRegex = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(streamText)) !== null) {
    const block = btMatch[1];

    // 1. Match Tj, ', " operators: (text) Tj
    const tjRegex = /\((.*?)\)\s*(?:Tj|'|")/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = decodePdfLiteralString(tjMatch[1]);
      if (decoded.trim()) textChunks.push(decoded.trim());
    }

    // 2. Match TJ array operator: [ (str1) -20 (str2) ... ] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = arrayMatch[1];
      const strRegex = /\((.*?)\)|(-?\d+(?:\.\d+)?)/g;
      let elemMatch: RegExpExecArray | null;
      let currentWord = "";

      while ((elemMatch = strRegex.exec(arrayContent)) !== null) {
        if (elemMatch[1] !== undefined) {
          currentWord += decodePdfLiteralString(elemMatch[1]);
        } else if (elemMatch[2] !== undefined) {
          const num = parseFloat(elemMatch[2]);
          // Negative spacing <= -100 typically represents a space between words
          if (num <= -100) {
            currentWord += " ";
          }
        }
      }

      if (currentWord.trim()) {
        textChunks.push(currentWord.trim());
      }
    }

    // 3. Match Hex strings: <48656c6c6f> Tj
    const hexRegex = /<([0-9A-Fa-f\s]+)>\s*(?:Tj|'|")/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const cleanHex = hexMatch[1].replace(/\s+/g, "");
      let hexStr = "";
      for (let h = 0; h < cleanHex.length; h += 2) {
        hexStr += String.fromCharCode(parseInt(cleanHex.substring(h, h + 2), 16));
      }
      if (hexStr.trim()) textChunks.push(hexStr.trim());
    }
  }

  return textChunks.join(" ");
}

/**
 * Extracts text from a PDF buffer, preserving page numbers as [Page X] markers.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  const fullText = buffer.toString("latin1");

  // Verify basic PDF integrity
  if (!fullText.includes("%PDF-") && !fullText.startsWith("%PDF")) {
    throw new DocumentExtractionError(
      "Invalid PDF structure or header missing.",
      "UNSUPPORTED_FILE_TYPE",
      415
    );
  }

  // 1. Find all stream ... endstream blocks and catalog them
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  const streams: { data: Buffer; offset: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(fullText)) !== null) {
    const streamContentStart = match.index + match[0].indexOf("\n") + 1;
    const streamContentEnd = match.index + match[0].lastIndexOf("endstream");
    const rawStream = buffer.subarray(streamContentStart, streamContentEnd);
    streams.push({ data: rawStream, offset: match.index });
  }

  // 2. Identify Page objects: /Type /Page (and not /Pages)
  const pageRegex = /(\d+)\s+(\d+)\s+obj\s*<<([\s\S]*?\/Type\s*\/Page\b[\s\S]*?)>>\s*endobj/gi;
  const pageMatches: { objNum: number; dict: string }[] = [];

  let pMatch: RegExpExecArray | null;
  while ((pMatch = pageRegex.exec(fullText)) !== null) {
    const dict = pMatch[3];
    if (!dict.includes("/Type/Pages") && !dict.includes("/Type /Pages")) {
      pageMatches.push({
        objNum: parseInt(pMatch[1], 10),
        dict,
      });
    }
  }

  const pagesExtracted: { pageNum: number; text: string }[] = [];

  if (pageMatches.length > 0) {
    // Process each page in sequence
    for (let i = 0; i < pageMatches.length; i++) {
      const page = pageMatches[i];
      const pageNum = i + 1;

      // Find /Contents references: /Contents 5 0 R or /Contents [ 5 0 R 6 0 R ]
      const contentsSingle = page.dict.match(/\/Contents\s+(\d+)\s+(\d+)\s+R/);
      const contentsArray = page.dict.match(/\/Contents\s*\[\s*([\d\sR]+)\s*\]/);

      const targetObjNums: number[] = [];
      if (contentsSingle) {
        targetObjNums.push(parseInt(contentsSingle[1], 10));
      } else if (contentsArray) {
        const refs = contentsArray[1].match(/(\d+)\s+\d+\s+R/g);
        if (refs) {
          for (const r of refs) {
            const num = parseInt(r.split(/\s+/)[0], 10);
            if (!isNaN(num)) targetObjNums.push(num);
          }
        }
      }

      let pageText = "";

      for (const objNum of targetObjNums) {
        // Find object stream
        const objRegex = new RegExp(`${objNum}\\s+\\d+\\s+obj([\\s\\S]*?)endobj`, "i");
        const objMatch = fullText.match(objRegex);
        if (objMatch) {
          const objContent = objMatch[1];
          const isFlate = objContent.includes("/FlateDecode");
          const sMatch = objContent.match(/stream\r?\n([\s\S]*?)endstream/);
          if (sMatch) {
            const sStart = objMatch.index! + objMatch[0].indexOf("stream") + 6;
            const sEnd = objMatch.index! + objMatch[0].lastIndexOf("endstream");
            const rawBytes = buffer.subarray(sStart, sEnd);

            let decompressed = "";
            if (isFlate) {
              try {
                decompressed = zlib.inflateSync(rawBytes).toString("latin1");
              } catch {
                try {
                  decompressed = zlib.inflateRawSync(rawBytes).toString("latin1");
                } catch {
                  decompressed = rawBytes.toString("latin1");
                }
              }
            } else {
              decompressed = rawBytes.toString("latin1");
            }

            const extracted = extractTextFromContentStream(decompressed);
            if (extracted.trim()) {
              pageText += (pageText ? " " : "") + extracted.trim();
            }
          }
        }
      }

      if (pageText.trim()) {
        pagesExtracted.push({ pageNum, text: pageText.trim() });
      }
    }
  }

  // Fallback: If page objects could not be resolved or cross-reference stream, scan streams directly
  if (pagesExtracted.length === 0 && streams.length > 0) {
    let fallbackText = "";
    for (const stream of streams) {
      let decompressed = "";
      try {
        decompressed = zlib.inflateSync(stream.data).toString("latin1");
      } catch {
        try {
          decompressed = zlib.inflateRawSync(stream.data).toString("latin1");
        } catch {
          decompressed = stream.data.toString("latin1");
        }
      }

      if (decompressed.includes("BT") && decompressed.includes("ET")) {
        const streamExtracted = extractTextFromContentStream(decompressed);
        if (streamExtracted.trim()) {
          fallbackText += (fallbackText ? "\n\n" : "") + streamExtracted.trim();
        }
      }
    }

    if (fallbackText.trim()) {
      pagesExtracted.push({ pageNum: 1, text: fallbackText.trim() });
    }
  }

  // Format with page markers
  const formattedPages = pagesExtracted
    .map((p) => `[Page ${p.pageNum}]\n${p.text}`)
    .join("\n\n");

  // 3. Scanned PDF Detection
  // Check if extracted text is empty or trivial
  const val = validatePolicyInput(formattedPages);
  if (!val.isValid || formattedPages.trim().length < 50) {
    // Check if document contains images (/Image or /XObject)
    const hasImages = fullText.includes("/Image") || fullText.includes("/XObject");
    if (hasImages || pagesExtracted.length === 0) {
      throw new DocumentExtractionError(
        "Scanned or image-based PDF detected without extractable text. TermsLens does not support image OCR. Please provide a text-based document or paste the policy text directly into the Paste Text tab.",
        "EXTRACTION_FAILED",
        422
      );
    }

    throw new DocumentExtractionError(
      val.error || "The uploaded PDF document contains no readable contractual provisions.",
      "EXTRACTION_FAILED",
      422
    );
  }

  return formattedPages;
}

/**
 * Unified file extraction dispatcher.
 */
export async function extractTextFromFile(
  filename: string,
  buffer: Buffer,
  clientMimeType?: string
): Promise<{ text: string; fileType: SupportedFileType }> {
  // 1. Validate file metadata and signatures
  const { fileType } = validateUploadedFile(filename, buffer, clientMimeType);

  // 2. Dispatch format extraction
  let rawText = "";
  if (fileType === "txt") {
    rawText = extractTextFromTxt(buffer);
  } else if (fileType === "docx") {
    rawText = extractTextFromDocx(buffer);
  } else if (fileType === "pdf") {
    rawText = extractTextFromPdf(buffer);
  }

  // 3. Normalize text line breaks and spacing
  const normalized = normalizePolicyText(rawText);

  // 4. Validate legal content volume
  const val = validatePolicyInput(normalized);
  if (!val.isValid) {
    throw new DocumentExtractionError(
      val.error || "Document text does not contain sufficient words to perform clause extraction.",
      "EXTRACTION_FAILED",
      422
    );
  }

  return {
    text: normalized,
    fileType,
  };
}
