"use client";
import { useLanguage } from "@/context/LanguageContext";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Activity, Droplet, HeartPulse, Moon, Scale, Save, Smile, StickyNote } from "lucide-react";
import { calculateBmi } from "@/lib/dailyHealth";

type FormState = {
  steps: string; waterIntakeMl: string; sleepHours: string; weightKg: string; heightCm: string;
  heartRate: string; systolic: string; diastolic: string; bloodSugar: string; mood: string; stressLevel: string; notes: string;
};

const emptyForm: FormState = { steps: "", waterIntakeMl: "", sleepHours: "", weightKg: "", heightCm: "", heartRate: "", systolic: "", diastolic: "", bloodSugar: "", mood: "", stressLevel: "", notes: "" };
const asNumber = (value: string) => value === "" ? undefined : Number(value);

export default function DailyHealthTracking() {
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [score, setScore] = useState(0);
  const [bmi, setBmi] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/health/daily", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const log = data?.log;
        if (!log) return;
        setScore(log.healthScore ?? 0); setBmi(log.bmi ?? null);
        setForm({ steps: String(log.steps ?? ""), waterIntakeMl: String(log.waterIntakeMl ?? ""), sleepHours: String(log.sleepHours ?? ""), weightKg: String(log.weightKg ?? ""), heightCm: String(log.heightCm ?? ""), heartRate: String(log.heartRate ?? ""), systolic: String(log.bloodPressure?.systolic ?? ""), diastolic: String(log.bloodPressure?.diastolic ?? ""), bloodSugar: String(log.bloodSugar ?? ""), mood: log.mood ?? "", stressLevel: String(log.stressLevel ?? ""), notes: log.notes ?? "" });
      }).catch(() => undefined);
  }, []);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const calculatedBmi = calculateBmi(asNumber(form.weightKg), asNumber(form.heightCm));
  const save = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    const body = { steps: asNumber(form.steps), waterIntakeMl: asNumber(form.waterIntakeMl), sleepHours: asNumber(form.sleepHours), weightKg: asNumber(form.weightKg), heightCm: asNumber(form.heightCm), heartRate: asNumber(form.heartRate), bloodSugar: asNumber(form.bloodSugar), stressLevel: asNumber(form.stressLevel), mood: form.mood || undefined, notes: form.notes, bloodPressure: form.systolic && form.diastolic ? { systolic: Number(form.systolic), diastolic: Number(form.diastolic) } : undefined };
    try {
      const response = await fetch("/api/health/daily", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || t("dailyHealth.saveError")); }
      const data = await response.json();
      setScore(data.log.healthScore ?? 0); setBmi(data.log.bmi ?? null); toast.success("Today’s health data saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : t("dailyHealth.saveError")); }
    finally { setSaving(false); }
  };

  const fieldClass = "w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";
  return (
    <section className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-md backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/80">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"><Activity size={20} className="text-blue-600" /> Daily Health Tracking</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Save today’s health metrics for your care history.</p></div><div className="rounded-xl bg-blue-50 px-4 py-2 text-center dark:bg-blue-950/40"><p className="text-xs text-gray-500 dark:text-gray-400">Today’s Health Score</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{score}%</p></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Activity size={17} />} label={t("dailyHealth.steps")}><input className={fieldClass} type="number" min="0" value={form.steps} onChange={(e) => update("steps", e.target.value)} placeholder="e.g. 6000" /></Metric>
        <Metric icon={<Droplet size={17} />} label={t("dailyHealth.water")}><input className={fieldClass} type="number" min="0" value={form.waterIntakeMl} onChange={(e) => update("waterIntakeMl", e.target.value)} placeholder="e.g. 2000" /></Metric>
        <Metric icon={<Moon size={17} />} label={t("dailyHealth.sleep")}><input className={fieldClass} type="number" min="0" max="24" step="0.5" value={form.sleepHours} onChange={(e) => update("sleepHours", e.target.value)} placeholder="e.g. 8" /></Metric>
        <Metric icon={<HeartPulse size={17} />} label={t("dailyHealth.heartRate")}><input className={fieldClass} type="number" min="20" value={form.heartRate} onChange={(e) => update("heartRate", e.target.value)} placeholder="e.g. 72" /></Metric>
        <Metric icon={<Scale size={17} />} label={t("dailyHealth.weight")}><input className={fieldClass} type="number" min="1" step="0.1" value={form.weightKg} onChange={(e) => update("weightKg", e.target.value)} placeholder="e.g. 68" /></Metric>
        <Metric icon={<Scale size={17} />} label={t("dailyHealth.height")}><input className={fieldClass} type="number" min="30" value={form.heightCm} onChange={(e) => update("heightCm", e.target.value)} placeholder="e.g. 170" /></Metric>
        <Metric icon={<HeartPulse size={17} />} label={t("dailyHealth.bp")}><div className="flex gap-2"><input className={fieldClass} type="number" value={form.systolic} onChange={(e) => update("systolic", e.target.value)} placeholder={t("dailyHealth.bpSys")} /><input className={fieldClass} type="number" value={form.diastolic} onChange={(e) => update("diastolic", e.target.value)} placeholder={t("dailyHealth.bpDia")} /></div></Metric>
        <Metric icon={<Activity size={17} />} label={t("dailyHealth.sugar")}><input className={fieldClass} type="number" min="20" value={form.bloodSugar} onChange={(e) => update("bloodSugar", e.target.value)} placeholder={t("dailyHealth.sugarUnit")} /></Metric>
        <Metric icon={<Smile size={17} />} label={t("dailyHealth.mood")}><select className={fieldClass} value={form.mood} onChange={(e) => update("mood", e.target.value)}><option value="">{t("dailyHealth.moodSelect")}</option><option value="great">Great</option><option value="good">Good</option><option value="neutral">Neutral</option><option value="low">Low</option><option value="poor">Poor</option></select></Metric>
        <Metric icon={<Activity size={17} />} label={t("dailyHealth.stress")}><input className={fieldClass} type="number" min="1" max="10" value={form.stressLevel} onChange={(e) => update("stressLevel", e.target.value)} placeholder="e.g. 4" /></Metric>
        <Metric icon={<Scale size={17} />} label={t("dailyHealth.bmi")}><div className="rounded-xl bg-gray-50 p-2.5 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">{calculatedBmi ?? bmi ? `${calculatedBmi ?? bmi} ${t("dailyHealth.bmiUnit")}` : t("dailyHealth.bmiEnter")}</div></Metric>
      </div>
      <div className="mt-4"><label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"><StickyNote size={16} className="text-blue-600" /> Daily notes</label><textarea className={fieldClass} rows={3} maxLength={2000} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything you’d like to remember about today…" /></div>
      <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"><Save size={16} />{saving ? "Saving…" : "Save today’s health"}</button>
    </section>
  );
}

function Metric({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"><span className="text-blue-600">{icon}</span>{label}</span>{children}</label>; }
