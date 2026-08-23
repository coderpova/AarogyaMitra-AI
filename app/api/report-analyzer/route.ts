import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import ReportHistory from "@/models/ReportHistory";
import User from "@/models/User";
import { extractImagesFromPDF } from "@/lib/pdfImageExtractor";
import { getAuthUserId, getJwtSecret } from "@/lib/jwtHelper";
import { getGroqModel, getGroqClient } from "@/lib/groqConfig";

const groq = getGroqClient();

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

// Helper function for Vision API as requested
async function extractMedicalDataFromImage(extractedImages: { base64: string; mimeType: string }[], groqInstance: Groq) {
  if (extractedImages.length > 2) {
    extractedImages = extractedImages.slice(0, 2);
    console.log(`[ReportAnalyzer] Truncated extractedImages to 2 to prevent token rate limits.`);
  }

  console.log(`[ReportAnalyzer] visionBatch=${extractedImages.length}`);
  const extractionPrompt = `
You are a highly accurate Medical Lab Report Data Extractor.
Extract the raw data from the provided medical report images. Do NOT invent any values.
If a field is not visible, use null.
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
      "referenceRange": "Reference range if present",
      "status": "e.g., Normal, High, Low"
    }
  ],
  "observations": ["Any other text notes"],
  "rawSummary": "A brief summary of what the report text contains"
}
`;
  
  const extractedDataJson: ExtractedReportData = {
    reportTitle: null,
    reportDate: null,
    patientName: null,
    parameters: [],
    observations: [],
    rawSummary: ""
  };

  const BATCH_SIZE = 2; // Groq limit prevention
  for (let i = 0; i < extractedImages.length; i += BATCH_SIZE) {
    const batchImages = extractedImages.slice(i, i + BATCH_SIZE);
    const imageContents = batchImages.map(img => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
    }));

    const visionCompletion = await groqInstance.chat.completions.create({
      model: getGroqModel(),
      messages: [
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

    const rawExtraction = visionCompletion.choices[0]?.message?.content || "{}";
    console.log(`[ReportAnalyzer] visionResponseLength=${rawExtraction.length}`);
    const cleanExtractionJson = rawExtraction.replace(/```json/g, "").replace(/```/g, "").trim();
    const batchJson = JSON.parse(cleanExtractionJson);
    
    if (batchJson.parameters && Array.isArray(batchJson.parameters)) {
        extractedDataJson.parameters.push(...batchJson.parameters);
    }
    if (batchJson.observations && Array.isArray(batchJson.observations)) {
        extractedDataJson.observations.push(...batchJson.observations);
    }
    if (batchJson.reportTitle && !extractedDataJson.reportTitle) extractedDataJson.reportTitle = batchJson.reportTitle;
    if (batchJson.reportDate && !extractedDataJson.reportDate) extractedDataJson.reportDate = batchJson.reportDate;
    if (batchJson.patientName && !extractedDataJson.patientName) extractedDataJson.patientName = batchJson.patientName;
    if (batchJson.rawSummary) extractedDataJson.rawSummary += (extractedDataJson.rawSummary ? " " : "") + batchJson.rawSummary;
  }
  
  console.log(`[ReportAnalyzer] structuredParameters=${extractedDataJson.parameters.length}`);
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
  try {
    await connectDB();

    const userId = getAuthUserId(request) || "guest";

    const body = await request.json();
    let { reportText, imageBase64 } = body;
    const { language: bodyLang, isSample } = body;

    let mimeType = "unknown";
    let bytes = 0;
    if (imageBase64) {
      mimeType = imageBase64.split(";")[0];
      bytes = imageBase64.length;
    }
    
    console.log(`[ReportAnalyzer] mime=${mimeType}`);
    console.log(`[ReportAnalyzer] bytes=${bytes}`);

    let extractedImages: { base64: string; mimeType: string }[] = [];
    
    // 1. PDF HANDLING - TWO PATHS
    if (imageBase64 && imageBase64.startsWith("data:application/pdf")) {
      try {
        const base64Data = imageBase64.split(",")[1];
        const pdfBuffer = Buffer.from(base64Data, "base64");
        
        const isPdf = pdfBuffer.slice(0, 4).toString() === "%PDF";
        if (!isPdf) {
          return NextResponse.json(
            { error: "The uploaded file is not a valid PDF." },
            { status: 400 }
          );
        }

        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(pdfBuffer);
        
        const extracted = pdfData.text || "";
        const cleanedText = extracted.trim();
        
        console.log(`[ReportAnalyzer] pdfTextLength=${cleanedText.length}`);
        
        // Path A: Text PDF
        if (cleanedText.length >= 50 && cleanedText.match(/[a-zA-Z0-9]{20,}/)) {
          console.log(`[ReportAnalyzer] pdfType=TEXT_PDF`);
          reportText = (reportText ? reportText + "\n" : "") + cleanedText;
          imageBase64 = null; // Unset so we don't trigger Vision API
        } 
        // Path B: Scanned PDF
        else {
          console.log(`[ReportAnalyzer] pdfType=SCANNED_PDF`);
          const images = await extractImagesFromPDF(pdfBuffer);
          
          if (images.length > 0) {
            extractedImages = images;
            console.log(`[ReportAnalyzer] extractedImages=${images.length}`);
            imageBase64 = null; // Unset the PDF base64 since we'll use extractedImages instead
          } else {
            console.log(`[ReportAnalyzer] Extraction failed: No usable images found in scanned PDF.`);
            return NextResponse.json(
              { error: "Unable to reliably read this medical report. Please upload a clearer PDF/image." },
              { status: 400 }
            );
          }
        }
      } catch (pdfErr) {
        console.error("PDF parse error:", pdfErr);
        return NextResponse.json(
          { error: "Failed to read the PDF file. Please upload a valid document or image." },
          { status: 400 }
        );
      }
    } 
    // Image Upload Handling (JPG, PNG)
    else if (imageBase64 && imageBase64.startsWith("data:image/")) {
      const mimeType = imageBase64.split(";")[0].split(":")[1];
      const base64Data = imageBase64.split(",")[1];
      extractedImages.push({ base64: base64Data, mimeType });
      imageBase64 = null; // Handled
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
      return NextResponse.json(
        { error: "Please provide a report image or report text to analyze." },
        { status: 400 }
      );
    }
    let extractedDataJson = null;

    // STAGE A: STRUCTURED EXTRACTION
    if (extractedImages.length > 0) {
      try {
        extractedDataJson = await extractMedicalDataFromImage(extractedImages, groq);
      } catch (visionErr: unknown) {
        console.error("Vision API Error:", visionErr);
        const err = visionErr as { message?: string; status?: number; error?: { error?: { code?: string; message?: string } } };
        let errorMessage = "Unable to extract readable medical information from this report. Please upload a clearer PDF/image.";
        let statusCode = 400;
        if (err?.error?.error?.code === 'rate_limit_exceeded' || err?.status === 429) {
          errorMessage = "This medical report is too long and exceeds the AI processing token limits. Please upload a shorter report or fewer pages.";
        } else if (err?.error?.error?.code === 'model_not_found' || err?.status === 404 || err?.status === 500 || err?.status === 503) {
          errorMessage = "Report analysis service is currently experiencing technical difficulties. Please try again shortly.";
          statusCode = 500;
        } else if (err?.message) {
          errorMessage = "Report analysis failed during image processing. " + (err.error?.error?.message || err.message);
        }
        return NextResponse.json({ error: errorMessage }, { status: statusCode });
      }
    } else if (reportText && reportText.trim().length >= 30) {
      try {
        console.log(`[ReportAnalyzer] textExtractionStarted=true`);
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
        const textExtraction = await groq.chat.completions.create({
          model: getGroqModel(),
          messages: [{ role: "user", content: textExtractionPrompt }],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });

        const rawExtraction = textExtraction.choices[0]?.message?.content || "{}";
        const cleanExtractionJson = rawExtraction.replace(/```json/g, "").replace(/```/g, "").trim();
        extractedDataJson = JSON.parse(cleanExtractionJson);
        console.log(`[ReportAnalyzer] textStructuredParameters=${extractedDataJson.parameters?.length || 0}`);
      } catch (textExtractErr: unknown) {
        console.error("Text Extraction Error:", textExtractErr);
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

    const analysisSourceText = reportText || (extractedDataJson ? JSON.stringify(extractedDataJson, null, 2) : "");

    // Anti-hallucination validation on raw inputs
    if (analysisSourceText.includes("I will analyze the report") || analysisSourceText.includes("Based on the provided medical report input data") || analysisSourceText.includes("Image base64 report provided for analysis")) {
      console.log(`[ReportAnalyzer] Extraction result validated: FAILED (Hallucination detected)`);
      return NextResponse.json(
        { error: "Invalid report content detected. Please upload an actual medical report." },
        { status: 400 }
      );
    }

    if (!extractedDataJson || !extractedDataJson.parameters || extractedDataJson.parameters.length === 0) {
      console.log(`[ReportAnalyzer] Extraction result validated: FAILED (No parameters found)`);
      return NextResponse.json(
        { error: "Unable to reliably read this medical report. Please upload a clearer PDF/image." },
        { status: 400 }
      );
    }

    console.log(`[ReportAnalyzer] Extraction result validated: SUCCESS`);

    // Process and classify parameters deterministically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedParameters: any[] = [];
    for (const param of extractedDataJson.parameters) {
      if (!param.name) continue;

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

    if (normalizedParameters.length === 0) {
      return NextResponse.json(
        { error: "No laboratory parameters could be parsed from the report." },
        { status: 400 }
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

    console.log(`[ReportAnalyzer] analysisStarted=true`);
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

      const analysisCompletion = await groq.chat.completions.create({
        model: getGroqModel(),
        messages: messages,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const rawAnalysis = analysisCompletion.choices[0]?.message?.content || "{}";
      const cleanJson = rawAnalysis.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      const explanationResult = JSON.parse(cleanJson);

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
      console.error("AI Explanation Stage Failed:", explanationErr);
      
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
        console.log(`[ReportAnalyzer] historySaved=true`);
      } catch (dbErr) {
        console.error("Report database save error:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: finalAnalysisResult,
    });
  } catch (error: unknown) {
    console.error("Report Analyzer API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze medical report",
      },
      { status: 500 }
    );
  }
}
