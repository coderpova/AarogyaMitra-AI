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
} from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

interface ReportParameter {
  name: string;
  value: string;
  normalRange: string;
  status: "Normal" | "High" | "Low" | "Critical";
}

interface AnalysisResult {
  _id?: string;
  title: string;
  summary: string;
  specialistToConsult: string;
  parameters: ReportParameter[];
  recommendations: string[];
  createdAt?: string;
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
  const [reportText, setReportText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImageBase64(result);
      setImagePreview(result);
      toast.success("Medical report image attached!");
    };
    reader.readAsDataURL(file);
  };

  const analyzeReport = async (textToUse?: string) => {
    const text = textToUse !== undefined ? textToUse : reportText;

    if (!text.trim() && !imageBase64) {
      toast.error("Please upload a report image or select a sample report text.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/report-analyzer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          reportText: text,
          imageBase64: imageBase64,
        }),
      });

      const data = await res.json();

      if (res.ok && data.analysis) {
        setAnalysis(data.analysis);
        toast.success("Report Scanned & Analyzed Successfully!");
        fetchHistory();
      } else {
        toast.error(data.message || "Failed to analyze report");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong analyzing the report");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sampleText: string) => {
    setReportText(sampleText);
    setImageBase64(null);
    setImagePreview(null);
    analyzeReport(sampleText);
  };

  const clearAll = () => {
    setReportText("");
    setImageBase64(null);
    setImagePreview(null);
    setAnalysis(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "High":
        return (
          <span className="bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <AlertTriangle size={14} /> High Marker
          </span>
        );
      case "Low":
        return (
          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <AlertTriangle size={14} /> Low Marker
          </span>
        );
      case "Critical":
        return (
          <span className="bg-rose-600 text-white font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit animate-pulse">
            <AlertTriangle size={14} /> Critical Attention
          </span>
        );
      default:
        return (
          <span className="bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 size={14} /> Normal Range
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="page-animation">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Sparkles size={16} /> AI Health Vision Scanner
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold">
              Medical Report AI Scanner 📄
            </h1>
            <p className="text-blue-100 mt-2 max-w-2xl text-base sm:text-lg">
              Upload blood tests, lab reports, or doctor prescriptions. AI will extract parameters, highlight abnormal markers, explain medical terms, and recommend specialists.
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
            <FileText size={18} /> Scan & Analyze Report
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <History size={18} /> Saved Report History ({history.length})
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
                        setImageBase64(null);
                        setImagePreview(null);
                      }}
                      className="mt-3 text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg font-semibold hover:bg-red-200"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="mx-auto text-blue-600 mb-3" size={44} />
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">
                      Upload Lab Report or Prescription Photo
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                      Supports PNG, JPG, WEBP formats up to 5MB
                    </p>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-block transition shadow-md">
                      Browse File
                      <input
                        type="file"
                        accept="image/*"
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
                  Or Paste Report Parameters / Text
                </label>
                <textarea
                  rows={5}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Paste lab report parameters here (e.g. Fasting Glucose: 154 mg/dL, HbA1c: 8.2%)..."
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
                        Analyzing Report...
                      </>
                    ) : (
                      <>
                        <Activity size={18} /> Analyze Medical Report
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearAll}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Output Column */}
            <div className="lg:col-span-7">
              {loading ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center shadow-lg h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    AI Diagnostic Engine Processing...
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
                    Extracting diagnostic markers, matching normal clinical reference ranges, and generating patient explanation.
                  </p>
                </div>
              ) : analysis ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl space-y-6">
                  {/* Title & Specialist Alert */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Diagnostic Result
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {analysis.title}
                      </h2>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
                      <Stethoscope size={18} className="text-indigo-600" />
                      <span>Consult: {analysis.specialistToConsult}</span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-2xl p-5">
                    <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2 mb-2">
                      <Info size={18} /> Patient Friendly Doctor Explanation
                    </h3>
                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Parameters Table */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
                      <Activity size={18} className="text-blue-600" /> Extracted Lab Markers & Observed Values
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase">
                          <tr>
                            <th className="p-3.5">Marker Name</th>
                            <th className="p-3.5">Observed Value</th>
                            <th className="p-3.5">Normal Reference Range</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                          {analysis.parameters?.length > 0 ? (
                            analysis.parameters.map((param, index) => (
                              <tr
                                key={index}
                                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
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
                              </tr>
                            ))
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
                        <CheckCircle2 size={18} className="text-green-600" /> Actionable Recommendations & Precautions
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

                  {/* Action Navigation Button */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/hospital"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-5 rounded-xl text-center text-sm transition shadow-md flex items-center justify-center gap-2"
                    >
                      <Stethoscope size={18} /> Find Nearby {analysis.specialistToConsult || "Doctors"}
                    </Link>
                    <Link
                      href="/chat"
                      className="border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white font-semibold py-3 px-5 rounded-xl text-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      Ask AI Follow-Up Questions
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center shadow-lg h-full flex flex-col items-center justify-center">
                  <FileCheck className="mx-auto text-blue-500 mb-4" size={56} />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    No Active Scan Result
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                    Upload a medical report image or click one of the <b>Instant Sample Reports</b> on the left to see AI diagnostic report scanning in action!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold dark:text-white">Previously Scanned Reports</h2>
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
                      View Full Analysis <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center text-gray-500">
                No past report history found. Start scanning your medical reports!
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
