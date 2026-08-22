"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ActionCard from "@/components/dashboard/ActionCard";
import HospitalCard from "@/components/hospital/HospitalCard";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Activity,
  Pill,
  Calendar,
  Stethoscope,
  TrendingUp,
  MapPin,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
  Shield,
  Brain,
  Apple,
  Syringe,
  Droplet,
  Dumbbell,
  Moon,
  Scale,
  Phone,
  AlertCircle,
  ChevronRight,
  Plus,
  Minus,
  FileText,
  Siren,
  TrendingDown,
  LucideIcon,
} from "lucide-react";

interface ReportParameter {
  name: string;
  value: string;
  normalRange: string;
  status: string;
  explanation?: string;
}

interface AnalysisResult {
  _id?: string;
  title: string;
  summary: string;
  specialistToConsult: string;
  parameters: ReportParameter[];
  recommendations: string[];
  createdAt?: string;
  diseaseProbability?: { disease: string; probability: string }[];
  confidenceScore?: number;
  actionPlan?: string[];
  emergencyWarning?: string;
}

interface User {
  name: string;
  email: string;
  profile?: {
    age: number;
    gender: string;
    bloodGroup: string;
    phone: string;
    address: string;
  };
  health?: {
    heartRate: number;
    steps: number;
    healthScore: number;
  };
  medicines?: any[];
  appointments?: any[];
  symptomsHistory?: Array<{ symptom: string; date: string; severity: string }>;
}

interface Hospital {
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  category?: string;
}

/* ── Helper: Daily metric localStorage ───────────────────────────────────── */
function getDailyMetric(key: string, defaultValue: number): number {
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem(`health_${key}_${today}`);
  return stored !== null ? parseInt(stored) : defaultValue;
}

function setDailyMetric(key: string, value: number) {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(`health_${key}_${today}`, value.toString());
}

/* ── Helper: BMI computation ─────────────────────────────────────────────── */
function computeBMI(height: number, weight: number, t: any) {
  if (!height || !weight || height <= 0 || weight <= 0) return null;
  const h = height / 100;
  const bmi = Math.round((weight / (h * h)) * 10) / 10;
  if (!t) {
    if (bmi < 18.5) return { value: bmi, label: "Underweight", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", advice: "Consider increasing caloric intake." };
    if (bmi < 25) return { value: bmi, label: "Normal weight", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", advice: "Maintain current healthy lifestyle." };
    if (bmi < 30) return { value: bmi, label: "Overweight", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", advice: "Regular exercise recommended." };
    return { value: bmi, label: "Obese", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", advice: "Consult a healthcare professional." };
  }
  if (bmi < 18.5) return { value: bmi, label: t("dashboardExt.bmiUnderL"), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", advice: t("dashboardExt.bmiUnderD") };
  if (bmi < 25) return { value: bmi, label: t("dashboardExt.bmiNormL"), color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", advice: t("dashboardExt.bmiNormD") };
  if (bmi < 30) return { value: bmi, label: t("dashboardExt.bmiOverL"), color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", advice: t("dashboardExt.bmiOverD") };
  return { value: bmi, label: t("dashboardExt.bmiObeseL"), color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", advice: t("dashboardExt.bmiObeseD") };
}

/* ── Helper: Risk level computation ──────────────────────────────────────── */
function getRiskLevel(healthScore: number, reports: any[], t: any) {
  let abnormalCount = 0;
  reports.slice(0, 3).forEach((r) => {
    if (r.parameters) {
      abnormalCount += r.parameters.filter(
        (p: any) => p.status === "High" || p.status === "Low" || p.status === "Critical"
      ).length;
    }
  });

  const hasCritical = reports.some((r) =>
    r.parameters?.some((p: any) => p.status === "Critical")
  );

  if (!t) {
    if (healthScore < 40 || hasCritical) {
      return { label: "High Risk", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-300 dark:border-red-800", description: "Critical parameters found. Immediate medical attention advised." };
    }
    if (healthScore < 60 || abnormalCount >= 2) {
      return { label: "Moderate Risk", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-800", description: "Monitor health and consult a doctor soon." };
    }
    return { label: "Low Risk", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-300 dark:border-green-800", description: "Your health indicators look good!" };
  }

  if (healthScore < 40 || hasCritical) {
    return { label: t("dashboardExt.riskHighL"), color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-300 dark:border-red-800", description: t("dashboardExt.riskHighD") };
  }
  if (healthScore < 60 || abnormalCount >= 2) {
    return { label: t("dashboardExt.riskModL"), color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-800", description: t("dashboardExt.riskModD") };
  }
  return { label: t("dashboardExt.riskLowL"), color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-300 dark:border-green-800", description: t("dashboardExt.riskLowD") };
}

/* ── Animated Circular Progress ─────────────────────────────────────────── */
function CircularProgress({ value, label, size = 140 }: { value: number; label: string; size?: number }) {
  const r = size / 2 - 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200 dark:text-gray-700" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="circle-progress transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
    </div>
  );
}

/* ── Goal Ring (smaller circular progress for daily goals) ──────────────── */
function GoalRing({ current, goal, label, color, unit }: { current: number; goal: number; label: string; color: string; unit: string }) {
  const pct = Math.min((current / goal) * 100, 100);
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-700" />
          <circle cx="48" cy="48" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="goal-ring transition-all duration-700" />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{current}</span>
          <span className="text-[10px] text-gray-400">/ {goal}{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  );
}

/* ── Mini Bar Chart for health trends ────────────────────────────────────── */
function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-around gap-3 h-32 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{d.value}</span>
          <div className="w-full flex justify-center" style={{ height: "80px", alignItems: "flex-end" }}>
            <div
              className={`w-8 rounded-t-md transition-all duration-700 ${d.color}`}
              style={{ height: `${(d.value / maxVal) * 80}px`, minHeight: "4px" }}
            />
          </div>
          <span className="text-[10px] text-gray-400 text-center truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Health Tip Card ─────────────────────────────────────────────────────── */
function HealthTipCard({ icon, title, tip, color }: { icon: any; title: string; tip: string; color: string }) {
  const Icon = icon;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{tip}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reports, setReports] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Daily metric states
  const [waterIntake, setWaterIntake] = useState(0);
  const [exerciseMin, setExerciseMin] = useState(0);
  const [sleepHrs, setSleepHrs] = useState(0);
  const [bmiHeight, setBmiHeight] = useState("");
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiResult, setBmiResult] = useState<ReturnType<typeof computeBMI>>(null);

  // GET USER & DASHBOARD DATA
  useEffect(() => {
    const getData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const [userRes, medRes, apptRes, reportRes] = await Promise.all([
          fetch("/api/user", { headers }),
          fetch("/api/medicines", { headers }),
          fetch("/api/appointments", { headers }),
          fetch("/api/report-analyzer", { headers }),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData.user);
        }
        if (medRes.ok) {
          const medData = await medRes.json();
          setMedicines(medData.medicines || []);
        }
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setAppointments(apptData.appointments || []);
        }
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          setReports(reportData.reports || []);
        }
      } catch (error) {
        console.log(error);
      }
    };

    getData();
  }, []);

  // Load daily metrics from localStorage on mount
  useEffect(() => {

    setWaterIntake(getDailyMetric("water", 0));
    setExerciseMin(getDailyMetric("exercise", 0));
    setSleepHrs(getDailyMetric("sleep", 0));

    const h = localStorage.getItem("health_height");
    const w = localStorage.getItem("health_weight");
    if (h) setBmiHeight(h);
    if (w) setBmiWeight(w);
    if (h && w) {
      setBmiResult(computeBMI(parseFloat(h), parseFloat(w), t));
    }
  }, [t]);

  // FIND HOSPITALS
  const findHospitals = () => {
    setLoading(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(t("dashboardExt.errLocSupport"));
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const response = await fetch(`/api/hospitals?lat=${lat}&lon=${lon}`);
          const data = await response.json();
          setHospitals(data.hospitals || []);
        } catch (error) {
          console.log(error);
          setLocationError(t("dashboardExt.errLocFetch"));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationError(t("dashboardExt.errLocAllow"));
        setLoading(false);
      }
    );
  };

  // Daily metric update helpers
  const updateWater = (delta: number) => {
    const newVal = Math.max(0, waterIntake + delta);
    setWaterIntake(newVal);
    setDailyMetric("water", newVal);
  };
  const updateExercise = (delta: number) => {
    const newVal = Math.max(0, exerciseMin + delta);
    setExerciseMin(newVal);
    setDailyMetric("exercise", newVal);
  };
  const updateSleep = (delta: number) => {
    const newVal = Math.max(0, Math.round((sleepHrs + delta) * 10) / 10);
    setSleepHrs(newVal);
    setDailyMetric("sleep", newVal);
  };

  const calculateBMI = () => {
    const h = parseFloat(bmiHeight);
    const w = parseFloat(bmiWeight);
    if (!h || !w || h <= 0 || w <= 0) return;
    const result = computeBMI(h, w, t);
    setBmiResult(result);
    localStorage.setItem("health_height", bmiHeight);
    localStorage.setItem("health_weight", bmiWeight);
  };

  const healthScore = user?.health?.healthScore || 0;
  const heartRate = user?.health?.heartRate || 0;
  const steps = user?.health?.steps || 0;

  const [animatedHealthScore, setAnimatedHealthScore] = useState(0);
  const [animatedSteps, setAnimatedSteps] = useState(0);
  const [animatedHeartRate, setAnimatedHeartRate] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTimeout(() => {
        setAnimatedHealthScore(healthScore);
        setAnimatedSteps(steps);
        setAnimatedHeartRate(heartRate);
      }, 0);
      return;
    }

    const stepsCount = 15;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setAnimatedHealthScore(Math.round((healthScore / stepsCount) * currentStep));
      setAnimatedSteps(Math.round((steps / stepsCount) * currentStep));
      setAnimatedHeartRate(Math.round((heartRate / stepsCount) * currentStep));
      if (currentStep >= stepsCount) {
        clearInterval(interval);
        setAnimatedHealthScore(healthScore);
        setAnimatedSteps(steps);
        setAnimatedHeartRate(heartRate);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [healthScore, steps, heartRate]);

  const medicineCount = medicines.length || user?.medicines?.length || 0;

  const today = new Date().toISOString().split("T")[0];
  const upcomingAppointments = appointments
    .filter((a) => a.status === "Booked" && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextAppt = upcomingAppointments[0];

  const recentReports = reports.slice(0, 3);
  const riskLevel = getRiskLevel(healthScore, reports, t);

  // Build health timeline
  const timelineEvents: Array<{ date: string; title: string; type: string; icon: LucideIcon }> = [];
  recentReports.forEach((r) => {
    timelineEvents.push({
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
      title: r.title,
      type: "report",
      icon: FileText,
    });
  });
  upcomingAppointments.slice(0, 2).forEach((a) => {
    timelineEvents.push({
      date: a.date,
      title: `Dr. ${a.doctorName}`,
      type: "appointment",
      icon: Stethoscope,
    });
  });
  user?.symptomsHistory?.slice(0, 2).forEach((s) => {
    timelineEvents.push({
      date: s.date,
      title: s.symptom,
      type: "symptom",
      icon: AlertCircle,
    });
  });
  timelineEvents.sort((a, b) => b.date.localeCompare(a.date));

  // Build health trends data
  const trendsData = reports.slice(0, 6).reverse().map((r, i) => {
    const abnormal = r.parameters?.filter((p: ReportParameter) => p.status !== t("dashboardExt.bmiNormL")).length || 0;
    return {
      label: `R${i + 1}`,
      value: abnormal,
      color: abnormal >= 3 ? "bg-red-500" : abnormal >= 1 ? "bg-amber-500" : "bg-green-500",
    };
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 space-y-8 page-animation">
        {/* Row 1: Welcome Banner + Emergency Button */}
        <div className="animate-dash-header bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <Sparkles size={14} /> {t("dashboardExt.badgeApp")}
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold">
                {t("dashboard.welcomeUser", { name: user?.name || "User" })}
              </h1>
              <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-lg">
                {t("dashboard.subtitle")} {t("dashboardExt.badgeAppDesc")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {user?.profile?.bloodGroup && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Droplet size={12} className="fill-white text-white" />
                    {user.profile.bloodGroup}
                  </span>
                )}
                {user?.profile?.age && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <Calendar size={12} className="text-white" />
                    {user.profile.age} Years
                  </span>
                )}
                {user?.profile?.gender && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                    {user.profile.gender}
                  </span>
                )}
              </div>
            </div>

            {/* Emergency Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setEmergencyOpen(!emergencyOpen)}
                className="emergency-btn bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
              >
                <Siren size={20} /> {t("dashboardExt.btnEmergency")}
              </button>
              {emergencyOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 w-56 z-50 space-y-2">
                  <a href="tel:112" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-600"><Phone size={18} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboardExt.call112")}</p>
                      <p className="text-xs text-gray-400">{t("dashboardExt.natEmerg")}</p>
                    </div>
                  </a>
                  <a href="tel:108" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-600"><Phone size={18} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboardExt.call108")}</p>
                      <p className="text-xs text-gray-400">{t("dashboardExt.ambulance")}</p>
                    </div>
                  </a>
                  <button
                    onClick={() => { router.push("/hospital"); setEmergencyOpen(false); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600"><MapPin size={18} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{t("dashboardExt.findHosp")}</p>
                      <p className="text-xs text-gray-400">{t("dashboardExt.nearEmerg")}</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Health Score + Risk Level + BMI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Health Score */}
          <div className="animate-dash-card delay-1 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <h2 className="text-sm font-bold dark:text-white mb-3 flex items-center gap-2">
              <Shield size={18} className="text-blue-600" /> {t("dashboard.healthScore")}
            </h2>
            <CircularProgress value={animatedHealthScore} label={t("dashboard.healthScore")} size={120} />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {healthScore >= 80 ? t("dashboardExt.healthGreat") : healthScore >= 50 ? t("dashboardExt.healthMod") : t("dashboardExt.healthPoor")}
            </p>
          </div>

          {/* Risk Level */}
          <div className={`animate-dash-card delay-2 rounded-3xl p-6 shadow-md border-2 ${riskLevel.border} ${riskLevel.bg} flex flex-col justify-center hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200`}>
            <h2 className="text-sm font-bold dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle size={18} className={riskLevel.color} /> {t("dashboardExt.riskLevel")}
            </h2>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${riskLevel.color}`}>{riskLevel.label.split(" ")[0]}</div>
              <TrendingDown size={32} className={riskLevel.color} />
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{riskLevel.description}</p>
            <div className="mt-3 flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <HeartPulse size={14} className="text-red-500" />
                <span className="text-gray-600 dark:text-gray-300">{animatedHeartRate || "--"} {t("dashboardExt.unitBpm")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity size={14} className="text-green-500" />
                <span className="text-gray-600 dark:text-gray-300">{animatedSteps || "--"} {t("dashboardExt.unitSteps")}</span>
              </div>
            </div>
          </div>

          {/* BMI Widget */}
          <div className="animate-dash-card delay-3 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <h2 className="text-sm font-bold dark:text-white mb-3 flex items-center gap-2">
              <Scale size={18} className="text-blue-600" /> {t("dashboardExt.bmiCalc")}
            </h2>
            {bmiResult ? (
              <div className="flex flex-col items-center">
                <div className={`text-4xl font-bold ${bmiResult.color}`}>{bmiResult.value}</div>
                <span className={`mt-1 text-sm font-semibold px-3 py-0.5 rounded-full ${bmiResult.bg} ${bmiResult.color}`}>{bmiResult.label}</span>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{bmiResult.advice}</p>
                <button
                  onClick={() => { setBmiResult(null); }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  {t("dashboardExt.btnRecalc")}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="number" value={bmiHeight} onChange={(e) => setBmiHeight(e.target.value)} placeholder={t("dashboardExt.phHeight")} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="number" value={bmiWeight} onChange={(e) => setBmiWeight(e.target.value)} placeholder={t("dashboardExt.phWeight")} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={calculateBMI} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">{t("dashboardExt.btnCalcBmi")}</button>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Daily Goals — Water + Exercise + Sleep */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Water Intake */}
          <div className="animate-dash-card delay-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold dark:text-white flex items-center gap-2"><Droplet size={18} className="text-blue-500" /> {t("dashboardExt.waterTitle")}</h3>
              <span className="text-xs text-gray-400">{t("dashboardExt.waterGoal")}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => updateWater(-1)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"><Minus size={18} /></button>
              <GoalRing current={waterIntake} goal={8} label={t("dashboardExt.waterUnit")} color="#3b82f6" unit="" />
              <button onClick={() => updateWater(1)} className="p-2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900 transition"><Plus size={18} /></button>
            </div>
          </div>

          {/* Exercise Goal */}
          <div className="animate-dash-card delay-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold dark:text-white flex items-center gap-2"><Dumbbell size={18} className="text-green-500" /> {t("dashboardExt.exerTitle")}</h3>
              <span className="text-xs text-gray-400">{t("dashboardExt.exerGoal")}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => updateExercise(-5)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"><Minus size={18} /></button>
              <GoalRing current={exerciseMin} goal={30} label={t("dashboardExt.exerUnit")} color="#22c55e" unit="m" />
              <button onClick={() => updateExercise(5)} className="p-2 rounded-full bg-green-100 dark:bg-green-950 text-green-600 hover:bg-green-200 dark:hover:bg-green-900 transition"><Plus size={18} /></button>
            </div>
          </div>

          {/* Sleep Goal */}
          <div className="animate-dash-card delay-4 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold dark:text-white flex items-center gap-2"><Moon size={18} className="text-purple-500" /> {t("dashboardExt.sleepTitle")}</h3>
              <span className="text-xs text-gray-400">{t("dashboardExt.sleepGoal")}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => updateSleep(-0.5)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"><Minus size={18} /></button>
              <GoalRing current={sleepHrs} goal={8} label={t("dashboardExt.sleepUnit")} color="#a855f7" unit="h" />
              <button onClick={() => updateSleep(0.5)} className="p-2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 hover:bg-purple-200 dark:hover:bg-purple-900 transition"><Plus size={18} /></button>
            </div>
          </div>
        </div>

        {/* Row 4: Today's Medicines + Upcoming Appointment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Medicines */}
          <div className="animate-dash-card delay-5 bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold dark:text-white flex items-center gap-2"><Pill size={18} className="text-blue-600" /> {t("dashboardExt.medTitle")}</h2>
              <button onClick={() => router.push("/medicines")} className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">{t("dashboardExt.viewAll")} <ArrowRight size={12} /></button>
            </div>
            {medicines.length > 0 ? (
              <div className="space-y-2">
                {medicines.slice(0, 4).map((med, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600"><Pill size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{med.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{med.dose} • {med.time}</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 rounded accent-blue-600" defaultChecked={med.taken} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Pill className="mx-auto mb-2 text-gray-300 dark:text-gray-600" size={32} />
                {t("dashboardExt.noMed")}
              </div>
            )}
          </div>

          {/* Upcoming Appointment */}
          <div className="animate-dash-card delay-5 bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 border border-gray-100 dark:border-gray-700 hover:-translate-y-[1px] hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold dark:text-white flex items-center gap-2"><Calendar size={18} className="text-purple-600" /> {t("dashboardExt.appTitle")}</h2>
              <button onClick={() => router.push("/appointments")} className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">{t("dashboardExt.viewAll")} <ArrowRight size={12} /></button>
            </div>
            {nextAppt ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600"><Stethoscope size={24} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Dr. {nextAppt.doctorName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{nextAppt.hospital}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-purple-600">{nextAppt.date}</span>
                    <span className="text-xs text-gray-400">{nextAppt.time}</span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Calendar className="mx-auto mb-2 text-gray-300 dark:text-gray-600" size={32} />
                {t("dashboardExt.noApp")}
              </div>
            )}
          </div>
        </div>

        {/* Row 5: Recent Reports + Health Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold dark:text-white flex items-center gap-2"><FileText size={18} className="text-blue-600" /> {t("dashboardExt.repTitle")}</h2>
              <button onClick={() => router.push("/report-analyzer")} className="text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">{t("dashboardExt.viewAll")} <ArrowRight size={12} /></button>
            </div>
            {recentReports.length > 0 ? (
              <div className="space-y-2">
                {recentReports.map((rep, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => router.push("/report-analyzer")}>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600"><FileText size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{rep.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{rep.specialistToConsult}</p>
                    </div>
                    {rep.createdAt && (
                      <span className="text-xs text-gray-400 shrink-0">{new Date(rep.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <FileText className="mx-auto mb-2 text-gray-300 dark:text-gray-600" size={32} />
                {t("dashboardExt.noRep")}
              </div>
            )}
          </div>

          {/* Health Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-bold dark:text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-600" /> {t("dashboardExt.timeTitle")}</h2>
            {timelineEvents.length > 0 ? (
              <div className="timeline-line relative space-y-4 pl-10">
                {timelineEvents.slice(0, 6).map((evt, idx) => {
                  const Icon = evt.icon;
                  const iconColor = evt.type === "report" ? "text-blue-600 bg-blue-100 dark:bg-blue-950" : evt.type === "appointment" ? "text-purple-600 bg-purple-100 dark:bg-purple-950" : "text-amber-600 bg-amber-100 dark:bg-amber-950";
                  return (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] p-1.5 rounded-lg ${iconColor}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{evt.title}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{evt.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Clock className="mx-auto mb-2 text-gray-300 dark:text-gray-600" size={32} />
                {t("dashboardExt.noEvents")}
              </div>
            )}
          </div>
        </div>

        {/* Row 6: Health Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-bold dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> {t("dashboardExt.trendTitle")}
          </h2>
          {trendsData.length >= 2 ? (
            <MiniBarChart data={trendsData} />
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <TrendingUp className="mx-auto mb-2 text-gray-300 dark:text-gray-600" size={32} />
              {t("dashboardExt.trendNeed")}
            </div>
          )}
        </div>

        {/* Row 7: Quick Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500"><HeartPulse size={22} /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboardExt.statHeart")}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{heartRate || "--"}<span className="text-xs font-normal text-gray-400 ml-1">BPM</span></p></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-500"><Activity size={22} /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboardExt.statSteps")}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{steps || "--"}</p></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500"><Pill size={22} /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboardExt.statMed")}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{medicineCount}</p></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500"><Calendar size={22} /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("dashboardExt.statApp")}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{appointments.length}</p></div>
          </div>
        </div>

        {/* Row 8: Quick Actions */}
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" /> {t("dashboard.quickActions")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <ActionCard title={`${t("nav.reportScanner")}`} description={t("dashboard.scanReport")} link="/report-analyzer" />
            <ActionCard title={`${t("nav.aiChat")}`} description={t("dashboard.askAI")} link="/chat" />
            <ActionCard title={`${t("nav.hospitals")}`} description={t("hospitals.title")} link="/hospital" />
            <ActionCard title={`${t("nav.medicines")}`} description={t("dashboard.addMedicine")} link="/medicines" />
            <ActionCard title={`${t("nav.appointments")}`} description={t("dashboard.bookAppointment")} link="/appointments" />
          </div>
        </div>

        {/* Row 9: Daily Health Tips */}
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-blue-600" /> {t("dashboardExt.tipsTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthTipCard icon={Apple} title={t("dashboardExt.tipWaterT")} tip={t("dashboardExt.tipWaterD")} color="bg-green-50 dark:bg-green-950/40 text-green-600" />
            <HealthTipCard icon={Brain} title={t("dashboardExt.tipMindT")} tip={t("dashboardExt.tipMindD")} color="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
            <HealthTipCard icon={Activity} title={t("dashboardExt.tipActT")} tip={t("dashboardExt.tipActD")} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
            <HealthTipCard icon={Syringe} title={t("dashboardExt.tipPrevT")} tip={t("dashboardExt.tipPrevD")} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
          </div>
        </div>

        {/* Row 10: Hospital Finder */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" /> {t("hospitals.title")}
            </h2>
            <button onClick={findHospitals} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition flex items-center gap-2 shadow-md text-sm">
              <Search size={16} /> {loading ? t("common.loading") : t("common.search")}
            </button>
          </div>
          {locationError && <p className="text-red-500 mb-4 text-sm font-medium">{locationError}</p>}
          <div className="grid md:grid-cols-3 gap-6">
            {hospitals.length > 0 ? (
              hospitals.map((hospital, index) => <HospitalCard key={index} hospital={hospital} />)
            ) : (
              <div className="md:col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
                <MapPin className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                <p className="text-sm">{t("dashboardExt.clickSearch")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
