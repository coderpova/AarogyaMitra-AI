import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import ReportHistory from "@/models/ReportHistory";

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
    const { reportText, imageBase64 } = body;

    if (!reportText && !imageBase64) {
      return NextResponse.json(
        { message: "Please provide a report image or report text to analyze." },
        { status: 400 }
      );
    }

    // Prepare content for Groq model
    let promptText = `
You are AarogyaMitra AI's Medical Lab Report & Prescription Diagnostic Scanner.
Analyze the following medical report content / raw lab test text and extract all diagnostic markers.

Medical Report Input Data:
"${reportText || "Image base64 report provided for analysis."}"

Instructions:
1. Provide a clear, human-readable Title for this report (e.g., "Lipid Profile Test Report", "Diabetes HbA1c Lab Report", "Doctor Prescription").
2. Summarize the patient's condition in simple, empathetic Hinglish/English terms. Avoid medical jargon where possible.
3. Extract each test parameter into structured JSON array with:
   - name: Parameter Name (e.g., "HbA1c", "Fasting Blood Sugar", "Serum Creatinine", "TSH")
   - value: Observed value with units (e.g., "8.2%", "154 mg/dL")
   - normalRange: Standard reference range (e.g., "4.0 - 5.6%", "70 - 99 mg/dL")
   - status: Exactly one of ["Normal", "High", "Low", "Critical"]
4. List 3-4 clear, actionable dietary & lifestyle recommendations or warnings.
5. Suggest the type of Specialist Doctor the patient should consult (e.g., "Endocrinologist", "Cardiologist", "Nephrologist", "General Physician").

CRITICAL: Return ONLY valid JSON in the exact structure specified below. Do not wrap in markdown code blocks if possible, or return strictly valid JSON:
{
  "title": "Report Title",
  "summary": "Plain language summary of patient report findings...",
  "specialistToConsult": "Specialist Type",
  "parameters": [
    {
      "name": "Parameter Name",
      "value": "Value with unit",
      "normalRange": "Reference range",
      "status": "Normal"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
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

    let modelName = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.1-8b-instant";

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: 0.2,
        max_tokens: 1000,
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
        max_tokens: 1000,
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
