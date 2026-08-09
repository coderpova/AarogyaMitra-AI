import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import ReportHistory from "@/models/ReportHistory";
import User from "@/models/User";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const JWT_SECRET = process.env.JWT_SECRET as string;

// GET: Fetch report history
export async function GET(request: Request) {
  try {
    await connectDB();
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "No token provided", reports: [] },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const reports = await ReportHistory.find({ userId: decoded.userId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ reports }, { status: 200 });
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

    let userId = "guest";
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        if (decoded.userId) userId = decoded.userId;
      } catch (err) {
        console.log("Token decode skipped for guest scanner");
      }
    }

    const body = await request.json();
    const { reportText, imageBase64, language: bodyLang } = body;

    let targetLang = bodyLang || "en";
    if (userId) {
      try {
        await connectDB();
        const dbUser = await User.findById(userId);
        if (dbUser?.settings?.language) {
          targetLang = dbUser.settings.language;
        }
      } catch (e) {
        console.log("DB User fetch fallback in scanner:", e);
      }
    }

    const langName = targetLang === "hi" ? "Hindi (हिंदी)" : "English";

    if (!reportText && !imageBase64) {
      return NextResponse.json(
        { message: "Please provide a report image or report text to analyze." },
        { status: 400 }
      );
    }

    // Prepare content for Groq model
    const promptText = `
You are AarogyaMitra AI's Medical Lab Report & Prescription Diagnostic Scanner.
Analyze the following medical report content / raw lab test text and extract ALL diagnostic markers.

Medical Report Input Data:
"${reportText || "Image base64 report provided for analysis."}"

Target Output Language: ${langName}

OCR EXTRACTION INSTRUCTIONS:
- Extract ALL visible text from the report image or text input.
- Read every parameter name, value, unit, and reference range carefully.
- If any text is unclear or partially legible, make a best-effort extraction.
- If extraction is uncertain, reflect this in a lower confidenceScore.

ANALYSIS INSTRUCTIONS:
1. Provide a clear, human-readable Title for this report in ${langName}.
2. Summarize the patient's condition in simple, empathetic terms in ${langName}.
3. Extract each test parameter into structured JSON array with:
   - name: Parameter Name
   - value: Observed value with units
   - normalRange: Standard reference range
   - status: Exactly one of ["Normal", "High", "Low", "Critical"]
   - explanation: For any parameter that is NOT "Normal", provide a plain-language explanation of what this abnormal value means and why it matters. For Normal parameters, use empty string.
4. List 3-4 clear, actionable dietary & lifestyle recommendations in ${langName}.
5. Suggest the type of Specialist Doctor the patient should consult in ${langName}.
6. Generate diseaseProbability: an array of 2-4 possible conditions/diseases that match the abnormal parameters, each with a probability string like "High", "Moderate", "Low", or a percentage like "75%". Base this on medical knowledge of what these abnormal values typically indicate.
7. Generate confidenceScore: a number 0-100 indicating how confident you are in the extraction and analysis. Lower if image quality is poor or values are ambiguous.
8. Generate actionPlan: an array of 3-5 step-by-step action items the patient should take (e.g., "Schedule appointment with diabetologist within 1 week", "Reduce sugar intake immediately", "Repeat fasting blood sugar test after 2 weeks").
9. Generate emergencyWarning: if any parameter has status "Critical", provide a warning string telling the patient to seek immediate medical attention. If no critical values, use empty string.

CRITICAL: Return ONLY valid JSON in the exact structure specified below:
{
  "title": "Report Title",
  "summary": "Summary in ${langName}",
  "specialistToConsult": "Specialist Type",
  "parameters": [
    {
      "name": "Parameter Name",
      "value": "Value with unit",
      "normalRange": "Reference range",
      "status": "Normal",
      "explanation": ""
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "diseaseProbability": [
    { "disease": "Condition Name", "probability": "High" }
  ],
  "confidenceScore": 85,
  "actionPlan": [
    "Action step 1",
    "Action step 2"
  ],
  "emergencyWarning": ""
}
`;

    let messages: any[] = [
      {
        role: "user",
        content: promptText,
      },
    ];

    // If imageBase64 is supplied and we use Vision capability
    if (imageBase64) {
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ];
    }

    const modelName = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.1-8b-instant";

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
    } catch (apiError) {
      console.log("Fallback to text model due to vision model availability:", apiError);
      completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });
    }

    const rawContent = completion.choices[0]?.message?.content || "{}";
    let analysisResult: any;

    try {
      const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      analysisResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      analysisResult = {
        title: "Medical Report Analysis",
        summary: rawContent.slice(0, 300),
        specialistToConsult: "General Physician",
        parameters: [],
        recommendations: ["Please consult a certified doctor to review your lab test results."],
        diseaseProbability: [],
        confidenceScore: 30,
        actionPlan: ["Please consult a certified doctor to review your lab test results."],
        emergencyWarning: "",
      };
    }

    // Save report to database
    try {
      const savedReport = await ReportHistory.create({
        userId: userId,
        title: analysisResult.title || "Medical Report Analysis",
        summary: analysisResult.summary || "Report processed",
        specialistToConsult: analysisResult.specialistToConsult || "General Physician",
        parameters: analysisResult.parameters || [],
        recommendations: analysisResult.recommendations || [],
        rawText: reportText || "Uploaded Image",
        diseaseProbability: analysisResult.diseaseProbability || [],
        confidenceScore: analysisResult.confidenceScore || 0,
        actionPlan: analysisResult.actionPlan || [],
        emergencyWarning: analysisResult.emergencyWarning || "",
      });

      analysisResult._id = savedReport._id;
    } catch (dbErr) {
      console.error("Report database save error:", dbErr);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error: any) {
    console.error("Report Analyzer API Error:", error);
    return NextResponse.json(
      {
        message: error.message || "Failed to analyze medical report",
      },
      { status: 500 }
    );
  }
}
