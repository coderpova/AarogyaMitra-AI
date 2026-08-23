import connectDB from "./mongodb";
import User from "../models/User";
import Medicine from "../models/Medicine";
import Appointment from "../models/Appointment";
import ReportHistory from "../models/ReportHistory";

export interface ActionResult {
  handled: boolean;
  reply?: string;
  actionTag?: string;
  uiCard?: {
    type: "bmi" | "medicine" | "appointment" | "hospital" | "report";
    data: any;
  };
}

export function parseActionTags(text: string) {
  const actions: Array<{ actionType: string; params: Record<string, string> }> = [];
  const regex = /\[ACTION:([A-Z_]+)\s*({.*?})\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const actionType = match[1];
      const params = JSON.parse(match[2]);
      actions.push({ actionType, params });
    } catch (e) {
      console.error("Action tag parse error:", e);
    }
  }
  return actions;
}

export function stripActionTags(text: string): string {
  return text.replace(/\[ACTION:[A-Z_]+\s*{.*?}\]/g, "").trim();
}

export async function executeBookAppointment(userId: string, params: Record<string, string>): Promise<string> {
  if (!userId) return "";
  await connectDB();
  try {
    await Appointment.create({
      userId,
      patientName: params.patientName || "Patient",
      doctorName: params.doctorName || "General Physician",
      hospital: params.hospital || "City Hospital",
      date: params.date || new Date().toISOString().split("T")[0],
      time: params.time || "10:00 AM",
      status: "Booked",
    });
    return `\n\n✅ **Appointment Booked Successfully** for ${params.doctorName || "Doctor"} on ${params.date || "scheduled date"}.`;
  } catch (err) {
    console.error("executeBookAppointment error:", err);
    return "";
  }
}

export async function executeFindHospital(params: Record<string, string>): Promise<string> {
  return `\n\n🏥 **Hospital Search Results** for ${params.location || "nearby location"}.`;
}

/**
 * Calculates BMI and category from height (cm) and weight (kg).
 */
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

/**
 * Helper to extract height (cm) and weight (kg) from a text string.
 */
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
 * Scoped strictly to authenticated userId.
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

  // Load User Record for Profile & Data Isolation
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
      reply: `Understood. No changes were made to your health profile.`,
    };
  }

  // 2. QUERY HEIGHT / WEIGHT DIRECTLY
  if (query === "what is my height" || query === "what is my height?" || query === "my height?") {
    const h = user?.profile?.height;
    if (h) {
      return {
        handled: true,
        reply: `Your registered height is **${h} cm** in your health profile.`,
      };
    } else {
      return {
        handled: true,
        reply: `You haven't set your height in your profile yet. Tell me your height (e.g., "170 cm") to save it.`,
      };
    }
  }

  if (query === "what is my weight" || query === "what is my weight?" || query === "my weight?") {
    const w = user?.profile?.weight;
    if (w) {
      return {
        handled: true,
        reply: `Your registered weight is **${w} kg** in your health profile.`,
      };
    } else {
      return {
        handled: true,
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
    // Look for height/weight in userMessage or recent conversation turns (last 4 turns)
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
        user = user || (await User.findById(userId));
        if (user) {
          user.profile = user.profile || {};
          user.profile.height = targetHeight;
          user.profile.weight = targetWeight;
          await user.save();
        }

        const res = calculateBMIMetric(targetHeight, targetWeight);
        return {
          handled: true,
          reply: `Saved. Your height (**${targetHeight} cm**) and weight (**${targetWeight} kg**) have been added to your health profile.\n\n📊 **Your BMI Calculation Result**\n\n- **Height:** ${targetHeight} cm\n- **Weight:** ${targetWeight} kg\n- **BMI Value:** **${res?.bmi} kg/m²**\n- **Category:** **${res?.category}**\n\n[SUGGESTED_REPLIES]Tell me my BMI|Show my health profile|Go to Dashboard[/SUGGESTED_REPLIES]`,
          uiCard: res ? { type: "bmi", data: res } : undefined,
        };
      } catch (err) {
        console.error("Health profile save error:", err);
        return {
          handled: true,
          reply: `I couldn't save your height and weight right now. Nothing was changed.`,
        };
      }
    } else if (targetHeight && !targetWeight) {
      try {
        user = user || (await User.findById(userId));
        if (user) {
          user.profile = user.profile || {};
          user.profile.height = targetHeight;
          await user.save();
        }
        return {
          handled: true,
          reply: `Saved. Your height (**${targetHeight} cm**) has been updated in your profile. What is your weight in kg?`,
        };
      } catch (err) {
        return {
          handled: true,
          reply: `I couldn't save your height right now. Nothing was changed.`,
        };
      }
    } else if (!targetHeight && targetWeight) {
      try {
        user = user || (await User.findById(userId));
        if (user) {
          user.profile = user.profile || {};
          user.profile.weight = targetWeight;
          await user.save();
        }
        return {
          handled: true,
          reply: `Saved. Your weight (**${targetWeight} kg**) has been updated in your profile. What is your height in cm?`,
        };
      } catch (err) {
        return {
          handled: true,
          reply: `I couldn't save your weight right now. Nothing was changed.`,
        };
      }
    } else {
      return {
        handled: true,
        reply: `What height (in cm) and weight (in kg) would you like me to save to your health profile?`,
      };
    }
  }

  // 4. DIRECT UPDATE INTENT ("change my weight to 70 kg", "update my height to 175 cm", "my weight is 70 kg")
  const isDirectUpdate =
    /\b(change|update|set|my weight is|my height is)\b/i.test(query) &&
    /(\d{2,3}\s*cm|\d{2,3}\s*kg)/i.test(query);

  if (isDirectUpdate) {
    const extracted = extractHeightWeight(query);
    if (extracted.height || extracted.weight) {
      try {
        user = user || (await User.findById(userId));
        if (user) {
          user.profile = user.profile || {};
          if (extracted.height) user.profile.height = extracted.height;
          if (extracted.weight) user.profile.weight = extracted.weight;
          await user.save();
        }

        const h = user?.profile?.height;
        const w = user?.profile?.weight;
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
          reply: `${msg}\n\n[SUGGESTED_REPLIES]Tell me my BMI|Show my health profile|Go to Dashboard[/SUGGESTED_REPLIES]`,
          uiCard: res ? { type: "bmi", data: res } : undefined,
        };
      } catch (err) {
        console.error("Health profile update error:", err);
        return {
          handled: true,
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
        reply: `I have your registered height (**${height} cm**). What is your current **weight in kg** so I can calculate your BMI?\n\n[SUGGESTED_REPLIES]65 kg|70 kg|75 kg[/SUGGESTED_REPLIES]`,
      };
    } else if (weight && (!height || height <= 0)) {
      return {
        handled: true,
        reply: `I have your registered weight (**${weight} kg**). What is your **height in cm** so I can calculate your BMI?\n\n[SUGGESTED_REPLIES]165 cm|170 cm|175 cm[/SUGGESTED_REPLIES]`,
      };
    } else {
      return {
        handled: true,
        reply: `To calculate your BMI, please tell me your **height (in cm)** and **weight (in kg)**.\n\n*(Example: "I am 170 cm tall and weigh 68 kg")*\n\n[SUGGESTED_REPLIES]170 cm and 65 kg|165 cm and 60 kg|175 cm and 75 kg[/SUGGESTED_REPLIES]`,
      };
    }
  }

  // Explicit Height/Weight Input in Query (e.g. "I am 170 cm and 65 kg")
  const extractedQueryHW = extractHeightWeight(query);
  if (extractedQueryHW.height && extractedQueryHW.weight) {
    const h = extractedQueryHW.height;
    const w = extractedQueryHW.weight;
    const res = calculateBMIMetric(h, w);

    if (res) {
      try {
        user = user || (await User.findById(userId));
        if (user) {
          user.profile = user.profile || {};
          user.profile.height = h;
          user.profile.weight = w;
          await user.save();
        }
      } catch (saveErr) {
        console.error("Auto profile save error:", saveErr);
      }

      return {
        handled: true,
        reply: `Saved. Your height (**${h} cm**) and weight (**${w} kg**) have been added to your health profile.\n\n📊 **Your BMI Calculation Result**\n\n- **Height:** ${res.heightCm} cm\n- **Weight:** ${res.weightKg} kg\n- **BMI Value:** **${res.bmi} kg/m²**\n- **Category:** **${res.category}**\n\n[SUGGESTED_REPLIES]Tell me my BMI|Save to profile|Check health profile[/SUGGESTED_REPLIES]`,
        uiCard: { type: "bmi", data: res },
      };
    }
  }

  // 5.5. CREATE / SET MEDICINE REMINDER INTENT
  const isSetReminder = /\b(set a reminder|remind me|add a reminder|add medicine reminder)\b/i.test(query);
  if (isSetReminder) {
    const isConfirmed = query.includes("yes") || query.includes("confirm");
    
    // Time extraction (e.g., "8 PM", "08:00 AM", "20:00")
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

    // Name & Dose extraction
    const medMatch = query.match(/(?:for|take)\s+([a-zA-Z0-9\s]+?)(?:\s+at|\s+tomorrow|\s+daily|\s*$)/i);
    const medName = medMatch ? medMatch[1].trim() : "Medicine";

    // Duplicate Check
    const existingDuplicate = await Medicine.findOne({
      userId,
      isDeleted: { $ne: true },
      name: { $regex: new RegExp(`^${medName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
      time: time24,
    });

    if (existingDuplicate) {
      return {
        handled: true,
        reply: `An identical reminder for **${existingDuplicate.name}** at **${existingDuplicate.time}** already exists.\n\n[SUGGESTED_REPLIES]Show my medicines|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      };
    }

    if (isConfirmed || query.includes("set a reminder")) {
      await Medicine.create({
        userId,
        name: medName,
        dose: "1 dose",
        time: time24,
        date: new Date().toISOString().split("T")[0],
        frequency: "Daily",
        reminder: true,
        taken: false,
      });

      return {
        handled: true,
        reply: `✅ Set a daily medicine reminder for **${medName}** at **${time24}**.\n\n[SUGGESTED_REPLIES]Show my medicines|Add another reminder|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      };
    }
  }

  // 6. LIST MEDICINES / REMINDERS INTENT
  if (
    query.includes("show my medicines") ||
    query.includes("show my medicine reminders") ||
    query.includes("what medicines am i taking") ||
    query.includes("my medicines list") ||
    query.includes("dawa dekho") ||
    query.includes("meri dawaiyan")
  ) {
    const medicines = await Medicine.find({ userId }).sort({ createdAt: -1 });

    if (!medicines || medicines.length === 0) {
      return {
        handled: true,
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
      reply: `💊 **Your Active Medicines & Reminders**\n\n${lines.join(
        "\n"
      )}\n\n[SUGGESTED_REPLIES]Add new medicine|Delete a reminder|Go to Medicines Page[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "medicine",
        data: medicines,
      },
    };
  }

  // 7. DELETE MEDICINE REMINDER INTENT
  if (query.includes("delete") && (query.includes("medicine") || query.includes("reminder") || query.includes("dawa"))) {
    const medicines = await Medicine.find({ userId });
    if (!medicines || medicines.length === 0) {
      return {
        handled: true,
        reply: `You have no active medicine reminders to delete.`,
      };
    }

    const isConfirmed = query.includes("yes") || query.includes("confirm");
    let target = medicines.find((m) => query.includes(m.name.toLowerCase()));
    if (!target && medicines.length === 1) {
      target = medicines[0];
    }

    if (target) {
      if (isConfirmed) {
        await Medicine.findByIdAndDelete(target._id);
        return {
          handled: true,
          reply: `✅ Deleted reminder for **${target.name}** (${target.dose}) at ${target.time}.\n\n[SUGGESTED_REPLIES]Show my medicines|Add new medicine|Go to Dashboard[/SUGGESTED_REPLIES]`,
        };
      } else {
        return {
          handled: true,
          reply: `⚠️ Are you sure you want to delete your reminder for **${target.name}** (${target.dose}) set for **${target.time}**?\n\n[SUGGESTED_REPLIES]Yes, delete this reminder|No, cancel[/SUGGESTED_REPLIES]`,
        };
      }
    }
  }

  // 8. LIST APPOINTMENTS INTENT
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
      reply: `📅 **Your Booked Appointments**\n\n${lines.join(
        "\n"
      )}\n\n[SUGGESTED_REPLIES]Book new appointment|Find nearby hospitals|Go to Appointments Page[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "appointment",
        data: appointments,
      },
    };
  }

  // 9. REPORT SUMMARY INTENT
  if (
    query.includes("latest report") ||
    query.includes("recent report") ||
    query.includes("hb level") ||
    query.includes("hemoglobin") ||
    query.includes("my blood report")
  ) {
    const report = await ReportHistory.findOne({ userId }).sort({ createdAt: -1 });

    if (!report) {
      return {
        handled: true,
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
      reply: `${summaryText}\n\n[SUGGESTED_REPLIES]Go to Report Analyzer|Book specialist appointment|Ask about hemoglobin[/SUGGESTED_REPLIES]`,
      uiCard: {
        type: "report",
        data: report,
      },
    };
  }

  return { handled: false };
}
