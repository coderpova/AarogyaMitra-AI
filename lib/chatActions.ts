import connectDB from "./mongodb";
import User from "../models/User";
import Medicine from "../models/Medicine";
import Appointment from "../models/Appointment";
import ReportHistory from "../models/ReportHistory";
import HealthEvent from "../models/HealthEvent";

export interface ActionResult {
  handled: boolean;
  success?: boolean;
  action?: string;
  reply?: string;
  actionTag?: string;
  uiCard?: {
    type: "bmi" | "medicine" | "appointment" | "hospital" | "report";
    data: any;
  };
}

export function parseActionTags(text: string) {
  const actions: Array<{ actionType: string; params: Record<string, string> }> = [];

  // Match [ACTION:TYPE {json}] or [TYPE] {json} [/TYPE]
  const regex1 = /\[ACTION:([A-Z_]+)\s*({.*?})\]/g;
  let match;
  while ((match = regex1.exec(text)) !== null) {
    try {
      actions.push({ actionType: match[1], params: JSON.parse(match[2]) });
    } catch (e) {
      console.error("Action tag parse error:", e);
    }
  }

  const regex2 = /\[([A-Z_]+)\]\s*({[\s\S]*?})\s*\[\/\1\]/g;
  while ((match = regex2.exec(text)) !== null) {
    try {
      actions.push({ actionType: match[1], params: JSON.parse(match[2]) });
    } catch (e) {
      console.error("Action block parse error:", e);
    }
  }

  return actions;
}

export function stripActionTags(text: string): string {
  return text
    .replace(/\[ACTION:[A-Z_]+\s*{.*?}\]/g, "")
    .replace(/\[[A-Z_]+\][\s\S]*?\[\/[A-Z_]+\]/g, "")
    .trim();
}

export function detectLanguageStyle(text: string): "hinglish" | "hindi_devanagari" | "english" {
  if (!text) return "english";
  
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi_devanagari";
  }

  const lower = text.toLowerCase();
  const hinglishTokens = [
    "mne", "maine", "piya", "paani", "pani", "kitna", "kitni", "aaj", "ajj", "kal", "kl",
    "isko", "save kr", "save karo", "save kar", "tha", "thi", "the", "hai", "hu", "hoon",
    "kya", "batao", "bataen", "mera", "meri", "mere", "gilas", "gilaas", "karna", "krlo",
    "karlo", "do", "dena", "ho", "gaya", "gayi", "kuch"
  ];

  const words = lower.split(/\s+/);
  const hasHinglish = words.some((w) => hinglishTokens.includes(w)) || hinglishTokens.some((t) => lower.includes(t));
  if (hasHinglish) {
    return "hinglish";
  }

  return "english";
}

export function getTargetDateRange(target: "today" | "yesterday") {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target === "yesterday") {
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/**
 * Executes appointment booking against real MongoDB database and verifies creation.
 */
export async function executeBookAppointment(
  userId: string,
  params: Record<string, string>
): Promise<{ success: boolean; message: string; appointment?: any }> {
  if (!userId) {
    return { success: false, message: "❌ Authentication required to book appointments." };
  }
  await connectDB();
  try {
    const user = await User.findById(userId);

    const doctorName = params.doctorName || params.doctor || "General Physician";
    const hospital = params.hospital || "City Healthcare Center";
    
    let dateStr = params.date || "";
    if (!dateStr || dateStr === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split("T")[0];
    } else if (dateStr === "today") {
      dateStr = new Date().toISOString().split("T")[0];
    }

    const timeStr = params.time || "10:00 AM";
    const patientName = user?.name || params.patientName || "Patient";

    // Insert into Database
    const appt = await Appointment.create({
      userId,
      patientName,
      doctorName,
      hospital,
      date: dateStr,
      time: timeStr,
      status: "Booked",
    });

    // Verification check
    const verified = await Appointment.findById(appt._id);
    if (!verified) {
      return {
        success: false,
        message: "❌ Your appointment could not be booked. Database verification failed.",
      };
    }

    return {
      success: true,
      appointment: verified,
      message: `\n\n✅ **Appointment Booked & Confirmed**\n- **Doctor:** ${verified.doctorName}\n- **Hospital:** ${verified.hospital}\n- **Date:** ${verified.date}\n- **Time:** ${verified.time}\n- **Appointment ID:** \`${verified._id}\`\n\nYour appointment is saved and synchronized with your Appointments page.`,
    };
  } catch (err) {
    console.error("executeBookAppointment error:", err);
    return {
      success: false,
      message: "❌ Your appointment could not be booked due to a server error.",
    };
  }
}

export async function executeFindHospital(params: Record<string, string>): Promise<string> {
  return `\n\n🏥 **Hospital Search Results** for ${params.location || "nearby location"}.`;
}

export function calculateBMIMetric(heightCm: number, weightKg: number) {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  let category = "Normal weight";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 25 && bmi < 29.9) category = "Overweight";
  else if (bmi >= 30) category = "Obese";

  return {
    heightCm,
    weightKg,
    bmi: parseFloat(bmi.toFixed(1)),
    category,
  };
}

function extractHeightWeight(text: string): { height?: number; weight?: number } {
  let height: number | undefined;
  let weight: number | undefined;

  const cmMatch = text.match(/(\d{2,3})\s*cm/i);
  if (cmMatch) {
    const val = parseInt(cmMatch[1]);
    if (val >= 50 && val <= 250) height = val;
  }

  const kgMatch = text.match(/(\d{2,3})\s*kg/i);
  if (kgMatch) {
    const val = parseInt(kgMatch[1]);
    if (val >= 20 && val <= 300) weight = val;
  }

  return { height, weight };
}

/**
 * Core Action Handler for Chat Requests.
 * Real Database Writes, Verification, and User Isolation.
 */
export async function handleChatAction(
  userId: string,
  userMessage: string,
  userProfileData?: any,
  history?: Array<{ role: string; text?: string; content?: string }>
): Promise<ActionResult> {
  if (!userId) {
    return { handled: false };
  }

  const query = userMessage.toLowerCase().trim();
  await connectDB();

  let user: any = userProfileData;
  if (!user && userId.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(userId).select("-password");
  }

  // 1. CANCEL / DON'T SAVE INTENT
  if (
    query === "don't save that" ||
    query === "dont save that" ||
    query === "don't save" ||
    query === "dont save" ||
    query === "cancel save" ||
    query.startsWith("no, don't save")
  ) {
    return {
      handled: true,
      success: true,
      reply: `Understood. No changes were made to your health profile.`,
    };
  }

  // 2. QUERY HEIGHT / WEIGHT DIRECTLY
  if (query === "what is my height" || query === "what is my height?" || query === "my height?") {
    const h = user?.profile?.height;
    if (h) {
      return {
        handled: true,
        success: true,
        reply: `Your registered height is **${h} cm** in your health profile.`,
      };
    } else {
      return {
        handled: true,
        success: true,
        reply: `You haven't set your height in your profile yet. Tell me your height (e.g., "170 cm") to save it.`,
      };
    }
  }

  if (query === "what is my weight" || query === "what is my weight?" || query === "my weight?") {
    const w = user?.profile?.weight;
    if (w) {
      return {
        handled: true,
        success: true,
        reply: `Your registered weight is **${w} kg** in your health profile.`,
      };
    } else {
      return {
        handled: true,
        success: true,
        reply: `You haven't set your weight in your profile yet. Tell me your weight (e.g., "68 kg") to save it.`,
      };
    }
  }

  // 3. EXPLICIT SAVE INTENT ("save it", "save this", "save my height and weight", "save to my profile")
  const isExplicitSave =
    /\b(save it|save this|save my height|save my weight|save my profile|save to profile|save details|save metrics|save height and weight)\b/i.test(
      query
    );

  if (isExplicitSave) {
    const historyText = (history || [])
      .slice(-4)
      .map((m) => m.text || m.content || "")
      .join(" ");
    const combinedWindow = `${historyText} ${userMessage}`;
    const extracted = extractHeightWeight(combinedWindow);

    const targetHeight = extracted.height || user?.profile?.height;
    const targetWeight = extracted.weight || user?.profile?.weight;

    if (targetHeight && targetWeight) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              "profile.height": targetHeight,
              "profile.weight": targetWeight,
            },
          },
          { new: true }
        );

        if (!updatedUser) {
          return {
            handled: true,
            success: false,
            reply: `I couldn't save your height and weight right now. Database update failed.`,
          };
        }

        const res = calculateBMIMetric(targetHeight, targetWeight);
        return {
          handled: true,
          success: true,
          action: "UPDATE_PROFILE",
          reply: `Saved. Your height (**${targetHeight} cm**) and weight (**${targetWeight} kg**) have been saved to your health profile.\n\n📊 **Your BMI Calculation Result**\n\n- **Height:** ${targetHeight} cm\n- **Weight:** ${targetWeight} kg\n- **BMI Value:** **${res?.bmi} kg/m²**\n- **Category:** **${res?.category}**\n\n[SUGGESTED_REPLIES]Tell me my BMI|Show my health profile|Go to Dashboard[/SUGGESTED_REPLIES]`,
          uiCard: res ? { type: "bmi", data: res } : undefined,
        };
      } catch (err) {
        console.error("Health profile save error:", err);
        return {
          handled: true,
          success: false,
          reply: `I couldn't save your height and weight right now. Nothing was changed.`,
        };
      }
    } else if (targetHeight && !targetWeight) {
      try {
        await User.findByIdAndUpdate(userId, { $set: { "profile.height": targetHeight } });
        return {
          handled: true,
          success: true,
          action: "UPDATE_PROFILE",
          reply: `Saved. Your height (**${targetHeight} cm**) has been updated in your profile. What is your weight in kg?`,
        };
      } catch (err) {
        return {
          handled: true,
          success: false,
          reply: `I couldn't save your height right now. Nothing was changed.`,
        };
      }
    } else if (!targetHeight && targetWeight) {
      try {
        await User.findByIdAndUpdate(userId, { $set: { "profile.weight": targetWeight } });
        return {
          handled: true,
          success: true,
          action: "UPDATE_PROFILE",
          reply: `Saved. Your weight (**${targetWeight} kg**) has been updated in your profile. What is your height in cm?`,
        };
      } catch (err) {
        return {
          handled: true,
          success: false,
          reply: `I couldn't save your weight right now. Nothing was changed.`,
        };
      }
    } else {
      return {
        handled: true,
        success: true,
        reply: `What height (in cm) and weight (in kg) would you like me to save to your health profile?`,
      };
    }
  }

  // 4. DIRECT PROFILE UPDATE INTENT ("save my height as 170 cm", "my weight is 68 kg")
  const isDirectUpdate =
    /\b(change|update|set|my weight is|my height is|save my height as|save my weight as)\b/i.test(query) &&
    /(\d{2,3}\s*cm|\d{2,3}\s*kg)/i.test(query);

  if (isDirectUpdate) {
    const extracted = extractHeightWeight(query);
    if (extracted.height || extracted.weight) {
      try {
        const updateFields: any = {};
        if (extracted.height) updateFields["profile.height"] = extracted.height;
        if (extracted.weight) updateFields["profile.weight"] = extracted.weight;

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: updateFields },
          { new: true }
        );

        if (!updatedUser) {
          return {
            handled: true,
            success: false,
            reply: `Could not update profile. User record not found.`,
          };
        }

        const h = updatedUser.profile?.height;
        const w = updatedUser.profile?.weight;
        const res = h && w ? calculateBMIMetric(h, w) : null;

        let msg = "Saved.";
        if (extracted.height && extracted.weight) {
          msg += ` Your height (**${extracted.height} cm**) and weight (**${extracted.weight} kg**) have been updated in your health profile.`;
        } else if (extracted.height) {
          msg += ` Your height has been updated to **${extracted.height} cm** in your health profile.`;
        } else if (extracted.weight) {
          msg += ` Your weight has been updated to **${extracted.weight} kg** in your health profile.`;
        }

        return {
          handled: true,
          success: true,
          action: "UPDATE_PROFILE",
          reply: `${msg}\n\n[SUGGESTED_REPLIES]Tell me my BMI|Show my health profile|Go to Dashboard[/SUGGESTED_REPLIES]`,
          uiCard: res ? { type: "bmi", data: res } : undefined,
        };
      } catch (err) {
        console.error("Health profile update error:", err);
        return {
          handled: true,
          success: false,
          reply: `I couldn't update your health profile right now. Nothing was changed.`,
        };
      }
    }
  }

  // 5. BMI INTENT DETECTOR & CALCULATOR
  if (
    query.includes("bmi") ||
    query.includes("body mass index") ||
    query.includes("mera bmi") ||
    query.includes("calculate my bmi")
  ) {
    const height = user?.profile?.height;
    const weight = user?.profile?.weight;

    if (height && weight && height > 0 && weight > 0) {
      const res = calculateBMIMetric(height, weight);
      if (res) {
        return {
          handled: true,
          success: true,
          reply: `📊 **Your BMI Calculation Result**\n\n- **Height:** ${res.heightCm} cm\n- **Weight:** ${res.weightKg} kg\n- **BMI Value:** **${res.bmi} kg/m²**\n- **Category:** **${res.category}**\n\n*Reference Ranges:* Underweight (<18.5), Normal (18.5–24.9), Overweight (25–29.9), Obese (≥30).\n\n[SUGGESTED_REPLIES]How to maintain normal BMI|Diet tips for my BMI|Check health profile[/SUGGESTED_REPLIES]`,
          uiCard: {
            type: "bmi",
            data: res,
          },
        };
      }
    } else if (height && (!weight || weight <= 0)) {
      return {
        handled: true,
        success: true,
        reply: `I have your registered height (**${height} cm**). What is your current **weight in kg** so I can calculate your BMI?\n\n[SUGGESTED_REPLIES]65 kg|70 kg|75 kg[/SUGGESTED_REPLIES]`,
      };
    } else if (weight && (!height || height <= 0)) {
      return {
        handled: true,
        success: true,
        reply: `I have your registered weight (**${weight} kg**). What is your **height in cm** so I can calculate your BMI?\n\n[SUGGESTED_REPLIES]165 cm|170 cm|175 cm[/SUGGESTED_REPLIES]`,
      };
    } else {
      return {
        handled: true,
        success: true,
        reply: `To calculate your BMI, please tell me your **height (in cm)** and **weight (in kg)**.\n\n*(Example: "I am 170 cm tall and weigh 68 kg")*\n\n[SUGGESTED_REPLIES]170 cm and 65 kg|165 cm and 60 kg|175 cm and 75 kg[/SUGGESTED_REPLIES]`,
      };
    }
  }

  // 6. HYDRATION & WATER LOGGING / READING ENGINE
  const langStyle = detectLanguageStyle(userMessage);
  const isHydrationMention = /\b(water|pani|paani|पानी|glass|glasses|gilas|gilaas|गिलास|litre|litres|liter|liters|l|ml)\b/i.test(query);

  // A. HYDRATION WRITE INTENT (e.g. "ajj mne 2 glass pani piya isko save kr lo", "I drank 500 ml water today", "आज मैंने 2 गिलास पानी पिया")
  const isHydrationWrite = isHydrationMention && /\b(drank|piya|logged|save|save kr|save karo|record|drink|पिया|दर्ज)\b/i.test(query);
  
  if (isHydrationWrite) {
    const numMatch = query.match(/(\d+\.?\d*)\s*(glass|glasses|gilas|gilaas|गिलास|litres|litre|liter|liters|l|ml)?/i);
    
    if (!numMatch || !numMatch[1]) {
      let promptMsg = "How much water did you drink? Please specify the quantity (e.g. '2 glasses' or '500 ml').";
      if (langStyle === "hinglish") {
        promptMsg = "Aapne kitna paani piya? Kripya quantity bataayein (jaise: '2 glass pani').";
      } else if (langStyle === "hindi_devanagari") {
        promptMsg = "आपने कितना पानी पिया? कृपया मात्रा बताएं (जैसे: '2 गिलास पानी')।";
      }

      return {
        handled: true,
        success: true,
        reply: promptMsg,
      };
    }

    const numVal = parseFloat(numMatch[1]);
    const rawUnit = (numMatch[2] || "").toLowerCase();
    
    let formattedValue = `${numVal} glasses`;
    if (rawUnit.includes("ml")) {
      formattedValue = `${numVal} ml`;
    } else if (rawUnit.includes("l") || rawUnit.includes("liter") || rawUnit.includes("litre")) {
      formattedValue = `${numVal.toFixed(1)} L`;
    } else if (rawUnit.includes("glass") || rawUnit.includes("gilas") || rawUnit.includes("गिलास")) {
      formattedValue = numVal === 1 ? "1 glass" : `${numVal} glasses`;
    }

    const isYesterday = /\b(kal|kl|yesterday|कल)\b/i.test(query);
    const targetDate = isYesterday ? "yesterday" : "today";
    const dateRange = getTargetDateRange(targetDate);

    try {
      // Execute verified DB write
      const event = await HealthEvent.create({
        userId,
        type: "vital_log",
        symptom: "Hydration",
        value: formattedValue,
        source: "USER_REPORTED",
        isDeleted: false,
        createdAt: targetDate === "yesterday" ? dateRange.start : new Date(),
      });

      // Verification check
      const verified = await HealthEvent.findById(event._id);
      if (!verified) {
        let errReply = "❌ Could not log water intake. Database write verification failed.";
        if (langStyle === "hinglish") {
          errReply = "❌ Main aapka hydration record save nahi kar paaya. Database save fail ho gaya.";
        } else if (langStyle === "hindi_devanagari") {
          errReply = "❌ मैं आपका पानी का रिकॉर्ड दर्ज नहीं कर पाया। डेटाबेस सेव असफल रहा।";
        }
        return {
          handled: true,
          success: false,
          reply: errReply,
        };
      }

      // Language-consistent success response
      let successReply = `✅ **Logged ${formattedValue} of water.**`;
      if (langStyle === "hinglish") {
        successReply = `Aapka **${formattedValue}** paani ${targetDate === "yesterday" ? "kal" : "aaj"} ke hydration log mein save ho gaya hai. Keep staying hydrated!`;
      } else if (langStyle === "hindi_devanagari") {
        successReply = `आपका **${formattedValue}** पानी ${targetDate === "yesterday" ? "कल" : "आज"} के हाइड्रेशन लॉग में दर्ज कर लिया गया है।`;
      }

      return {
        handled: true,
        success: true,
        action: "LOG_WATER",
        reply: `${successReply}\n\n[SUGGESTED_REPLIES]${targetDate === "yesterday" ? "Kal maine kitna pani piya?" : "Aaj maine kitna pani piya?"}|Show my health timeline|Go to Dashboard[/SUGGESTED_REPLIES]`,
      };
    } catch (err) {
      console.error("Hydration write error:", err);
      let failMsg = "❌ Failed to log water intake due to server error.";
      if (langStyle === "hinglish") failMsg = "❌ Server error ki wajah se paani log nahi ho paaya.";
      else if (langStyle === "hindi_devanagari") failMsg = "❌ सर्वर त्रुटि के कारण पानी का रिकॉर्ड दर्ज नहीं हो सका।";
      return {
        handled: true,
        success: false,
        reply: failMsg,
      };
    }
  }

  // B. HYDRATION READ INTENT (e.g. "kl mne kitna pani piya", "kal maine kitna pani piya", "how much water did i drink yesterday", "aaj kitna pani piya")
  const isHydrationRead = isHydrationMention && /\b(kitna|how much|total|show|query|piya|drank|intake)\b/i.test(query);
  
  if (isHydrationRead) {
    try {
      const isYesterday = /\b(kal|kl|yesterday|कल)\b/i.test(query);
      const targetDate = isYesterday ? "yesterday" : "today";
      const dateRange = getTargetDateRange(targetDate);

      const logs = await HealthEvent.find({
        userId,
        type: "vital_log",
        symptom: "Hydration",
        isDeleted: false,
        createdAt: { $gte: dateRange.start, $lt: dateRange.end },
      });

      if (logs.length === 0) {
        let noDataMsg = `No hydration record found for ${targetDate}.`;
        if (langStyle === "hinglish") {
          noDataMsg = `${targetDate === "yesterday" ? "Kal" : "Aaj"} ka koi hydration record nahi mila.`;
        } else if (langStyle === "hindi_devanagari") {
          noDataMsg = `${targetDate === "yesterday" ? "कल" : "आज"} का कोई पानी का रिकॉर्ड नहीं मिला।`;
        }
        return {
          handled: true,
          success: true,
          reply: `💧 ${noDataMsg}`,
        };
      }

      // Aggregate entries by unit
      let totalGlasses = 0;
      let totalLitres = 0;
      let totalMl = 0;
      const otherUnits: string[] = [];

      logs.forEach((log) => {
        const valStr = (log.value || "").trim();
        const m = valStr.match(/(\d+\.?\d*)\s*(glass|glasses|l|litres|litre|liter|liters|ml)?/i);
        if (m) {
          const num = parseFloat(m[1]);
          const unit = (m[2] || "").toLowerCase();
          if (unit.includes("glass")) {
            totalGlasses += num;
          } else if (unit === "ml") {
            totalMl += num;
          } else if (unit === "l" || unit.includes("liter") || unit.includes("litre")) {
            totalLitres += num;
          } else {
            otherUnits.push(valStr);
          }
        }
      });

      const summaryParts: string[] = [];
      if (totalGlasses > 0) summaryParts.push(`${totalGlasses} ${totalGlasses === 1 ? "glass" : "glasses"}`);
      if (totalLitres > 0) summaryParts.push(`${totalLitres.toFixed(1)} L`);
      if (totalMl > 0) summaryParts.push(`${totalMl} ml`);
      otherUnits.forEach((u) => summaryParts.push(u));

      const summaryStr = summaryParts.join(" and ") || "0 L";

      let readReply = `💧 Yesterday you logged **${summaryStr}** of water.`;
      if (targetDate === "today") readReply = `💧 Today you have logged **${summaryStr}** of water.`;

      if (langStyle === "hinglish") {
        readReply = targetDate === "yesterday"
          ? `💧 Kal aapne **${summaryStr}** paani piya tha.`
          : `💧 Aaj aapne **${summaryStr}** paani log kiya hai.`;
      } else if (langStyle === "hindi_devanagari") {
        readReply = targetDate === "yesterday"
          ? `💧 कल आपने **${summaryStr}** पानी पिया था।`
          : `💧 आज आपने **${summaryStr}** पानी का रिकॉर्ड दर्ज किया है।`;
      }

      return {
        handled: true,
        success: true,
        reply: readReply,
      };
    } catch (err) {
      console.error("Hydration read error:", err);
    }
  }

  // 7. HEALTH TIMELINE LOGGING (Activity, Sleep, Symptoms)
  const isActivityLog = /\b(walked|ran|exercised|slept)\b/i.test(query) && /\b(\d+\.?\d*)\s*(km|miles|hours|hrs|minutes|mins)\b/i.test(query);
  if (isActivityLog) {
    const match = query.match(/(walked|ran|exercised|slept)\s*(\d+\.?\d*)\s*(km|miles|hours|hrs|minutes|mins)/i);
    if (match) {
      const activity = match[1];
      const num = match[2];
      const unit = match[3];

      try {
        const event = await HealthEvent.create({
          userId,
          type: "vital_log",
          symptom: activity.charAt(0).toUpperCase() + activity.slice(1),
          value: `${num} ${unit}`,
          source: "USER_REPORTED",
          isDeleted: false,
        });

        const verified = await HealthEvent.findById(event._id);
        if (!verified) {
          return {
            handled: true,
            success: false,
            reply: `❌ Could not log activity. Database verification failed.`,
          };
        }

        return {
          handled: true,
          success: true,
          action: "LOG_ACTIVITY",
          reply: `✅ **Logged ${activity}: ${num} ${unit} for today.**\n\nYour activity record has been saved to your health timeline.`,
        };
      } catch (err) {
        console.error("Activity log error:", err);
      }
    }
  }

  const isSymptomLog = /\b(had a|feeling|felt|suffering from)\b/i.test(query) && /\b(headache|fever|dizzy|nausea|chest pain|stomach pain|cough|cold)\b/i.test(query);
  if (isSymptomLog) {
    const match = query.match(/(headache|fever|dizzy|nausea|chest pain|stomach pain|cough|cold)/i);
    if (match) {
      const symptomName = match[1];
      try {
        const event = await HealthEvent.create({
          userId,
          type: "symptom",
          symptom: symptomName,
          severity: "moderate",
          source: "USER_REPORTED",
          isDeleted: false,
        });

        const verified = await HealthEvent.findById(event._id);
        if (!verified) {
          return {
            handled: true,
            success: false,
            reply: `❌ Could not log symptom. Database verification failed.`,
          };
        }

        return {
          handled: true,
          success: true,
          action: "LOG_SYMPTOM",
          reply: `✅ **Logged symptom: ${symptomName}** in your health timeline.\n\nIf symptoms persist or worsen, please consult a medical doctor.`,
        };
      } catch (err) {
        console.error("Symptom log error:", err);
      }
    }
  }

  // 8. APPOINTMENT BOOKING INTENT (Natural Language & Form)
  const isBookAppt = /\b(book an appointment|book appointment|doctor appointment|appointment book|schedule appointment|book physician)\b/i.test(query);
  if (isBookAppt) {
    const isConfirmed = query.includes("yes") || query.includes("confirm");

    let doctorName = "General Physician";
    if (query.includes("cardiology") || query.includes("cardiologist")) doctorName = "Cardiologist";
    else if (query.includes("dermatology") || query.includes("dermatologist")) doctorName = "Dermatologist";
    else if (query.includes("orthopedic") || query.includes("orthopedist")) doctorName = "Orthopedic Specialist";
    else if (query.includes("pediatrician") || query.includes("child doctor")) doctorName = "Pediatrician";
    else if (query.includes("sharma")) doctorName = "Dr. Sharma";
    else if (query.includes("verma")) doctorName = "Dr. Verma";

    let dateStr = "";
    if (query.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split("T")[0];
    } else {
      const dateMatch = query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      dateStr = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];
    }

    let timeStr = "10:00 AM";
    const timeMatch = query.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || query.match(/(\d{1,2})\s*(am|pm)/i);
    if (timeMatch) {
      timeStr = timeMatch[0].toUpperCase();
    }

    if (!isConfirmed && !query.includes("confirm booking")) {
      return {
        handled: true,
        success: true,
        action: "CONFIRM_APPOINTMENT_REQUIRED",
        reply: `📅 You are booking an appointment with **${doctorName}** at **City Healthcare Center** for **${dateStr}** at **${timeStr}**.\n\nPlease confirm if you want me to save this appointment to your schedule.\n\n[SUGGESTED_REPLIES]Yes, confirm booking|No, cancel[/SUGGESTED_REPLIES]`,
      };
    }

    const res = await executeBookAppointment(userId, {
      doctorName,
      hospital: "City Healthcare Center",
      date: dateStr,
      time: timeStr,
    });

    if (res.success) {
      return {
        handled: true,
        success: true,
        action: "BOOK_APPOINTMENT",
        reply: res.message,
        uiCard: {
          type: "appointment",
          data: [res.appointment],
        },
      };
    } else {
      return {
        handled: true,
        success: false,
        reply: res.message,
      };
    }
  }

  // 9. CREATE / SET MEDICINE REMINDER INTENT
  const isSetReminder = /\b(set a reminder|remind me|add a reminder|add medicine reminder|set my paracetamol)\b/i.test(query);
  if (isSetReminder) {
    let time24 = "08:00";
    const timeMatch = query.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3]?.toLowerCase();
      if (period === "pm" && h < 12) h += 12;
      if (period === "am" && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        time24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    const medMatch = query.match(/(?:for|take|my)\s+([a-zA-Z0-9\s]+?)(?:\s+at|\s+reminder|\s+tomorrow|\s+daily|\s*$)/i);
    const medName = medMatch ? medMatch[1].trim() : "Medicine";

    const existingDuplicate = await Medicine.findOne({
      userId,
      isDeleted: { $ne: true },
      name: { $regex: new RegExp(`^${medName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      time: time24,
    });

    if (existingDuplicate) {
      return {
        handled: true,
        success: true,
        reply: `An identical reminder for **${existingDuplicate.name}** at **${existingDuplicate.time}** already exists.\n\n[SUGGESTED_REPLIES]Show my medicines|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      };
    }

    const newMed = await Medicine.create({
      userId,
      name: medName,
      dose: "1 dose",
      time: time24,
      date: new Date().toISOString().split("T")[0],
      frequency: "Daily",
      reminder: true,
      taken: false,
    });

    const verified = await Medicine.findById(newMed._id);
    if (!verified) {
      return {
        handled: true,
        success: false,
        reply: `❌ Failed to create medicine reminder. Database write error.`,
      };
    }

    return {
      handled: true,
      success: true,
      action: "CREATE_MEDICINE",
      reply: `✅ Set a daily medicine reminder for **${medName}** at **${time24}**.\n\n[SUGGESTED_REPLIES]Show my medicines|Add another reminder|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      uiCard: { type: "medicine", data: [verified] },
    };
  }

  // 10. LIST MEDICINES / REMINDERS INTENT
  if (
    query.includes("show my medicines") ||
    query.includes("show my medicine reminders") ||
    query.includes("what medicines am i taking") ||
    query.includes("my medicines list") ||
    query.includes("show my reminders") ||
    query.includes("dawa dekho")
  ) {
    const medicines = await Medicine.find({ userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

    if (!medicines || medicines.length === 0) {
      return {
        handled: true,
        success: true,
        reply: `You currently have no registered medicines or active reminders.\n\nWould you like to add a new medicine reminder?\n\n[SUGGESTED_REPLIES]Add Paracetamol 500mg at 8 AM|Add Metformin 500mg at 9 PM|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      };
    }

    const lines = medicines.map(
      (m, i) =>
        `${i + 1}. **${m.name}** (${m.dose}) — Timing: **${m.time}** ${
          m.taken ? "✅ [Taken Today]" : "⏰ [Active Reminder]"
        }`
    );

    return {
      handled: true,
      success: true,
      reply: `💊 **Your Active Medicines & Reminders**\n\n${lines.join(
        "\n"
      )}\n\n[SUGGESTED_REPLIES]Add new medicine|Delete a reminder|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "medicine",
        data: medicines,
      },
    };
  }

  // 11. DELETE MEDICINE REMINDER INTENT
  if (query.includes("delete") && (query.includes("medicine") || query.includes("reminder") || query.includes("dawa"))) {
    const medicines = await Medicine.find({ userId, isDeleted: { $ne: true } });
    if (!medicines || medicines.length === 0) {
      return {
        handled: true,
        success: true,
        reply: `You have no active medicine reminders to delete.`,
      };
    }

    const isConfirmed = query.includes("yes") || query.includes("confirm");
    let target = medicines.find((m) => query.includes(m.name.toLowerCase()));
    if (!target && (medicines.length === 1 || query.includes("reminder"))) {
      target = medicines[0];
    }

    if (target) {
      if (isConfirmed) {
        await Medicine.findByIdAndDelete(target._id);
        const verifiedDelete = await Medicine.findById(target._id);
        if (verifiedDelete) {
          return {
            handled: true,
            success: false,
            reply: `❌ Failed to delete reminder. Database write error.`,
          };
        }
        return {
          handled: true,
          success: true,
          action: "DELETE_MEDICINE",
          reply: `✅ Deleted reminder for **${target.name}** (${target.dose}) at ${target.time}.\n\n[SUGGESTED_REPLIES]Show my medicines|Add new medicine|Go to Dashboard[/SUGGESTED_REPLIES]`,
        };
      } else {
        return {
          handled: true,
          success: true,
          reply: `⚠️ Are you sure you want to delete your reminder for **${target.name}** (${target.dose}) set for **${target.time}**?\n\n[SUGGESTED_REPLIES]Yes, delete this reminder|No, cancel[/SUGGESTED_REPLIES]`,
        };
      }
    }
  }

  // 12. LIST APPOINTMENTS INTENT
  if (
    query.includes("show my appointments") ||
    query.includes("my appointments") ||
    query.includes("check appointment") ||
    query.includes("meri appointment")
  ) {
    const appointments = await Appointment.find({ userId }).sort({ createdAt: -1 });

    if (!appointments || appointments.length === 0) {
      return {
        handled: true,
        success: true,
        reply: `You currently have no booked appointments.\n\nWould you like to book an appointment with a doctor?\n\n[SUGGESTED_REPLIES]Book Dr. Sharma for Monday 4 PM|Book General Physician|Find nearby hospitals[/SUGGESTED_REPLIES]`,
      };
    }

    const lines = appointments.map(
      (a, i) =>
        `${i + 1}. **Doctor:** ${a.doctorName || a.doctor || "Physician"} | **Hospital:** ${
          a.hospital || "City Clinic"
        } | **Date:** ${a.date} | **Time:** ${a.time} (Status: ${a.status})`
    );

    return {
      handled: true,
      success: true,
      reply: `📅 **Your Booked Appointments**\n\n${lines.join(
        "\n"
      )}\n\n[SUGGESTED_REPLIES]Book new appointment|Find nearby hospitals|Go to Appointments Page[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "appointment",
        data: appointments,
      },
    };
  }

  // 13. REPORT SUMMARY INTENT
  if (
    query.includes("latest report") ||
    query.includes("recent report") ||
    query.includes("hb level") ||
    query.includes("hemoglobin") ||
    query.includes("my blood report") ||
    query.includes("what was my hb")
  ) {
    const report = await ReportHistory.findOne({ userId }).sort({ createdAt: -1 });

    if (!report) {
      return {
        handled: true,
        success: true,
        reply: `No medical reports found in your record. Upload a lab report using the Report Analyzer page to get AI insights.\n\n[SUGGESTED_REPLIES]Go to Report Analyzer|Check health profile|Ask health question[/SUGGESTED_REPLIES]`,
      };
    }

    let summaryText = `📄 **Latest Medical Report Analysis**\n\n- **Title:** ${report.title || "Lab Test"}\n- **Summary:** ${
      report.summary || "Standard medical panel analyzed."
    }\n- **Recommended Specialist:** ${report.specialistToConsult || "General Physician"}`;

    if (report.parameters && Array.isArray(report.parameters) && report.parameters.length > 0) {
      const params = report.parameters
        .slice(0, 5)
        .map((p: any) => `- **${p.name}:** ${p.value} (${p.status || "Normal"})`)
        .join("\n");
      summaryText += `\n\n**Key Parameters:**\n${params}`;
    }

    return {
      handled: true,
      success: true,
      reply: `${summaryText}\n\n[SUGGESTED_REPLIES]Go to Report Analyzer|Book specialist appointment|Ask about hemoglobin[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "report",
        data: report,
      },
    };
  }

  return { handled: false };
}
