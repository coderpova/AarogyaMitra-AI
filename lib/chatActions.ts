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
 * Core Action Handler for Chat Requests.
 * Scoped strictly to authenticated userId.
 */
export async function handleChatAction(
  userId: string,
  userMessage: string,
  userProfileData?: any
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

  // 1. BMI INTENT DETECTOR & CALCULATOR
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
  const heightWeightMatch = query.match(/(?:height|tall)?\s*(\d{2,3})\s*cm.*?(?:weight|weigh)?\s*(\d{2,3})\s*kg/i) ||
                            query.match(/(\d{2,3})\s*kg.*?(\d{2,3})\s*cm/i);
  if (heightWeightMatch && (query.includes("bmi") || query.includes("calculate"))) {
    let h = 0, w = 0;
    if (query.indexOf("cm") < query.indexOf("kg")) {
      h = parseInt(heightWeightMatch[1]);
      w = parseInt(heightWeightMatch[2]);
    } else {
      w = parseInt(heightWeightMatch[1]);
      h = parseInt(heightWeightMatch[2]);
    }

    if (h > 50 && h < 250 && w > 20 && w < 300) {
      const res = calculateBMIMetric(h, w);
      if (res) {
        if (user) {
          user.profile = user.profile || {};
          user.profile.height = h;
          user.profile.weight = w;
          await user.save();
        }
        return {
          handled: true,
          reply: `📊 **Your BMI Calculation Result**\n\n- **Height:** ${res.heightCm} cm\n- **Weight:** ${res.weightKg} kg\n- **BMI Value:** **${res.bmi} kg/m²**\n- **Category:** **${res.category}**\n\n*Saved to your profile!*\n\n[SUGGESTED_REPLIES]How to maintain normal BMI|Diet tips for my BMI|Check health profile[/SUGGESTED_REPLIES]`,
          uiCard: { type: "bmi", data: res },
        };
      }
    }
  }

  // 2. LIST MEDICINES / REMINDERS INTENT
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

  // 3. DELETE MEDICINE REMINDER INTENT
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

  // 4. LIST APPOINTMENTS INTENT
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

  // 5. REPORT SUMMARY INTENT
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
