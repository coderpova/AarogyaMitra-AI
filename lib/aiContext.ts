import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Medicine from "@/models/Medicine";
import Appointment from "@/models/Appointment";
import ReportHistory from "@/models/ReportHistory";
import DailyHealthLog from "@/models/DailyHealthLog";
import { detectHealthIntents, analyzeSleep, analyzeBP, analyzeBloodSugar, analyzeWeight, analyzeStress, analyzeMood } from "./healthIntelligence";

interface MedicalHistoryItem {
  condition: string;
  notes?: string;
}

interface AllergyItem {
  name: string;
  severity?: string;
}

interface MedicineItem {
  name: string;
  dose: string;
  time: string;
  taken?: boolean;
  reminder?: boolean;
}

interface AppointmentItem {
  date: string;
  time: string;
  doctorName?: string;
  patientName?: string;
  hospital: string;
  status: string;
}

interface ReportParameter {
  name: string;
  value: string;
  status: string;
  normalRange: string;
}

interface ReportItem {
  title: string;
  summary: string;
  specialistToConsult: string;
  createdAt: Date;
  parameters?: ReportParameter[];
}

interface DailyLogItem {
  date: string;
  steps?: number;
  waterIntakeMl?: number;
  sleepHours?: number | null;
  bloodPressure?: {
    systolic?: number | null;
    diastolic?: number | null;
  } | null;
  bloodSugar?: number | null;
  weight?: number | null;
  mood?: string | null;
  stressLevel?: number | null;
  healthScore: number;
}

/**
 * Builds a fresh, personalized, and secure health context for the AI.
 * Achieves real-time freshness by querying directly from MongoDB, scoped strictly
 * to the verified user's IDs. Uses intent detection to bound queries.
 */
export async function getAIContext(userId: string, userQuery: string = "") {
  await connectDB();

  let user = null;
  if (userId.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(userId);
  }

  if (!user) {
    return "No patient profile information available.";
  }

  const userIdStr = user._id.toString();
  const userIds = [userIdStr, user.email];
  const intents = detectHealthIntents(userQuery);

  const contextParts = [
    `=== PATIENT PROFILE ===`,
    `- Name: ${user.name}`,
    `- Age: ${user.profile?.age || "Not specified"}`,
    `- Gender: ${user.profile?.gender || "Not specified"}`,
    `- Blood Group: ${user.profile?.bloodGroup || "Not specified"}`,
    `- Medical History: ${
      user.medicalHistory?.length
        ? user.medicalHistory.map((h: MedicalHistoryItem) => `${h.condition}${h.notes ? ` (${h.notes})` : ""}`).join(", ")
        : "None declared"
    }`,
    `- Allergies: ${
      user.allergies?.length
        ? user.allergies.map((a: AllergyItem) => `${a.name}${a.severity ? ` (Severity: ${a.severity})` : ""}`).join(", ")
        : "None declared"
    }`
  ];

  const queriesToRun: Array<Promise<unknown>> = [];
  const queryKeys: string[] = [];

  const needsMedicines = intents.includes("MEDICINES") || intents.includes("MEDICINE_ADHERENCE") || intents.includes("OVERALL_HEALTH");
  const needsAppointments = intents.includes("APPOINTMENTS") || intents.includes("OVERALL_HEALTH");
  const needsReports = intents.includes("REPORTS") || intents.includes("REPORT_COMPARISON") || intents.includes("OVERALL_HEALTH");
  const needsLogs = intents.includes("ACTIVITY") || intents.includes("BLOOD_PRESSURE") || intents.includes("BLOOD_SUGAR") || intents.includes("WEIGHT") || intents.includes("SLEEP") || intents.includes("STRESS") || intents.includes("MOOD") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND");

  if (needsMedicines) {
    queriesToRun.push(Medicine.find({ userId: { $in: userIds } }).sort({ createdAt: -1 }));
    queryKeys.push("medicines");
  }

  if (needsAppointments) {
    queriesToRun.push(Appointment.find({ userId: { $in: userIds } }).sort({ date: -1 }).limit(10));
    queryKeys.push("appointments");
  }

  if (needsReports) {
    queriesToRun.push(ReportHistory.find({ userId: { $in: userIds }, isSample: { $ne: true } }).sort({ createdAt: -1 }).limit(5));
    queryKeys.push("reports");
  }

  if (needsLogs) {
    queriesToRun.push(DailyHealthLog.find({ userId: { $in: userIds } }).sort({ date: -1 }).limit(14));
    queryKeys.push("logs");
  }

  const results = await Promise.all(queriesToRun);
  const data: Record<string, unknown> = {};
  queryKeys.forEach((key, idx) => {
    data[key] = results[idx];
  });

  const medicinesList = (data.medicines || []) as MedicineItem[];
  const appointmentsList = (data.appointments || []) as AppointmentItem[];
  const reportsList = (data.reports || []) as ReportItem[];
  const logsList = (data.logs || []) as DailyLogItem[];

  if (needsMedicines) {
    if (medicinesList.length > 0) {
      const list = medicinesList.map((m: MedicineItem) => 
        `- ${m.name} (Dose: ${m.dose}, Time: ${m.time}, Taken today: ${m.taken ? "Yes" : "No"})`
      ).join("\n");
      contextParts.push(`\n=== CURRENT MEDICINES ===\n${list}`);
    } else {
      contextParts.push(`\n=== CURRENT MEDICINES ===\nYour AarogyaMitra records currently don't show any active medicines.`);
    }
  }

  if (needsAppointments) {
    if (appointmentsList.length > 0) {
      const list = appointmentsList.map((a: AppointmentItem) => 
        `- Dr. ${a.doctorName || ""} at ${a.hospital} on ${a.date} at ${a.time} (Status: ${a.status})`
      ).join("\n");
      contextParts.push(`\n=== RECENT APPOINTMENTS ===\n${list}`);
    } else {
      contextParts.push(`\n=== RECENT APPOINTMENTS ===\nYou don't currently have a recorded upcoming appointment.`);
    }
  }

  if (needsReports) {
    if (reportsList.length > 0) {
      console.log(`[ReportContext] User: ${userIdStr}`);
      console.log(`[ReportContext] Reports found: ${reportsList.length}`);
      console.log(`[ReportContext] Latest report: ${(reportsList[0] as ReportItem & { _id?: string })._id || 'unknown'}`);
      console.log(`[ReportContext] Latest report title: ${reportsList[0].title}`);
      console.log(`[ReportContext] Latest report date: ${new Date(reportsList[0].createdAt).toLocaleDateString()}`);
      console.log(`[ReportContext] Parameters: ${reportsList[0].parameters?.map((p: ReportParameter) => p.name).join(', ') || 'none'}`);

      const list = reportsList.map((r: ReportItem, idx: number) => {
        const params = r.parameters && r.parameters.length
          ? r.parameters.map((p: ReportParameter) => `  * ${p.name}: ${p.value} (Status: ${p.status}, Ref: ${p.normalRange})`).join("\n")
          : "  * No specific lab parameters stored.";
        return `- Report ${idx + 1} — Title: ${r.title}\n  * Summary: ${r.summary}\n  * Specialist Recommended: ${r.specialistToConsult}\n  * Date Analyzed: ${new Date(r.createdAt).toLocaleDateString()}\n${params}`;
      }).join("\n");
      contextParts.push(`\n=== RECENT MEDICAL REPORTS (from user's uploaded reports) ===\n${list}`);
    } else {
      console.log(`[ReportContext] User: ${userIdStr}`);
      console.log(`[ReportContext] Reports found: 0`);
      contextParts.push(`\n=== RECENT MEDICAL REPORTS ===\nNo medical reports are currently available for this user.`);
    }
  }

  if (needsLogs) {
    if (logsList.length > 0) {
      const list = logsList.slice(0, 7).map((l: DailyLogItem) => 
        `- Date: ${l.date} (Steps: ${l.steps || 0}, Sleep: ${l.sleepHours !== null ? `${l.sleepHours}h` : "N/A"}, BP: ${l.bloodPressure?.systolic ? `${l.bloodPressure.systolic}/${l.bloodPressure.diastolic}` : "N/A"}, Sugar: ${l.bloodSugar ? l.bloodSugar : "N/A"}, Stress: ${l.stressLevel ? l.stressLevel : "N/A"})`
      ).join("\n");
      contextParts.push(`\n=== RECENT HEALTH ACTIVITY ===\n${list}`);

      // Add Health Intelligence Summaries if specific trends are requested or overall health
      const trends: string[] = [];
      if (intents.includes("SLEEP") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeSleep(logsList));
      }
      if (intents.includes("BLOOD_PRESSURE") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeBP(logsList));
      }
      if (intents.includes("BLOOD_SUGAR") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeBloodSugar(logsList));
      }
      if (intents.includes("WEIGHT") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeWeight(logsList));
      }
      if (intents.includes("STRESS") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeStress(logsList));
      }
      if (intents.includes("MOOD") || intents.includes("OVERALL_HEALTH") || intents.includes("HEALTH_TREND")) {
        trends.push(analyzeMood(logsList));
      }

      if (trends.length > 0) {
        contextParts.push(`\n=== HEALTH INTELLIGENCE TRENDS ===\n${trends.join("\n")}`);
      }
    } else {
      contextParts.push(`\n=== RECENT HEALTH ACTIVITY ===\nI don't have enough recent activity data to assess this.`);
    }
  }

  return contextParts.join("\n");
}