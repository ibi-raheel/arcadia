// Server-only parse helpers for source documents uploaded to the
// scribe's satchel. Converts PDF / DOCX / TXT / markdown buffers to
// plain text + a char count so downstream stages can concat sources
// into Claude's context.
//
// ADR 0012: no OCR (scanned PDFs return empty text — caller should
// surface a hand-script warning), no chunking, no vector DB.

import mammoth from 'mammoth';
// pdf-parse v2 is class-based. Dynamic import keeps the Next bundler
// honest about the server-only boundary — pdf-parse pulls in
// pdfjs-dist which is not edge-safe.

export type ParseResult = {
  readonly text: string;
  readonly char_count: number;
};

export type SupportedMime =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown';

const SUPPORTED: readonly string[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

export function isSupportedMime(mime: string): mime is SupportedMime {
  return SUPPORTED.includes(mime);
}

/**
 * Parse a buffer to plaintext based on its mime type. Returns the
 * normalised text + a char count. Never throws — unsupported types
 * return `{ text: '', char_count: 0 }` so the caller can surface a
 * hand-script warning without a try/catch.
 */
export async function parseSourceBuffer(buffer: Buffer, mime: string): Promise<ParseResult> {
  if (!isSupportedMime(mime)) return { text: '', char_count: 0 };

  if (mime === 'application/pdf') {
    let parser: { destroy(): Promise<void> } | null = null;
    try {
      const { PDFParse } = await import('pdf-parse');
      const instance = new PDFParse({ data: buffer });
      parser = instance;
      const result = await instance.getText();
      const text = normalise(result.text);
      return { text, char_count: text.length };
    } catch {
      // Scanned PDF / encrypted / malformed — fall through to empty.
      return { text: '', char_count: 0 };
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          /* swallow — cleanup best-effort */
        }
      }
    }
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      const text = normalise(value);
      return { text, char_count: text.length };
    } catch {
      return { text: '', char_count: 0 };
    }
  }

  // text/plain + text/markdown
  const text = normalise(buffer.toString('utf8'));
  return { text, char_count: text.length };
}

/** Collapse runs of whitespace, strip BOM, trim. Keeps newlines so
 *  markdown structure survives. */
function normalise(raw: string): string {
  return raw
    .replace(/\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
