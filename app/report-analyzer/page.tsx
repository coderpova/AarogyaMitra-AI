"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FileText,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Activity,
  ArrowRight,
  History,
  Sparkles,
  RefreshCw,
  Info,
  MessageCircle,
  Gauge,
  FlaskConical,
  ListChecks,
  Siren,
  HeartPulse,
} from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface ReportParameter {
  name: string;
  value: string;
  normalRange: string;
  status: "Normal" | "High" | "Low" | "Critical";
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

const SAMPLE_REPORTS = [
  {
    name: "🩸 Diabetes & HbA1c Lab Report",
    text: "Patient Name: Rajesh Verma, Age: 48, Gender: Male. Test Results: Fasting Blood Sugar: 162 mg/dL (Normal: 70-99 mg/dL). Postprandial Blood Sugar: 220 mg/dL (Normal: <140 mg/dL). HbA1c: 8.4% (Normal: <5.7%, High Diabetes Risk: >6.5%). Serum Creatinine: 0.9 mg/dL (Normal: 0.7-1.3 mg/dL).",
  },
  {
    name: "❤️ Lipid Profile (Cholesterol)",
    text: "Patient Name: Sunita Sharma, Age: 52, Gender: Female. Test Results: Total Cholesterol: 245 mg/dL (Normal: <200 mg/dL). Triglycerides: 210 mg/dL (Normal: <150 mg/dL). HDL (Good Cholesterol): 38 mg/dL (Normal: >50 mg/dL). LDL (Bad Cholesterol): 165 mg/dL (Normal: <100 mg/dL).",
  },
  {
    name: "🦋 Thyroid Profile (TSH / T3 / T4)",
    text: "Patient Name: Anita Devi, Age: 36, Gender: Female. Test Results: Serum TSH: 7.8 uIU/mL (Normal: 0.45 - 4.5 uIU/mL). Total T3: 1.1 ng/mL (Normal: 0.8 - 2.0 ng/mL). Total T4: 6.2 ug/dL (Normal: 5.1 - 14.1 ug/dL).",
  },
];

export default function ReportAnalyzerPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [reportText, setReportText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/report-analyzer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to load report history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("This file is too large to analyze. Please upload a smaller medical report (under 4 MB).");
      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setImagePreview(objectUrl);
    toast.success(t("reportAnalyzerExt.succAttach"));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeReport = async (textToUse?: string, isSample?: boolean) => {
    const text = textToUse !== undefined ? textToUse : reportText;

    if (!text.trim() && !selectedFile && !imagePreview) {
      toast.error(t("reportAnalyzerExt.errUpload"));
      return;
    }

    if (selectedFile && selectedFile.size > 4 * 1024 * 1024) {
      toast.error("This file is too large to analyze. Please upload a smaller medical report (under 4 MB).");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (text && text.trim()) {
          formData.append("reportText", text);
        }
        formData.append("language", language);
        if (isSample === true) {
          formData.append("isSample", "true");
        }

        res = await fetch("/api/report-analyzer", {
          method: "POST",
          headers, // Browser sets multipart boundary automatically
          body: formData,
        });
      } else {
        headers["Content-Type"] = "application/json";
        let imageBase64Payload: string | null = null;
        if (imagePreview && !imagePreview.startsWith("blob:")) {
          imageBase64Payload = imagePreview;
        }

        res = await fetch("/api/report-analyzer", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reportText: text,
            imageBase64: imageBase64Payload,
            language: language,
            isSample: isSample === true,
          }),
        });
      }

      if (res.status === 413) {
        toast.error("The uploaded report is too large to process. Please upload a smaller PDF or image.");
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textErr = await res.text();
        data = { error: textErr || "Server error occurred. Please try again." };
      }

      if (!res.ok) {
        console.log(`[ReportAnalyzer UI] requestId=${data.requestId || "N/A"} status=${res.status} errorCode=${data.errorCode || "NONE"}`);
        console.log(`[ReportAnalyzer UI] Error: ${data.error || data.message}`);
      }

      if (res.ok && data.analysis) {
        setAnalysis(data.analysis);
        toast.success(t("common.success"));
        fetchHistory();
      } else {
        const code = data.errorCode || "";
        let userMessage = data.error || data.message;
        
        if (code === "VISION_REQUEST_FAILED") {
          userMessage = "The AI analysis service could not process this report. Please try again.";
        } else if (code === "VISION_JSON_FAILED") {
          userMessage = "The report was read, but its data could not be structured reliably.";
        } else if (code === "VISION_EMPTY_RESPONSE") {
          userMessage = "The AI service returned no usable analysis. Please try again.";
        } else if (code === "VISION_SCHEMA_FAILED") {
          userMessage = "The report data structure could not be validated cleanly. Please try again.";
        } else if (code === "MEDICAL_VALIDATION_FAILED") {
          userMessage = "No valid laboratory parameters could be parsed from the report.";
        } else if (code === "UNREADABLE_REPORT") {
          userMessage = "Unable to reliably read this medical report. Please ensure the document is clear and contains medical lab parameters.";
        } else if (code === "TIMEOUT") {
          userMessage = "Report analysis took too long. Please try again with a smaller or clearer file.";
        } else if (code === "FILE_TOO_LARGE") {
          userMessage = "The uploaded report is too large to process.";
        } else if (code === "FILE_READ_FAILED") {
          userMessage = "This file format cannot be analyzed. Please upload a valid PDF or image.";
        }

        toast.error(userMessage || t("common.error"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to process medical report. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sampleText: string) => {
    setReportText(sampleText);
    setSelectedFile(null);
    setImagePreview(null);
    analyzeReport(sampleText, true);
  };

  // Consult AI Doctor — stores report context in sessionStorage and navigates to chat
  const consultAIDoctor = () => {
    if (!analysis) return;
    const reportData = {
      title: analysis.title,
      summary: analysis.summary,
      specialistToConsult: analysis.specialistToConsult,
      parameters: analysis.parameters,
      recommendations: analysis.recommendations,
      diseaseProbability: analysis.diseaseProbability,
      confidenceScore: analysis.confidenceScore,
      actionPlan: analysis.actionPlan,
      emergencyWarning: analysis.emergencyWarning,
    };
    sessionStorage.setItem("reportContext", JSON.stringify(reportData));
    router.push("/chat?report=1");
  };

  const clearAll = () => {
    setReportText("");
    setSelectedFile(null);
    setImagePreview(null);
    setAnalysis(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "High":
        return (
          <span className="bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <AlertTriangle size={14} /> {t("reportAnalyzer.statusHigh")}
          </span>
        );
      case "Low":
        return (
          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <AlertTriangle size={14} /> {t("reportAnalyzer.statusLow")}
          </span>
        );
      case "Critical":
        return (
          <span className="bg-rose-600 text-white font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit animate-pulse">
            <AlertTriangle size={14} /> {t("reportAnalyzer.statusCritical")}
          </span>
        );
      case "Unknown":
        return (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <Info size={14} /> {t("reportAnalyzer.statusUnknown")}
          </span>
        );
      default:
        return (
          <span className="bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 size={14} /> {t("reportAnalyzer.statusNormal")}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Sparkles size={16} /> AI Health Vision Scanner
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold">
              {t("reportAnalyzer.title")}
            </h1>
            <p className="text-blue-100 mt-2 max-w-2xl text-base sm:text-lg">
              {t("reportAnalyzer.subtitle")}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-4 mt-8 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("scan")}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "scan"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <FileText size={18} /> {t("reportAnalyzer.title")}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <History size={18} /> {t("dashboard.recentReports")} ({history.length})
          </button>
        </div>

        {activeTab === "scan" ? (
          <div className="mt-8 grid lg:grid-cols-12 gap-8">
            {/* Input Column */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quick Sample Selector */}
              <div className="bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-3">
                  <Sparkles size={16} /> Instant One-Click Testing Samples
                </h3>
                <div className="space-y-2">
                  {SAMPLE_REPORTS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSample(sample.text)}
                      className="w-full text-left bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 transition flex justify-between items-center"
                    >
                      <span>{sample.name}</span>
                      <ArrowRight size={14} className="text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6 text-center shadow-md transition hover:border-blue-500">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Report preview"
                      className="max-h-56 mx-auto rounded-xl object-contain shadow-md"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      className="mt-3 text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg font-semibold hover:bg-red-200"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="mx-auto text-blue-600 mb-3" size={44} />
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">
                      {t("reportAnalyzer.dropTitle")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                      {t("reportAnalyzer.dropSubtitle")}
                    </p>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-block transition shadow-md">
                      Browse File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Text Input Fallback */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-md">
                <label className="block font-bold text-gray-800 dark:text-white text-sm mb-2">
                  {t("reportAnalyzer.orPaste")}
                </label>
                <textarea
                  rows={5}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder={t("reportAnalyzer.textPlaceholder")}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => analyzeReport()}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        {t("reportAnalyzer.analyzing")}
                      </>
                    ) : (
                      <>
                        <Activity size={18} /> {t("reportAnalyzer.analyzeBtn")}
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearAll}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Output Column */}
            <div className="lg:col-span-7">
              {loading ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 sm:p-12 text-center shadow-lg h-full flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
                  <div className="relative flex flex-col items-center justify-center z-10 w-full">
                    {/* The Logo Container */}
                    <div className="relative mb-8 mt-4 w-48 h-48 flex items-center justify-center overflow-hidden">
                      {/* Heartbeat Line Animation behind the logo */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-[150%] h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80 ecg-line-anim" />
                      </div>
                      
                      {/* Logo */}
                      <div className="relative z-10 bg-white dark:bg-gray-900 p-6 rounded-full logo-glow-anim border border-blue-100 dark:border-blue-900">
                         <HeartPulse size={48} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight animate-pulse">
                       {t("reportAnalyzer.analyzing") || "Analyzing your report..."}
                    </h3>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-center">
                       {language === "hi" 
                          ? "कृपया प्रतीक्षा करें, हमारा एआई आपके स्वास्थ्य रिपोर्ट का विश्लेषण कर रहा है।" 
                          : "Please wait while our AI medical engine extracts and evaluates your health parameters."}
                    </p>
                  </div>
                </div>
              ) : analysis ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl space-y-6 chat-extra-fade">
                  {/* Emergency Warning */}
                  {analysis.emergencyWarning && analysis.emergencyWarning.trim() !== "" && (
                    <div className="emergency-pulse bg-red-50 dark:bg-red-950/40 rounded-2xl p-4 flex items-start gap-3">
                      <Siren size={24} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-700 dark:text-red-300 text-sm">{t("reportAnalyzerExt.warnEmergency")}</h3>
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{analysis.emergencyWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* Title & Specialist Alert */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          {t("reportAnalyzer.reportSummary")}
                        </span>
                        {analysis.confidenceScore !== undefined && analysis.confidenceScore > 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            analysis.confidenceScore >= 80
                              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                              : analysis.confidenceScore >= 60
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                          }`}>
                            <Gauge size={12} /> {analysis.confidenceScore}% Confidence
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {analysis.title}
                      </h2>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
                      <Stethoscope size={18} className="text-indigo-600" />
                      <span>{t("reportAnalyzer.specialistAdvice")}: {analysis.specialistToConsult}</span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-5">
                    <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2 mb-2">
                      <Info size={18} /> {t("reportAnalyzer.reportSummary")}
                    </h3>
                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Parameters Table */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
                      <Activity size={18} className="text-blue-600" /> {t("reportAnalyzer.parametersFound")}
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase">
                          <tr>
                            <th className="p-3.5">{t("reportAnalyzer.parameter")}</th>
                            <th className="p-3.5">{t("reportAnalyzer.value")}</th>
                            <th className="p-3.5">{t("reportAnalyzer.normalRange")}</th>
                            <th className="p-3.5">{t("reportAnalyzer.status")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                          {analysis.parameters?.length > 0 ? (
                            analysis.parameters.flatMap((param, index) => {
                              const rowClass =
                                param.status === "Critical"
                                  ? "abnormal-row-critical"
                                  : param.status === "High" || param.status === "Low"
                                  ? "abnormal-row"
                                  : "";
                              const rows = [
                                <tr
                                  key={`row-${index}`}
                                  className={`${rowClass} hover:bg-gray-50/50 dark:hover:bg-gray-800/40`}
                                >
                                  <td className="p-3.5 font-semibold text-gray-900 dark:text-white">
                                    {param.name}
                                  </td>
                                  <td className="p-3.5 text-gray-800 dark:text-gray-200 font-bold">
                                    {param.value}
                                  </td>
                                  <td className="p-3.5 text-gray-500 dark:text-gray-400 text-xs">
                                    {param.normalRange}
                                  </td>
                                  <td className="p-3.5">{getStatusBadge(param.status)}</td>
                                </tr>,
                              ];
                              if (param.explanation && param.explanation.trim() !== "") {
                                rows.push(
                                  <tr key={`exp-${index}`}>
                                    <td colSpan={4} className="px-3.5 pb-3.5 pt-0">
                                      <p className="text-xs italic text-gray-500 dark:text-gray-400 pl-2 border-l-2 border-amber-400 dark:border-amber-600">
                                        {param.explanation}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              }
                              return rows;
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-gray-500">
                                Detailed values parsed in summary description above.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {analysis.recommendations?.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" /> {t("reportAnalyzer.recommendations")}
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disease Probability */}
                  {analysis.diseaseProbability && analysis.diseaseProbability.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-5 border border-purple-200 dark:border-purple-800/60">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                        <FlaskConical size={18} className="text-purple-600" /> Disease Probability
                      </h3>
                      <div className="space-y-3">
                        {analysis.diseaseProbability.map((dp, idx) => {
                          const probStr = dp.probability || "";
                          const probNum = parseInt(probStr);
                          const probWidth = !isNaN(probNum) ? Math.min(probNum, 100)
                            : probStr.toLowerCase().includes("high") ? 80
                            : probStr.toLowerCase().includes("moderate") ? 50
                            : 25;
                          const probColor = probWidth >= 70 ? "bg-red-500" : probWidth >= 40 ? "bg-amber-500" : "bg-green-500";
                          return (
                            <div key={idx}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dp.disease}</span>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{dp.probability}</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div className={`${probColor} h-full rounded-full transition-all duration-500`} style={{ width: `${probWidth}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Plan */}
                  {analysis.actionPlan && analysis.actionPlan.length > 0 && (
                    <div className="bg-teal-50 dark:bg-teal-950/30 rounded-2xl p-5 border border-teal-200 dark:border-teal-800/60">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                        <ListChecks size={18} className="text-teal-600" /> Action Plan
                      </h3>
                      <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {analysis.actionPlan.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Action Navigation Button */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/hospital"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-5 rounded-xl text-center text-sm transition shadow-md flex items-center justify-center gap-2"
                    >
                      <Stethoscope size={18} /> {t("hospitals.title")}
                    </Link>
                    <button
                      onClick={consultAIDoctor}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold py-3 px-5 rounded-xl text-center text-sm transition shadow-md flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} /> Consult AI Doctor
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center shadow-lg h-full flex flex-col items-center justify-center">
                  <FileCheck className="mx-auto text-blue-500 mb-4" size={56} />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    No Active Scan Result
                  </h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold dark:text-white">
              {t("dashboard.recentReports")}
            </h2>
            {history.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {history.map((rep) => (
                  <div
                    key={rep._id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-md hover:shadow-lg transition space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {rep.title}
                      </h3>
                      <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-semibold">
                        {rep.specialistToConsult}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                      {rep.summary}
                    </p>

                    <button
                      onClick={() => {
                        setAnalysis(rep);
                        setActiveTab("scan");
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      {t("dashboard.viewDetails")} <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center text-gray-500">
                {t("dashboard.noReports")}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
