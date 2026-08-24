import { PDFDocument, PDFName, PDFRawStream, PDFStream, PDFArray } from "pdf-lib";

/**
 * Robustly extracts embedded images from a PDF buffer (scanned reports, multi-page PDFs).
 * Inspects both XObject dictionary filters and raw byte magic headers (JPEG / PNG / WebP).
 */
export async function extractImagesFromPDF(pdfBuffer: Buffer): Promise<{ base64: string; mimeType: string }[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const images: { base64: string; mimeType: string }[] = [];
    const seenBase64 = new Set<string>();

    for (const page of pages) {
      const xObject = page.node.Resources()?.lookup(PDFName.of("XObject"));
      if (!xObject) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xObjectDict = page.doc.context.lookup(xObject) as any;
      if (!xObjectDict) continue;

      const entries: [unknown, unknown][] = xObjectDict.dict
        ? Array.from(xObjectDict.dict.entries())
        : xObjectDict instanceof Map
        ? Array.from(xObjectDict.entries())
        : [];

      for (const [, value] of entries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = page.doc.context.lookup(value as any);
        if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
          const subtype = stream.dict.lookup(PDFName.of("Subtype"));
          if (subtype === PDFName.of("Image")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const imageBytes = (stream as any).contents as Uint8Array | undefined;
            if (!imageBytes || imageBytes.length < 500) continue;

            let mimeType = "";

            // 1. Check Magic Byte Headers
            if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff) {
              mimeType = "image/jpeg";
            } else if (
              imageBytes[0] === 0x89 &&
              imageBytes[1] === 0x50 &&
              imageBytes[2] === 0x4e &&
              imageBytes[3] === 0x47
            ) {
              mimeType = "image/png";
            } else if (
              imageBytes.length > 12 &&
              imageBytes[8] === 0x57 &&
              imageBytes[9] === 0x45 &&
              imageBytes[10] === 0x42 &&
              imageBytes[11] === 0x50
            ) {
              mimeType = "image/webp";
            } else {
              // 2. Fallback to PDF Filter Inspection (Handling PDFName or PDFArray)
              const filter = stream.dict.lookup(PDFName.of("Filter"));
              let isDCT = false;
              let isFlate = false;

              if (filter === PDFName.of("DCTDecode") || filter === PDFName.of("JPXDecode")) {
                isDCT = true;
              } else if (filter === PDFName.of("FlateDecode")) {
                isFlate = true;
              } else if (filter instanceof PDFArray) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const arrayFilters = filter.asArray().map((f: any) => f?.toString?.() || "");
                if (arrayFilters.some((f) => f.includes("DCTDecode") || f.includes("JPXDecode"))) {
                  isDCT = true;
                } else if (arrayFilters.some((f) => f.includes("FlateDecode"))) {
                  isFlate = true;
                }
              }

              if (isDCT) {
                mimeType = "image/jpeg";
              } else if (isFlate) {
                mimeType = "image/png";
              }
            }

            if (mimeType) {
              const base64 = Buffer.from(imageBytes).toString("base64");
              
              // Ignore tiny icons / background logos (< 4KB base64)
              if (base64.length > 4000 && !seenBase64.has(base64)) {
                seenBase64.add(base64);
                images.push({ base64, mimeType });
              }
            }
          }
        }
      }

      // Safe limit of 5 page images per document to keep payload performant
      if (images.length >= 5) break;
    }

    return images;
  } catch (err) {
    console.error("PDF Image Extraction Error:", err);
    return [];
  }
}
