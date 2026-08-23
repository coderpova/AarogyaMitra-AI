// frontend/app/api/chat/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Chat from "@/models/chat";
import User from "@/models/User";
import { getAIContext } from "@/lib/aiContext";
import { detectEmergency, buildDoctorSystemPrompt, parseSuggestedReplies } from "@/lib/healthAssistant";
import { parseActionTags, stripActionTags, executeBookAppointment, executeFindHospital, handleChatAction, detectLanguageStyle } from "@/lib/chatActions";
import { isMedicalQuery, retrieveKnowledge, resolveContextualQuery } from "@/lib/ragService";
import { validateMedicalSafety } from "@/lib/safetyValidator";
import { resolvePersonalHealthContext } from "@/lib/personalHealthContext";
import { signJwt, verifyJwt } from "@/lib/jwtHelper";
import { enforceRequestSize } from "@/lib/requestSizeValidator";
import { rateLimit } from "@/lib/rateLimiter";
import logger from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { mongoFallbackMessage, groqFallbackMessage, ragFallbackMessage, safetyFallbackMessage } from "@/lib/degradedMode";


function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY || "";
  return new Groq({ apiKey });
}

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

    let authenticatedUserId: string | null = null;
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
        // invalid token
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in to chat." },
        { status: 401 }
      );
    }

    // ── EMERGENCY PRE-CHECK (IMMEDIATE BYPASS BEFORE DB / RAG / PHC / GROQ) ─
    const emergency = detectEmergency(message);
    if (emergency.isEmergency) {
      const emergencyReply =
        selectedLang === "hi"
          ? emergency.responseHi || emergency.responseEn || ""
          : emergency.responseEn || "";

      // Asynchronously attempt saving emergency interaction to DB (non-blocking for response)
      try {
        await connectDB();
        await Chat.create({
          userId: authenticatedUserId,
          message: message,
          reply: emergencyReply,
          conversationId: conversationId || undefined,
          title: title || undefined,
        });
      } catch (dbError) {
        console.error("[Emergency] Mongo Save Error:", dbError);
      }

      return NextResponse.json({
        reply: emergencyReply,
        emergency: true,
        suggestions:
          selectedLang === "hi"
            ? ["अस्पताल खोजें", "112 पर कॉल करें", "प्राथमिक उपचार"]
            : ["Find Hospital", "Call 112", "First Aid"],
      });
    }

    await connectDB();

    try {
      const dbUser = await User.findById(authenticatedUserId);
      if (dbUser?.settings?.language) {
        selectedLang = dbUser.settings.language;
      }
    } catch (userErr) {
      console.error("User language lookup fallback:", userErr);
    }

    // ── ACTION TOOL LAYER (SAFE SERVER-SIDE ACTIONS) ────────────────────────
    if (authenticatedUserId) {
      try {
        const dbUserForAction = await User.findById(authenticatedUserId);
        const actionResult = await handleChatAction(authenticatedUserId, message, dbUserForAction, history);
        if (actionResult.handled && actionResult.reply) {
          try {
            await Chat.create({
              userId: authenticatedUserId,
              userMessage: message,
              aiResponse: actionResult.reply,
              conversationId: conversationId || undefined,
              title: title || undefined,
            });
          } catch (histErr) {
            console.error("Action chat history save error:", histErr);
          }

          return NextResponse.json({
            reply: actionResult.reply,
            suggestions: parseSuggestedReplies(actionResult.reply),
            uiCard: actionResult.uiCard,
            actionExecuted: actionResult.action,
          });
        }
      } catch (actErr) {
        console.error("[ActionToolLayer] Action execution error:", actErr);
      }
    }

    // ── AI PERSONAL HEALTH CONTEXT (PHASE 3.5) ──────────────────────────────
    let personalContextText = "";
    let personalContextMeta: any = null;
    if (authenticatedUserId) {
      try {
        const phcResult = await resolvePersonalHealthContext({
          userId: authenticatedUserId,
          query: message,
          conversationContext: history,
        });

        if (phcResult.hasContext) {
          personalContextText = phcResult.contextText;
          personalContextMeta = {
            itemCount: phcResult.itemCount,
            resolvedTopic: phcResult.resolvedTopic,
            provenanceCount: phcResult.provenance.length,
          };
          console.log(`[PersonalHealthContext] Resolved ${phcResult.itemCount} authorized items for topic "${phcResult.resolvedTopic}"`);
        }
      } catch (phcErr) {
        console.error("[PersonalHealthContext] Context resolution error:", phcErr);
      }
    }

    // ── RETRIEVE MEDICAL KNOWLEDGE (RAG) ───────────────────────────────────────
    let knowledgeContext = "";
    let retrievedChunks: Array<{ title: string; content: string; category: string; tags: string[]; source: string; evidenceLevel: string; sourceUrl?: string; medicalTopic?: string }> = [];
    try {
      // 1. Resolve contextual medical query using history
      const resolvedQuery = resolveContextualQuery(message, history);

      // 2. Perform medical query detection on resolved query
      if (isMedicalQuery(resolvedQuery)) {
        // 3. Retrieve matching chunks using resolved query
        const chunks = await retrieveKnowledge(resolvedQuery, 3);
        if (chunks && chunks.length > 0) {
          retrievedChunks = chunks;
          knowledgeContext = chunks.map(chunk => 
            `[Document: ${chunk.title}]
- Source: ${chunk.source}
- Source URL: ${chunk.sourceUrl || "N/A"}
- Evidence Level: ${chunk.evidenceLevel}
- Medical Topic: ${chunk.medicalTopic || "General"}
- Content: ${chunk.content}`
          ).join("\n\n");
          console.log(`[RAG] Retrieved ${chunks.length} source-aware chunks for resolved query: "${resolvedQuery.substring(0, 30)}..."`);
        }
      }
    } catch (ragErr) {
      console.error("[RAG] Retrieval failed in route:", ragErr);
    }

    // ── BUILD DOCTOR SYSTEM PROMPT ─────────────────────────────────────────────
    const langStyle = detectLanguageStyle(message);
    let langInstruction = "";
    if (langStyle === "hinglish") {
      langInstruction = "\n\nCRITICAL LANGUAGE RULE: The user is writing in Hinglish (Hindi written in Roman script e.g. 'kl mne kitna pani piya'). You MUST respond in natural, clear Hinglish matching the user's communication style. Do NOT respond in plain English.";
    } else if (langStyle === "hindi_devanagari") {
      langInstruction = "\n\nCRITICAL LANGUAGE RULE: The user is writing in Hindi (Devanagari script). You MUST respond in Hindi (Devanagari script).";
    }

    const systemPrompt = buildDoctorSystemPrompt(
      selectedLang,
      "",
      reportContext,
      knowledgeContext,
      personalContextText
    ) + langInstruction;

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
    const groq = getGroqClient();
    const stream = await (groq.chat.completions as any).create({
      model: process.env.GROQ_MODEL || "qwen/qwen3.6-27b",
      messages: messages as any,
      temperature: 0.5,
      max_tokens: 1000,
      stream: true,
      reasoning_format: "hidden",
      reasoning_effort: "none",
    });

    const encoder = new TextEncoder();
    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          let isActionTag = false;
          let isThinkingTag = false;

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullReply += content;
              buffer += content;

              // Hide <think>...</think> or <thinking>...</thinking> reasoning blocks
              if (buffer.includes("<think>") || buffer.includes("<thinking>")) {
                isThinkingTag = true;
              }
              if (isThinkingTag) {
                if (buffer.includes("</think>") || buffer.includes("</thinking>")) {
                  buffer = buffer
                    .replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
                  isThinkingTag = false;
                } else {
                  // Keep buffering thinking block without enqueuing
                  continue;
                }
              }

              // Hide action tags while receiving
              if (buffer.includes("[")) {
                 if (buffer.includes("]") && !buffer.includes("[BOOK_APPOINTMENT") && !buffer.includes("[FIND_HOSPITAL") && !buffer.includes("[/BOOK_APPOINTMENT") && !buffer.includes("[/FIND_HOSPITAL")) {
                    isActionTag = false;
                 } else {
                    isActionTag = true;
                 }
              }
              
              if (!isActionTag) {
                 controller.enqueue(encoder.encode(buffer));
                 buffer = "";
              } else if (buffer.includes("[/BOOK_APPOINTMENT]") || buffer.includes("[/FIND_HOSPITAL]")) {
                 // Drop the tag from stream
                 isActionTag = false;
                 buffer = ""; 
              } else if (buffer.length > 500) {
                 // Safety valve
                 isActionTag = false;
                 controller.enqueue(encoder.encode(buffer));
                 buffer = "";
              }
            }
          }

          // Clean fullReply of thinking tags before safety validation & saving
          fullReply = fullReply
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
            .trim();

          // ── PHASE 2C: POST-GENERATION MEDICAL SAFETY VALIDATION ───────────────
          const safetyResult = validateMedicalSafety(
            message,
            fullReply,
            retrievedChunks,
            selectedLang
          );

          const safeReplyText = safetyResult.sanitizedText || fullReply;

          // Execute Actions after stream and safety validation
          const actions = parseActionTags(safeReplyText);
          let actionResultText = "";
          
          for (const action of actions) {
             if (action.actionType === "BOOK_APPOINTMENT") {
                const res = await executeBookAppointment(authenticatedUserId as string, action.params);
                actionResultText += res.message;
             } else if (action.actionType === "FIND_HOSPITAL") {
                actionResultText += await executeFindHospital(action.params);
             }
          }

          if (actionResultText) {
             controller.enqueue(encoder.encode(actionResultText));
          }

          const cleanedReply = stripActionTags(safeReplyText) + actionResultText;

          controller.close();

          // Save full reply to MongoDB after streaming completes
          try {
            await Chat.create({
              userId: authenticatedUserId,
              message: message,
              reply: cleanedReply,
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
