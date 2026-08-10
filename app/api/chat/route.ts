import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";
import User from "@/models/User";
import { getAIContext } from "@/lib/aiContext";
import { detectEmergency, buildDoctorSystemPrompt } from "@/lib/healthAssistant";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      message,
      userId,
      language: bodyLang,
      history,
      reportContext,
      conversationId,
      title,
    } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json(
        { message: "Message required" },
        { status: 400 }
      );
    }

    // Determine user's selected language from DB or request payload
    let selectedLang = bodyLang || "en";

    await connectDB();

    let authenticatedUserId = null;
    const authHeader = req.headers.get("authorization");
    let token = authHeader ? authHeader.split(" ")[1] : null;

    if (!token) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;)\s*token\s*=\s*([^;]+)/);
      token = match ? match[1] : null;
    }

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        authenticatedUserId = decoded.userId;
      } catch (err) {
        // ignore invalid token
      }
    }

    const resolvedUserId = authenticatedUserId || "guest";

    if (resolvedUserId && resolvedUserId !== "guest") {
      try {
        const dbUser = await User.findById(resolvedUserId);
        if (dbUser?.settings?.language) {
          selectedLang = dbUser.settings.language;
        }
      } catch (userErr) {
        console.error("User language lookup fallback:", userErr);
      }
    }

    // ── EMERGENCY PRE-CHECK ───────────────────────────────────────────────────
    const emergency = detectEmergency(message);
    if (emergency.isEmergency) {
      const emergencyReply =
        selectedLang === "hi"
          ? emergency.responseHi || emergency.responseEn || ""
          : emergency.responseEn || "";

      // Save emergency interaction to DB
      try {
        await Chat.create({
          userId: resolvedUserId,
          message: message,
          reply: emergencyReply,
          conversationId: conversationId || undefined,
          title: title || undefined,
        });
      } catch (dbError) {
        console.error("Mongo Save Error:", dbError);
      }

      return NextResponse.json({
        reply: emergencyReply,
        emergency: true,
        suggestions:
          selectedLang === "hi"
            ? ["अस्पताल खोजें|112 पर कॉल करें|प्राथमिक उपचार".split("|")[0], "112 पर कॉल करें", "प्राथमिक उपचार"]
            : ["Find Hospital", "Call 112", "First Aid"],
      });
    }

    // ── AI USER CONTEXT ────────────────────────────────────────────────────────
    let userContext = "";
    if (resolvedUserId && resolvedUserId !== "guest") {
      try {
        userContext = await getAIContext(resolvedUserId);
      } catch (error) {
        console.error("AI Context Error:", error);
      }
    }

    // ── BUILD DOCTOR SYSTEM PROMPT ─────────────────────────────────────────────
    const systemPrompt = buildDoctorSystemPrompt(
      selectedLang,
      userContext,
      reportContext
    );

    // Build messages array with conversation history
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent conversation history (last 10 messages for context)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user") {
          messages.push({ role: "user", content: msg.text });
        } else if (msg.role === "ai") {
          messages.push({ role: "assistant", content: msg.text });
        }
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // ── STREAMING GROQ RESPONSE ────────────────────────────────────────────────
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: messages as any,
      temperature: 0.5,
      max_tokens: 1000,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullReply += content;
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();

          // Save full reply to MongoDB after streaming completes
          try {
            await Chat.create({
              userId: resolvedUserId,
              message: message,
              reply: fullReply,
              conversationId: conversationId || undefined,
              title: title || undefined,
            });
          } catch (dbError) {
            console.error("Mongo Save Error:", dbError);
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("GROQ ERROR:", error);
    return NextResponse.json(
      { message: "AI response failed" },
      { status: 500 }
    );
  }
}
