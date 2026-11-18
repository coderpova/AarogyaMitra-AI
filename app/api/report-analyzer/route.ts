import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import connectDB from "@/lib/mongodb";
import ReportHistory from "@/models/ReportHistory";
import User from "@/models/User";
import { extractImagesFromPDF } from "@/lib/pdfImageExtractor";
import { getAuthUserId } from "@/lib/jwtHelper";
import { getGroqModel, getGroqClient } from "@/lib/groqConfig";

const groq = getGroqClient();

export type ReportErrorCode =
  | "FILE_READ_FAILED"
  | "FILE_TOO_LARGE"
  | "PDF_TEXT_EXTRACTION_FAILED"
  | "PDF_RENDER_FAILED"
  | "IMAGE_PREPARATION_FAILED"
  | "VISION_REQUEST_FAILED"
  | "VISION_EMPTY_RESPONSE"
  | "VISION_JSON_FAILED"
  | "VISION_SCHEMA_FAILED"
  | "MEDICAL_VALIDATION_FAILED"
  | "UNREADABLE_REPORT"
  | "TIMEOUT"
  | "UNKNOWN_REPORT_ERROR";

function makeErrorResponse(
  errorCode: ReportErrorCode,
  message: string,
  status: number,
  requestId: string,
  extra?: Record<string, unknown>
) {
  console.log(`[ReportAnalyzer] requestId=${requestId} finalStatus=${status} errorCode=${errorCode} message="${message}"`);
  return NextResponse.json(
    {
      success: false,
      errorCode,
      error: message,
      message,
      requestId,
      ...extra,
    },
    { status }
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${errorMessage}`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function parseObservedValue(valStr: string | null | undefined): number | null {
  if (valStr === null || valStr === undefined) return null;
  const cleanVal = valStr.toString().replace(/,/g, "").replace(/\s+/g, "");
  const numMatch = cleanVal.match(/^[<>]=?(-?\d+\.?\d*)|^(-?\d+\.?\d*)/);
  if (numMatch) {
    const matchStr = numMatch[1] || numMatch[2] || numMatch[0];
    const val = parseFloat(matchStr.replace(/[<>]=?/, ""));
    if (!isNaN(val)) return val;
  }
  const numbers = cleanVal.match(/[-+]?[\d.]+/g);
  if (numbers && numbers.length > 0) {
    const val = parseFloat(numbers[0]);
    if (!isNaN(val)) return val;
  }
  return null;
}

function parseReferenceRange(rangeStr: string | null | undefined): { low: number | null; high: number | null; operator: string | null } {
  if (!rangeStr) return { low: null, high: null, operator: null };
  const cleanRange = rangeStr.replace(/\s+/g, "").replace(/[–—−]/g, "-");
  
  const opMatch = cleanRange.match(/^([<>]=?|=)([\d.]+)/);
  if (opMatch) {
    const op = opMatch[1];
    const val = parseFloat(opMatch[2]);
    if (!isNaN(val)) {
      if (op === "<" || op === "<=") {
        return { low: 0, high: val, operator: op };
      } else if (op === ">" || op === ">=") {
        return { low: val, high: null, operator: op };
      }
    }
  }

  const rangeMatch = cleanRange.match(/^([\d.]+)-([\d.]+)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (!isNaN(low) && !isNaN(high)) {
      return { low, high, operator: null };
    }
  }
  
  const numbers = cleanRange.match(/[\d.]+/g);
  if (numbers && numbers.length >= 2) {
    const low = parseFloat(numbers[0]);
    const high = parseFloat(numbers[1]);
    if (!isNaN(low) && !isNaN(high)) {
      return { low: Math.min(low, high), high: Math.max(low, high), operator: null };
    }
  } else if (numbers && numbers.length === 1) {
    const val = parseFloat(numbers[0]);
    const lowerText = rangeStr.toLowerCase();
    if (lowerText.includes("<") || lowerText.includes("less") || lowerText.includes("below") || lowerText.includes("under")) {
      return { low: 0, high: val, operator: "<" };
    } else if (lowerText.includes(">") || lowerText.includes("greater") || lowerText.includes("above") || lowerText.includes("over")) {
      return { low: val, high: null, operator: ">" };
    }
  }
  
  return { low: null, high: null, operator: null };
}

function isPhysicallyPlausible(name: string | null | undefined, value: number, rangeStr: string | null | undefined): boolean {
  if (!name) return true;
  const normName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Hemoglobin (Hb): 2-25 g/dL
  if (normName === "hb" || normName.includes("hemoglobin") || normName.includes("haemoglobin")) {
    if (value < 2 || value > 25) return false;
  }

  // 2. MCV: 40-150 fL
  if (normName === "mcv" || normName.includes("meancorpuscularvolume")) {
    if (value < 40 || value > 150) return false;
  }

  // 3. MCH: 10-50 pg
  if (normName === "mch" || normName.includes("meancorpuscularhemoglobin")) {
    if (value < 10 || value > 50) return false;
  }

  // 4. RBC: 1-10 million/µL
  if (normName === "rbc" || normName.includes("redbloodcell") || normName.includes("erythrocyte")) {
    if (value < 1 || value > 10) return false;
  }

  // 5. WBC: 100-150,000 /µL
  if (normName === "wbc" || normName.includes("whitebloodcell") || normName.includes("leukocyte") || normName.includes("tlc")) {
    if (value < 100 || value > 150000) return false;
  }

  // PLT: Platelet Count Scale/Unit mismatch detection
  if (normName.includes("platelet") || normName.includes("plt") || normName.includes("thrombocyte")) {
    if (rangeStr) {
      const cleanRange = rangeStr.replace(/\s+/g, "").replace(/[–—−]/g, "-");
      const numbers = cleanRange.match(/[\d.]+/g);
      if (numbers && numbers.length >= 2) {
        const firstRangeNum = numbers[0].replace(/,/g, "");
        const secondRangeNum = numbers[1].replace(/,/g, "");
        const rangeLow = parseFloat(firstRangeNum);
        const rangeHigh = parseFloat(secondRangeNum);
        
        const isRangeScaled = rangeHigh <= 1000;
        const isValueAbsolute = value >= 1000;
        
        const isRangeAbsolute = rangeLow >= 5000;
        const isValueScaled = value < 1000;

        if (isRangeScaled && isValueAbsolute) return false;
        if (isRangeAbsolute && isValueScaled) return false;
      }
    }
  }

  return true;
}

function determineStatus(name: string | null | undefined, valueStr: string | null | undefined, rangeStr: string | null | undefined): "Normal" | "High" | "Low" | "Critical" | "Unknown" {
  if (!valueStr) return "Unknown";
  
  const val = parseObservedValue(valueStr);
  if (val === null) return "Unknown";

  // Plausibility Check (runs before range validation)
  if (!isPhysicallyPlausible(name, val, rangeStr)) {
    return "Unknown";
  }

  if (!rangeStr || rangeStr.trim() === "" || rangeStr.toLowerCase().includes("n/a") || rangeStr.toLowerCase().includes("nil") || rangeStr.toLowerCase().includes("not available") || rangeStr.toLowerCase().includes("unavailable")) {
    return "Unknown";
  }

  const { low, high, operator } = parseReferenceRange(rangeStr);

  if (low === null && high === null) {
    return "Unknown";
  }

  const valueLower = valueStr.toString().toLowerCase();
  const isLessVal = valueLower.includes("<");
  const isGreaterVal = valueLower.includes(">");

  if (operator) {
    if (operator === "<" || operator === "<=") {
      if (high !== null) {
        if (isLessVal) return "Normal";
        if (isGreaterVal) return "High";
        return val > high ? "High" : "Normal";
      }
    } else if (operator === ">" || operator === ">=") {
      if (low !== null) {
        if (isLessVal) return "Low";
        if (isGreaterVal) return "Normal";
        return val < low ? "Low" : "Normal";
      }
    }
  }

  if (low !== null && high !== null) {
    if (isLessVal) {
      return val <= low ? "Low" : "Normal";
    }
    if (isGreaterVal) {
      return val >= high ? "High" : "Normal";
    }

    if (val < low) return "Low";
    if (val > high) return "High";
    return "Normal";
  }

  if (low !== null && val < low) return "Low";
  if (high !== null && val > high) return "High";
  if (low !== null || high !== null) return "Normal";

  return "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonSafely(rawText: string): { parsed: any; success: boolean; rawLength: number; startsWithBrace: boolean; endsWithBrace: boolean } {
  if (!rawText || !rawText.trim()) {
    return { parsed: {}, success: false, rawLength: 0, startsWithBrace: false, endsWithBrace: false };
  }

  let cleaned = rawText.trim();

  // Strip Markdown JSON fences if present
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Locate outer JSON object boundaries { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  const startsWithBrace = firstBrace !== -1;
  const endsWithBrace = lastBrace !== -1 && lastBrace > firstBrace;

  if (startsWithBrace && endsWithBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Normalize harmless formatting issues like trailing commas before braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(cleaned);
    return { parsed, success: true, rawLength: rawText.length, startsWithBrace, endsWithBrace };
  } catch {
    return { parsed: {}, success: false, rawLength: rawText.length, startsWithBrace, endsWithBrace };
  }
}

interface ExtractedReportData {
  reportTitle: string | null;
  reportDate: string | null;
  patientName: string | null;
  parameters: {
    name?: string;
    value?: string | number;
    unit?: string;
    referenceRange?: string;
    status?: string;
  }[];
  observations: string[];
  rawSummary: string;
}

// Helper function for Vision API with strict system prompt, parseJsonSafely, diagnostic logging & 1-retry fallback
async function extractMedicalDataFromImage(extractedImages: { base64: string; mimeType: string }[], groqInstance: Groq, requestId: string) {
  const stageStartTime = Date.now();
  const actualModel = getGroqModel();
  
  if (extractedImages.length > 2) {
    extractedImages = extractedImages.slice(0, 2);
  }

  console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision model=${actualModel} imagesCount=${extractedImages.length}`);

  const systemPrompt = `You are a medical laboratory report data extraction system.

Your ONLY task is to extract clearly visible laboratory information from the provided medical report image.

Return EXACTLY ONE valid JSON object.

Do not return Markdown.
Do not use \`\`\`json.
Do not add explanations.
Do not add introductory text.
Do not add text after the JSON object.

Do not invent values.
Do not guess unreadable values.

Preserve the exact numerical value and unit visible in the report.

If a value cannot be reliably read, represent it using the allowed null/unknown representation defined by the output format.

Follow the required JSON field names and data types exactly.`;

  const extractionPrompt = `Extract medical report parameters into this exact JSON structure:
{
  "reportTitle": null,
  "reportDate": null,
  "patientName": null,
  "parameters": [
    {
      "name": "Parameter Name",
      "value": "Observed Value",
      "unit": "Unit or null",
      "referenceRange": "Reference range or null",
      "status": "Normal, High, Low, Critical, or Unknown"
    }
  ],
  "observations": [],
  "rawSummary": "Brief summary of test findings"
}`;

  const plainTextVisionPrompt = `Read this medical report image and return the visible laboratory parameters as plain text. Do not provide medical advice.`;

  const extractedDataJson: ExtractedReportData = {
    reportTitle: null,
    reportDate: null,
    patientName: null,
    parameters: [],
    observations: [],
    rawSummary: ""
  };

  const seenParams = new Set<string>();

  const imageContents = extractedImages.map(img => {
    let mime = img.mimeType || "image/jpeg";
    if (mime.toLowerCase() === "image/jpg" || mime.toLowerCase() === "jpg") mime = "image/jpeg";
    return {
      type: "image_url" as const,
      image_url: { url: `data:${mime};base64,${img.base64}` }
    };
  });

  let rawExtraction = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let batchJson: any = null;
  let jsonParseSuccess = false;

  const visionReqStartTime = Date.now();

  // Attempt 1: Strict JSON Mode with 15s timeout
  try {
    console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-request-started model=${actualModel}`);
    
    const visionCall = groqInstance.chat.completions.create({
      model: actualModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text" as const, text: extractionPrompt },
            ...imageContents
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const visionCompletion = await withTimeout(visionCall, 15000, "Vision API primary call timed out");
    const visionDuration = (Date.now() - visionReqStartTime) / 1000;
    
    rawExtraction = visionCompletion.choices[0]?.message?.content || "";
    console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-request-completed duration=${visionDuration.toFixed(2)}s rawLength=${rawExtraction.length}`);

    if (!rawExtraction || rawExtraction.trim() === "") {
      const err = new Error("VISION_EMPTY_RESPONSE");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "VISION_EMPTY_RESPONSE";
      throw err;
    }

    const parseResult = parseJsonSafely(rawExtraction);
    console.log(`[ReportAnalyzer] requestId=${requestId} stage=json-parsing contentExists=true contentLength=${rawExtraction.length} startsWithBrace=${parseResult.startsWithBrace} endsWithBrace=${parseResult.endsWithBrace} success=${parseResult.success}`);
    
    if (parseResult.success && parseResult.parsed && typeof parseResult.parsed === "object") {
      batchJson = parseResult.parsed;
      jsonParseSuccess = true;
    } else {
      const err = new Error("VISION_JSON_FAILED");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "VISION_JSON_FAILED";
      throw err;
    }

  } catch (primaryErr: unknown) {
    const visionDuration = (Date.now() - visionReqStartTime) / 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pErr = primaryErr as any;
    
    if (pErr?.message?.includes("TIMEOUT")) {
      console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-request-failed duration=${visionDuration.toFixed(2)}s reason=TIMEOUT`);
      throw new Error("TIMEOUT");
    }

    console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-primary-failed duration=${visionDuration.toFixed(2)}s reason=${pErr?.code || pErr?.message || "JSON_FAILED"}. Initiating 1 controlled fallback retry.`);

    // Attempt 2: Fallback Retry WITHOUT response_format constraint (Plain text vision test)
    const retryStartTime = Date.now();
    try {
      const fallbackCall = groqInstance.chat.completions.create({
        model: actualModel,
        messages: [
          { role: "system", content: "Extract medical parameters cleanly. Output raw JSON object." },
          {
            role: "user",
            content: [
              { type: "text" as const, text: plainTextVisionPrompt },
              ...imageContents
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const fallbackCompletion = await withTimeout(fallbackCall, 12000, "Vision API retry fallback call timed out");
      const retryDuration = (Date.now() - retryStartTime) / 1000;
      rawExtraction = fallbackCompletion.choices[0]?.message?.content || "";
      
      console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-retry-completed duration=${retryDuration.toFixed(2)}s rawLength=${rawExtraction.length}`);

      if (!rawExtraction || rawExtraction.trim() === "") {
        throw new Error("VISION_EMPTY_RESPONSE");
      }

      const parseResult = parseJsonSafely(rawExtraction);
      if (parseResult.success && parseResult.parsed && typeof parseResult.parsed === "object") {
        batchJson = parseResult.parsed;
        jsonParseSuccess = true;
      } else {
        // If raw text has parameters, build fallback object
        if (rawExtraction.length > 20 && (/[0-9]/.test(rawExtraction) || /[a-zA-Z]{3,}/.test(rawExtraction))) {
          console.log(`[ReportAnalyzer] requestId=${requestId} stage=vision-retry-text-detected rawLength=${rawExtraction.length}`);
          batchJson = {
            reportTitle: "Medical Lab Report",
            parameters: [],
            observations: [rawExtraction],
            rawSummary: "Extracted via vision text fallback"
          };
          jsonParseSuccess = true;
        } else {
          throw new Error("VISION_JSON_FAILED");
        }
      }
    } catch (retryErr: unknown) {
      const retryDuration = (Date.now() - retryStartTime) / 1000;
      console.error(`[ReportAnalyzer] requestId=${requestId} stage=vision-retry-failed duration=${retryDuration.toFixed(2)}s:`, retryErr);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rErr = retryErr as any;
      if (rErr?.message?.includes("TIMEOUT")) {
        throw new Error("TIMEOUT");
      }
      if (rErr?.message === "VISION_EMPTY_RESPONSE" || pErr?.message === "VISION_EMPTY_RESPONSE") {
        throw new Error("VISION_EMPTY_RESPONSE");
      }
      if (rErr?.message === "VISION_JSON_FAILED" || pErr?.message === "VISION_JSON_FAILED") {
        throw new Error("VISION_JSON_FAILED");
      }
      
      throw new Error("VISION_REQUEST_FAILED");
    }
  }

  // Schema Validation Check
  if (!jsonParseSuccess || !batchJson) {
    throw new Error("VISION_JSON_FAILED");
  }

  if (batchJson && typeof batchJson !== "object") {
    console.log(`[ReportAnalyzer] requestId=${requestId} stage=schema-validation status=FAIL expected=object received=${typeof batchJson}`);
    throw new Error("VISION_SCHEMA_FAILED");
  }

  const schemaElapsed = (Date.now() - stageStartTime) / 1000;
  console.log(`[ReportAnalyzer] requestId=${requestId} stage=schema-validation status=PASS duration=${schemaElapsed.toFixed(2)}s`);

  if (batchJson.parameters && Array.isArray(batchJson.parameters)) {
    for (const param of batchJson.parameters) {
      if (!param || !param.name) continue;
      const key = `${String(param.name).toLowerCase().trim()}_${String(param.value || "").toLowerCase().trim()}`;
      if (!seenParams.has(key)) {
        seenParams.add(key);
        extractedDataJson.parameters.push(param);
      }
    }
  }
  if (batchJson.observations && Array.isArray(batchJson.observations)) {
    extractedDataJson.observations.push(...batchJson.observations);
  }
  if (batchJson.reportTitle && !extractedDataJson.reportTitle) extractedDataJson.reportTitle = batchJson.reportTitle;
  if (batchJson.reportDate && !extractedDataJson.reportDate) extractedDataJson.reportDate = batchJson.reportDate;
  if (batchJson.patientName && !extractedDataJson.patientName) extractedDataJson.patientName = batchJson.patientName;
  if (batchJson.rawSummary) extractedDataJson.rawSummary += (extractedDataJson.rawSummary ? " " : "") + batchJson.rawSummary;

  return extractedDataJson;
}

// GET: Fetch report history
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided or invalid token", reports: [] },
        { status: 401 }
      );
    }

    await connectDB();

    const reports = await ReportHistory.find({ userId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ reports: reports || [] }, { status: 200 });
  } catch (error) {
    console.error("GET ReportHistory Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch reports history", reports: [] },
      { status: 500 }
    );
  }
}

// POST: Analyze report image/text
export async function POST(request: Request) {
  const reqId = "req_" + Math.random().toString(36).substring(2, 9);
  const reqStartTime = Date.now();
  console.log(`[ReportAnalyzer] requestId=${reqId} stage=request-started model=${getGroqModel()}`);

  try {
    await connectDB();

    const userId = getAuthUserId(request) || "guest";
    const contentType = (request.headers.get("content-type") || "").toLowerCase();

    let reportText = "";
    let imageBase64: string | null = null;
    let bodyLang = "en";
    let isSample = false;
    let pdfBuffer: Buffer | null = null;

    let extractedImages: { base64: string; mimeType: string }[] = [];

    // Stage 1: Parse Request Payload (FormData vs JSON)
    const fileReadStartTime = Date.now();
    if (contentType.includes("multipart/form-data") || contentType.includes("form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      reportText = (formData.get("reportText") as string) || "";
      bodyLang = (formData.get("language") as string) || "en";
      isSample = formData.get("isSample") === "true";

      if (file) {
        const fileReadDuration = (Date.now() - fileReadStartTime) / 1000;
        console.log(`[ReportAnalyzer] requestId=${reqId} stage=file-read duration=${fileReadDuration.toFixed(2)}s bytes=${file.size} mime=${file.type}`);
        
        if (file.size > 4.5 * 1024 * 1024) {
          return makeErrorResponse(
            "FILE_TOO_LARGE",
            "The uploaded report is too large to process. Please upload a smaller file (under 4 MB).",
            413,
            reqId
          );
        }

        const uploadedMime = (file.type || "").toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isPdfMagic = buffer.slice(0, 4).toString() === "%PDF";
        if (uploadedMime.includes("pdf") || isPdfMagic) {
          pdfBuffer = buffer;
        } else if (
          uploadedMime.includes("image") ||
          uploadedMime.includes("octet-stream") ||
          uploadedMime === ""
        ) {
          let mime = uploadedMime || "image/jpeg";
          if (mime === "image/jpg" || mime === "jpg" || mime.includes("octet-stream")) mime = "image/jpeg";
          extractedImages.push({
            base64: buffer.toString("base64"),
            mimeType: mime,
          });
        } else {
          return makeErrorResponse(
            "FILE_READ_FAILED",
            "This file format cannot be analyzed. Please upload a valid PDF or image.",
            400,
            reqId
          );
        }
      }
    } else {
      // JSON body fallback
      const body = await request.json();
      reportText = body.reportText || "";
      imageBase64 = body.imageBase64 || null;
      bodyLang = body.language || "en";
      isSample = body.isSample === true;

      if (imageBase64 && imageBase64.startsWith("data:application/pdf")) {
        const base64Data = imageBase64.split(",")[1];
        pdfBuffer = Buffer.from(base64Data, "base64");
      } else if (
        imageBase64 &&
        (imageBase64.startsWith("data:image/") || imageBase64.startsWith("data:application/octet-stream"))
      ) {
        let mime = imageBase64.split(";")[0].split(":")[1] || "image/jpeg";
        mime = mime.toLowerCase().trim();
        if (mime === "image/jpg" || mime === "jpg" || mime.includes("octet-stream")) mime = "image/jpeg";
        const base64Data = imageBase64.split(",")[1];
        if (base64Data && base64Data.length > 100) {
          extractedImages.push({ base64: base64Data.replace(/\s+/g, ""), mimeType: mime });
        }
      }
    }

    const validationDuration = (Date.now() - reqStartTime) / 1000;
    console.log(`[ReportAnalyzer] requestId=${reqId} stage=file-validation duration=${validationDuration.toFixed(2)}s`);

    // Stage 2: PDF Processing (Text PDF -> Scanned PDF Vision Fallback)
    if (pdfBuffer) {
      const pdfStartTime = Date.now();

      const isPdf = pdfBuffer.slice(0, 4).toString() === "%PDF";
      if (!isPdf) {
        return makeErrorResponse(
          "PDF_TEXT_EXTRACTION_FAILED",
          "The uploaded file is not a valid PDF document.",
          400,
          reqId
        );
      }

      let pdfText = "";
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(pdfBuffer);
        pdfText = (pdfData.text || "").trim();
      } catch (parseErr) {
        console.log(`[ReportAnalyzer] requestId=${reqId} pdf-parse warning:`, parseErr);
      }

      const pdfDuration = (Date.now() - pdfStartTime) / 1000;
      const hasUsableText = pdfText.length >= 10 && (/[0-9]/.test(pdfText) || /[a-zA-Z]{3,}/.test(pdfText));

      if (hasUsableText) {
        console.log(`[ReportAnalyzer] requestId=${reqId} stage=pdf-extraction type=TEXT_PDF duration=${pdfDuration.toFixed(2)}s textLength=${pdfText.length}`);
        reportText = (reportText ? reportText + "\n" : "") + pdfText;
        extractedImages = [];
      } else {
        console.log(`[ReportAnalyzer] requestId=${reqId} stage=pdf-extraction type=SCANNED_PDF textLayerInsufficient=true`);
        const images = await extractImagesFromPDF(pdfBuffer);
        const pdfRenderDuration = (Date.now() - pdfStartTime) / 1000;
        
        if (images.length > 0) {
          extractedImages = images.slice(0, 2);
          console.log(`[ReportAnalyzer] requestId=${reqId} stage=pdf-render duration=${pdfRenderDuration.toFixed(2)}s imagesCount=${extractedImages.length}`);
        } else {
          return makeErrorResponse(
            "PDF_RENDER_FAILED",
            "Unable to reliably read this medical report PDF. Please ensure the document is clear and contains medical lab parameters.",
            400,
            reqId
          );
        }
      }
    }

    let targetLang = bodyLang || "en";
    if (userId !== "guest") {
      try {
        const dbUser = await User.findById(userId);
        if (dbUser?.settings?.language) {
          targetLang = dbUser.settings.language;
        }
      } catch {
        console.log("DB User fetch fallback in scanner");
      }
    }

    const langName = targetLang === "hi" ? "Hindi (हिंदी)" : "English";

    if (!reportText && extractedImages.length === 0) {
      return makeErrorResponse(
        "IMAGE_PREPARATION_FAILED",
        "Please provide a report image or report text to analyze.",
        400,
        reqId
      );
    }
    let extractedDataJson = null;

    // STAGE A: STRUCTURED EXTRACTION
    if (extractedImages.length > 0) {
      try {
        extractedDataJson = await extractMedicalDataFromImage(extractedImages, groq, reqId);
      } catch (visionErr: unknown) {
        const totalDuration = (Date.now() - reqStartTime) / 1000;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = visionErr as any;
        const errCode = String(err?.message || "");

        console.error(`[ReportAnalyzer] requestId=${reqId} stage=vision-failed duration=${totalDuration.toFixed(2)}s errorCode=${errCode}`, visionErr);

        if (!reportText || reportText.trim().length < 10) {
          if (errCode === "TIMEOUT") {
            return makeErrorResponse(
              "TIMEOUT",
              "Report analysis took too long. Please try again with a smaller or clearer file.",
              504,
              reqId
            );
          }
          if (errCode === "VISION_EMPTY_RESPONSE") {
            return makeErrorResponse(
              "VISION_EMPTY_RESPONSE",
              "The AI service returned no usable analysis. Please try again.",
              400,
              reqId
            );
          }
          if (errCode === "VISION_JSON_FAILED") {
            return makeErrorResponse(
              "VISION_JSON_FAILED",
              "The report was read, but its data could not be structured reliably. Please try again with a clearer image.",
              400,
              reqId
            );
          }
          if (errCode === "VISION_SCHEMA_FAILED") {
            return makeErrorResponse(
              "VISION_SCHEMA_FAILED",
              "The report data structure could not be validated cleanly. Please try again.",
              400,
              reqId
            );
          }

          return makeErrorResponse(
            "VISION_REQUEST_FAILED",
            "The AI analysis service could not process this report. Please try again.",
            503,
            reqId
          );
        }
      }
    }

    // If Vision didn't run or yielded 0 parameters, run Structured Text Extraction with 12s timeout
    if ((!extractedDataJson || !extractedDataJson.parameters || extractedDataJson.parameters.length === 0) && reportText && reportText.trim().length >= 10) {
      const textExtractStartTime = Date.now();
      try {
        console.log(`[ReportAnalyzer] requestId=${reqId} stage=text-extraction-started`);
        const textExtractionPrompt = `
You are a highly accurate Medical Lab Report Data Extractor.
Extract the raw data from the provided medical report text. Do NOT invent any values or reference ranges.
If a field is not present in the text, use null.
Return STRICT JSON ONLY.

JSON Schema:
{
  "reportTitle": "Title of the report or test",
  "reportDate": "Date on report",
  "patientName": "Name of patient",
  "parameters": [
    {
      "name": "Parameter Name",
      "value": "Value",
      "unit": "Unit if present",
      "referenceRange": "Reference range if present"
    }
  ],
  "observations": ["Any other text notes"],
  "rawSummary": "A brief summary of what the report text contains"
}

Text to extract from:
"""
${reportText}
"""
`;
        const textCall = groq.chat.completions.create({
          model: getGroqModel(),
          messages: [{ role: "user", content: textExtractionPrompt }],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });

        const textExtraction = await withTimeout(textCall, 12000, "Text extraction timed out");
        const rawExtraction = textExtraction.choices[0]?.message?.content || "{}";
        const parseRes = parseJsonSafely(rawExtraction);
        extractedDataJson = parseRes.parsed;
        const textDuration = (Date.now() - textExtractStartTime) / 1000;
        console.log(`[ReportAnalyzer] requestId=${reqId} stage=text-extraction-completed duration=${textDuration.toFixed(2)}s parametersCount=${extractedDataJson.parameters?.length || 0}`);
      } catch (textExtractErr: unknown) {
        console.error(`[ReportAnalyzer] requestId=${reqId} stage=text-extraction-failed:`, textExtractErr);
        extractedDataJson = {
          reportTitle: "Medical Report",
          reportDate: null,
          patientName: null,
          parameters: [],
          observations: [reportText],
          rawSummary: "Fallback raw text processing"
        };
      }
    }

    // Fallback line parser if AI JSON returned 0 parameters but reportText has lab lines
    if ((!extractedDataJson || !extractedDataJson.parameters || extractedDataJson.parameters.length === 0) && reportText && reportText.trim().length >= 10) {
      const lines = reportText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedParams: any[] = [];
      
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9\s%\-_/]+)[:=]\s*([<>]?\s*-?\d+\.?\d*)\s*([a-zA-Z%/^3µ_]*)\s*(?:\(([^)]+)\))?/);
        if (match) {
          parsedParams.push({
            name: match[1].trim(),
            value: match[2].trim(),
            unit: match[3]?.trim() || "",
            referenceRange: match[4]?.trim() || "Not Available"
          });
        }
      }

      if (parsedParams.length > 0) {
        extractedDataJson = {
          reportTitle: "Medical Lab Report",
          reportDate: null,
          patientName: null,
          parameters: parsedParams,
          observations: [reportText],
          rawSummary: "Extracted from document text lines"
        };
      }
    }

    const analysisSourceText = reportText || (extractedDataJson ? JSON.stringify(extractedDataJson, null, 2) : "");

    // Anti-hallucination validation on raw inputs
    if (analysisSourceText.includes("I will analyze the report") || analysisSourceText.includes("Based on the provided medical report input data") || analysisSourceText.includes("Image base64 report provided for analysis")) {
      return makeErrorResponse(
        "UNREADABLE_REPORT",
        "Invalid report content detected. Please upload an actual medical report.",
        400,
        reqId
      );
    }

    if (!extractedDataJson || !extractedDataJson.parameters || extractedDataJson.parameters.length === 0) {
      return makeErrorResponse(
        "UNREADABLE_REPORT",
        "Unable to reliably read this medical report. Please ensure the document is clear and contains medical lab parameters.",
        400,
        reqId
      );
    }

    // Process and classify parameters deterministically
    const medStartTime = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedParameters: any[] = [];
    for (const param of extractedDataJson.parameters) {
      if (!param || !param.name) continue;

      const rawVal = param.value !== null && param.value !== undefined ? String(param.value) : "";
      const rawRange = param.referenceRange !== null && param.referenceRange !== undefined ? String(param.referenceRange) : "";
      const rawUnit = param.unit !== null && param.unit !== undefined ? String(param.unit) : "";

      let unit = rawUnit.trim();
      let displayVal = rawVal.trim();
      
      if (!unit && displayVal) {
        const unitMatch = displayVal.match(/(-?\d+\.?\d*)\s*([a-zA-Z%/^3µ_]+.*)$/);
        if (unitMatch) {
          displayVal = unitMatch[1];
          unit = unitMatch[2].trim();
        }
      }

      let cleanValStr = displayVal;
      if (cleanValStr.match(/^\d+,\d+/)) {
        cleanValStr = cleanValStr.replace(/,/g, "");
      }

      let status = determineStatus(param.name, cleanValStr, rawRange);
      if (status !== "Normal" && status !== "Unknown" && (param.status === "Critical" || String(param.status).toLowerCase() === "critical")) {
        status = "Critical";
      }

      let normalRangeToDisplay = rawRange;
      if (!normalRangeToDisplay || normalRangeToDisplay.trim() === "" || normalRangeToDisplay.toLowerCase().includes("nil") || normalRangeToDisplay.toLowerCase().includes("n/a")) {
        normalRangeToDisplay = "Not Available";
      }

      normalizedParameters.push({
        name: param.name.trim(),
        value: displayVal + (unit ? " " + unit : ""),
        normalRange: normalRangeToDisplay,
        status: status,
        explanation: ""
      });
    }

    const medDuration = (Date.now() - medStartTime) / 1000;
    console.log(`[ReportAnalyzer] requestId=${reqId} stage=medical-validation duration=${medDuration.toFixed(2)}s validParamsCount=${normalizedParameters.length}`);

    if (normalizedParameters.length === 0) {
      return makeErrorResponse(
        "MEDICAL_VALIDATION_FAILED",
        "No laboratory parameters could be parsed from the report.",
        400,
        reqId
      );
    }

    const structuredResultForAI = {
      reportTitle: extractedDataJson.reportTitle || "Medical Lab Report",
      reportDate: extractedDataJson.reportDate || null,
      patientName: extractedDataJson.patientName || null,
      parameters: normalizedParameters.map(p => ({
        name: p.name,
        value: p.value,
        normalRange: p.normalRange,
        status: p.status
      })),
      observations: extractedDataJson.observations || []
    };

    const aiExplanationStartTime = Date.now();
    
    const explanationPrompt = `
You are AarogyaMitra AI's Medical Lab Report & Prescription Explainer.
Explain the following structured medical lab report parameters to the user in a safe, patient-friendly, and medically conservative manner in ${langName}.

Structured Lab Report:
"""
${JSON.stringify(structuredResultForAI, null, 2)}
"""

Target Output Language: ${langName}

INSTRUCTIONS:
1. Provide a clear, human-readable Title for this report in ${langName}.
2. Summarize the patient's condition in simple terms in ${langName}.
3. For each parameter in the list, write a short, plain-language explanation of what it is and what its status means in ${langName}.
   - For NORMAL parameters: just explain what the parameter represents. Do NOT describe it as high, low, or abnormal.
   - For ABNORMAL parameters (High/Low/Critical): explain what the deviation means and potential common (non-fatal) reasons.
   - For UNKNOWN parameters: explain what the parameter is and state that it cannot be interpreted without a reference range.
4. List 3-4 clear, actionable lifestyle/dietary recommendations in ${langName}.
   - If ALL parameters are Normal, suggest general healthy habits. Do NOT suggest supplements or treatments for non-existent deficiencies.
5. Suggest the Specialist Doctor to consult in ${langName}.
   - If there are no clinically significant abnormalities (all parameters Normal or Unknown), suggest "General Physician" (or equivalent) for routine wellness correlation. Do NOT suggest Specialist referals unnecessarily.
6. Generate a simple action plan (3-5 items) in ${langName}.
7. If any parameter has "status": "Critical", write a clear emergency warning in the "emergencyWarning" field in ${langName}. Otherwise, leave "emergencyWarning" empty.
8. Do NOT invent disease probabilities or definitive diagnoses.
   - If ALL parameters are Normal, the "diseaseProbability" array MUST be empty. 
   - Never diagnose a condition like "Anemia" or "Infection" solely from normal values.

CRITICAL: Return ONLY valid JSON in the exact structure specified below:
{
  "title": "Report Title",
  "summary": "Summary in ${langName}",
  "specialistToConsult": "Specialist Type",
  "parameters": [
    {
      "name": "Parameter Name",
      "explanation": "Plain language explanation in ${langName}"
    }
  ],
  "recommendations": ["Recommendation 1"],
  "diseaseProbability": [
    { "disease": "Condition Name", "probability": "Low|Medium|High" }
  ],
  "confidenceScore": 95,
  "actionPlan": ["Action step 1"],
  "emergencyWarning": "Emergency message if critical, else empty string"
}
`;

    interface AnalysisResult {
      title: string;
      summary: string;
      specialistToConsult: string;
      parameters: {
        name: string;
        value: string;
        normalRange: string;
        status: string;
        explanation: string;
      }[];
      recommendations: string[];
      diseaseProbability: {
        disease: string;
        probability: string;
      }[];
      confidenceScore: number;
      actionPlan: string[];
      emergencyWarning: string;
      _id?: string;
    }

    let finalAnalysisResult: AnalysisResult | null = null;
    try {
      const messages: { role: "user" | "system" | "assistant"; content: string }[] = [
        {
          role: "user",
          content: explanationPrompt,
        },
      ];

      const explanationCall = groq.chat.completions.create({
        model: getGroqModel(),
        messages: messages,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const analysisCompletion = await withTimeout(explanationCall, 15000, "AI explanation stage timed out");
      const rawAnalysis = analysisCompletion.choices[0]?.message?.content || "{}";
      const parseRes = parseJsonSafely(rawAnalysis);
      const explanationResult = parseRes.parsed;
      const aiDuration = (Date.now() - aiExplanationStartTime) / 1000;
      console.log(`[ReportAnalyzer] requestId=${reqId} stage=ai-explanation duration=${aiDuration.toFixed(2)}s`);

      // Merge and enforce deterministic values/statuses
      const finalParameters = normalizedParameters.map(normParam => {
        const matchingExplain = explanationResult.parameters?.find((p: { name?: string; explanation?: string } | null | undefined) => 
          p && typeof p === "object" && p.name && String(p.name).toLowerCase() === normParam.name.toLowerCase()
        );
        
        let explanation = matchingExplain?.explanation || "";
        if (!explanation) {
          if (normParam.status === "Normal") {
            explanation = targetLang === "hi" 
              ? `आपका ${normParam.name} स्तर सामान्य सीमा के भीतर है।` 
              : `Your ${normParam.name} level is within the normal range.`;
          } else if (normParam.status === "Unknown") {
            explanation = targetLang === "hi" 
              ? `संदर्भ सीमा की अनुपस्थिति के कारण इस पैरामीटर का विश्लेषण नहीं किया जा सका।` 
              : `Unable to interpret this parameter as no reference range was provided in the report.`;
          } else {
            explanation = targetLang === "hi" 
              ? `आपका ${normParam.name} स्तर सामान्य सीमा से ${normParam.status === "High" ? "अधिक" : "कम"} है। कृपया डॉक्टर से संपर्क करें।` 
              : `Your ${normParam.name} level is ${normParam.status.toLowerCase()} compared to the reference range. Please consult your physician.`;
          }
        }

        if (normParam.status === "Normal") {
          explanation = explanation
            .replace(/abnormal|high|low|critical|elevated|decreased/gi, "normal")
            .replace(/असामान्य|उच्च|कम|गंभीर/g, "सामान्य");
        }

        return {
          name: normParam.name,
          value: normParam.value,
          normalRange: normParam.normalRange,
          status: normParam.status,
          explanation: explanation
        };
      });

      const hasAbnormalities = finalParameters.some(p => p.status === "High" || p.status === "Low" || p.status === "Critical");
      let finalDiseaseProbability = explanationResult.diseaseProbability || [];
      let finalSpecialist = explanationResult.specialistToConsult || "General Physician";

      // 1. AI Safety Guards for disease probability
      const hbParam = finalParameters.find(p => {
        const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return norm === "hb" || norm.includes("hemoglobin") || norm.includes("haemoglobin");
      });
      const isHbLow = hbParam && (hbParam.status === "Low" || hbParam.status === "Critical");
      
      const wbcParam = finalParameters.find(p => {
        const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return norm === "wbc" || norm.includes("whitebloodcell") || norm.includes("leukocyte") || norm.includes("tlc");
      });
      const isWbcHigh = wbcParam && (wbcParam.status === "High" || wbcParam.status === "Critical");

      finalDiseaseProbability = finalDiseaseProbability.filter((dp: { disease?: string; probability?: string }) => {
        if (!dp || !dp.disease) return false;
        const diseaseNorm = dp.disease.toLowerCase();
        
        if (diseaseNorm.includes("anemia") || diseaseNorm.includes("anaemia")) {
          return !!isHbLow;
        }
        
        if (diseaseNorm.includes("infection")) {
          return !!isWbcHigh;
        }
        
        return true;
      });

      // 2. Specialist Recommendation Guard
      const abnormalParams = finalParameters.filter(p => p.status === "High" || p.status === "Low" || p.status === "Critical");
      if (abnormalParams.length === 0) {
        finalSpecialist = targetLang === "hi" ? "जनरल फिजिशियन (General Physician)" : "General Physician";
      } else {
        let isSpecialistSupported = false;
        const specLower = finalSpecialist.toLowerCase();
        
        if (specLower.includes("general") || specLower.includes("physician") || specLower.includes("doctor")) {
          isSpecialistSupported = true;
        } else if (specLower.includes("hematologist") || specLower.includes("haematologist")) {
          const hasHemAbnormality = abnormalParams.some(p => {
            const n = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            return n === "hb" || n === "rbc" || n === "wbc" || n.includes("platelet") || n.includes("plt") || n.includes("hemoglobin") || n.includes("mcv") || n.includes("mch");
          });
          if (hasHemAbnormality) isSpecialistSupported = true;
        } else if (specLower.includes("cardiologist")) {
          const hasCardioAbnormality = abnormalParams.some(p => {
            const n = p.name.toLowerCase();
            return n.includes("cholesterol") || n.includes("lipid") || n.includes("triglyceride") || n.includes("ldl") || n.includes("hdl");
          });
          if (hasCardioAbnormality) isSpecialistSupported = true;
        } else if (specLower.includes("endocrinologist") || specLower.includes("diabetologist")) {
          const hasEndocrineAbnormality = abnormalParams.some(p => {
            const n = p.name.toLowerCase();
            return n.includes("glucose") || n.includes("sugar") || n.includes("hba1c") || n.includes("thyroid") || n.includes("t3") || n.includes("t4") || n.includes("tsh");
          });
          if (hasEndocrineAbnormality) isSpecialistSupported = true;
        } else if (specLower.includes("nephrologist")) {
          const hasNephroAbnormality = abnormalParams.some(p => {
            const n = p.name.toLowerCase();
            return n.includes("creatinine") || n.includes("urea") || n.includes("bun") || n.includes("kidney");
          });
          if (hasNephroAbnormality) isSpecialistSupported = true;
        } else if (specLower.includes("hepatologist") || specLower.includes("gastroenterologist")) {
          const hasLiverAbnormality = abnormalParams.some(p => {
            const n = p.name.toLowerCase();
            return n.includes("bilirubin") || n.includes("sgot") || n.includes("sgpt") || n.includes("ast") || n.includes("alt") || n.includes("liver");
          });
          if (hasLiverAbnormality) isSpecialistSupported = true;
        }

        if (!isSpecialistSupported) {
          finalSpecialist = targetLang === "hi" 
            ? "इस समय प्रयोगशाला निष्कर्षों के आधार पर किसी विशेष डॉक्टर को दिखाने की आवश्यकता नहीं है।" 
            : "No specialist referral indicated based on these laboratory findings alone.";
        }
      }

      if (!hasAbnormalities) {
        finalDiseaseProbability = [];
        finalSpecialist = targetLang === "hi" ? "जनरल फिजिशियन (General Physician)" : "General Physician";
        
        const normalSummaryEn = "No laboratory parameters are outside the provided reference ranges. All values appear to be normal.";
        const normalSummaryHi = "कोई भी लैब पैरामीटर प्रदान की गई संदर्भ सीमाओं से बाहर नहीं है। सभी मान सामान्य प्रतीत होते हैं।";
        explanationResult.summary = targetLang === "hi" ? normalSummaryHi : normalSummaryEn;
      }

      // 3. Keep recommendations conservative and advisory
      const finalRecommendations = (explanationResult.recommendations || []).map((rec: string) => {
        return rec
          .replace(/diagnose|cure|treat your (anemia|infection|deficiency)/gi, "manage your health levels")
          .replace(/definitely|completely cure|treats/gi, "support")
          .replace(/निवारण करें|इलाज करें|ठीक करें/g, "स्वस्थ रखें");
      });

      finalAnalysisResult = {
        title: explanationResult.title || (targetLang === "hi" ? "चिकित्सा रिपोर्ट विश्लेषण" : "Medical Report Analysis"),
        summary: explanationResult.summary || "",
        specialistToConsult: finalSpecialist,
        parameters: finalParameters,
        recommendations: finalRecommendations,
        diseaseProbability: finalDiseaseProbability,
        confidenceScore: hasAbnormalities ? (explanationResult.confidenceScore || 85) : 100,
        actionPlan: explanationResult.actionPlan || [],
        emergencyWarning: hasAbnormalities ? (explanationResult.emergencyWarning || "") : ""
      };

    } catch (explanationErr) {
      console.error(`[ReportAnalyzer] requestId=${reqId} stage=ai-explanation-failed:`, explanationErr);
      
      const fallbackSummary = targetLang === "hi" 
        ? "रिपोर्ट का विश्लेषण सफलतापूर्वक पूरा हो गया है, लेकिन विस्तृत विवरण अस्थायी रूप से अनुपलब्ध है।" 
        : "The report was successfully processed, but the detailed explanation is temporarily unavailable.";
        
      finalAnalysisResult = {
        title: targetLang === "hi" ? "चिकित्सा रिपोर्ट विश्लेषण (ऑफ़लाइन)" : "Medical Report Analysis (Offline Fallback)",
        summary: fallbackSummary,
        specialistToConsult: targetLang === "hi" ? "जनरल फिजिशियन (General Physician)" : "General Physician",
        parameters: normalizedParameters,
        recommendations: targetLang === "hi" 
          ? ["डॉक्टर से संपर्क करें", "पर्याप्त पानी पिएं", "संतुलित आहार लें"] 
          : ["Consult a physician for diagnostic correlation", "Stay hydrated", "Maintain a balanced diet"],
        diseaseProbability: [],
        confidenceScore: 70,
        actionPlan: targetLang === "hi" 
          ? ["डॉक्टर से परामर्श लें"] 
          : ["Schedule a consult with your primary care physician to review these values"],
        emergencyWarning: normalizedParameters.some(p => p.status === "Critical") 
          ? (targetLang === "hi" ? "🚨 गंभीर मान पाया गया - तुरंत डॉक्टर से संपर्क करें!" : "🚨 Critical value detected - seek medical help immediately!") 
          : ""
      };
    }

    // Save report to database (Sample Isolation)
    if (userId !== "guest") {
      try {
        const savedReport = await ReportHistory.create({
          userId: userId,
          title: finalAnalysisResult.title,
          summary: finalAnalysisResult.summary,
          specialistToConsult: finalAnalysisResult.specialistToConsult,
          parameters: finalAnalysisResult.parameters,
          recommendations: finalAnalysisResult.recommendations,
          rawText: analysisSourceText,
          diseaseProbability: finalAnalysisResult.diseaseProbability,
          confidenceScore: finalAnalysisResult.confidenceScore,
          actionPlan: finalAnalysisResult.actionPlan,
          emergencyWarning: finalAnalysisResult.emergencyWarning,
          isSample: isSample === true,
        });

        finalAnalysisResult._id = savedReport._id;
        console.log(`[ReportAnalyzer] requestId=${reqId} historySaved=true`);
      } catch (dbErr) {
        console.error("Report database save error:", dbErr);
      }
    }

    const totalDuration = (Date.now() - reqStartTime) / 1000;
    console.log(`[ReportAnalyzer] requestId=${reqId} finalStatus=200 duration=${totalDuration.toFixed(2)}s`);

    return NextResponse.json({
      success: true,
      analysis: finalAnalysisResult,
      requestId: reqId,
    });
  } catch (error: unknown) {
    const totalDuration = (Date.now() - reqStartTime) / 1000;
    console.error(`[ReportAnalyzer] requestId=${reqId} finalStatus=500 duration=${totalDuration.toFixed(2)}s error:`, error);
    return makeErrorResponse(
      "UNKNOWN_REPORT_ERROR",
      error instanceof Error ? error.message : "Failed to analyze medical report",
      500,
      reqId
    );
  }
}
