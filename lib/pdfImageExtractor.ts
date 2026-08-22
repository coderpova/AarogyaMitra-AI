import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

/**
 * Extracts embedded images from a PDF buffer.
 * Only supports JPEGs and PNGs embedded as XObjects.
 * Does not require native canvas or DOMMatrix.
 */
export async function extractImagesFromPDF(pdfBuffer: Buffer): Promise<{ base64: string; mimeType: string }[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const images: { base64: string; mimeType: string }[] = [];

    for (const page of pages) {
      const xObject = page.node.Resources()?.lookup(PDFName.of("XObject"));
      if (!xObject) continue;

      const xObjectDict = page.doc.context.lookup(xObject) as unknown as { dict: Map<unknown, unknown> };
      if (!xObjectDict || !xObjectDict.dict) continue;

      for (const [, value] of xObjectDict.dict.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = page.doc.context.lookup(value as any);
        if (stream instanceof PDFRawStream) {
          const subtype = stream.dict.lookup(PDFName.of("Subtype"));
          if (subtype === PDFName.of("Image")) {
            const filter = stream.dict.lookup(PDFName.of("Filter"));
            let mimeType = "image/jpeg"; // Default fallback
            
            if (filter === PDFName.of("DCTDecode")) {
              mimeType = "image/jpeg";
            } else if (filter === PDFName.of("FlateDecode")) {
              // FlateDecode might be PNG or raw pixels. We'll attempt to extract it,
              // but JPEG (DCTDecode) is the most common format for scanned documents.
              mimeType = "image/png";
            }

            const imageBytes = stream.contents;
            const base64 = Buffer.from(imageBytes).toString("base64");
            
            // Basic sanity check to ensure it's not a tiny icon/logo
            if (base64.length > 5000) { 
               images.push({ base64, mimeType });
            }
          }
        }
      }
    }

    return images;
  } catch (err) {
    console.error("PDF Image Extraction Error:", err);
    return [];
  }
}
