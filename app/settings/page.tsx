"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Shield,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useNotification } from "@/context/NotificationContext";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    soundsEnabled,
    setSoundsEnabled,
    medicationSounds,
    setMedicationSounds,
    appointmentSounds,
    setAppointmentSounds,
    alertSounds,
    setAlertSounds,
    browserPermission,
    requestBrowserPermission,
  } = useNotification();

  const [mounted, setMounted] = useState(false);
  const [aiPreferences, setAiPreferences] = useState({
    allowHealthHistory: false,
    allowMedicalReports: false,
    allowMedications: false,
    allowSymptomTimeline: false,
  });

  useEffect(() => {

    setMounted(true);

    async function fetchAiPreferences() {
      try {
        const token = Cookies.get("token") || localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/health-profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.aiPreferences) {
            setAiPreferences({
              allowHealthHistory: data.profile.aiPreferences.allowHealthHistory ?? false,
              allowMedicalReports: data.profile.aiPreferences.allowMedicalReports ?? false,
              allowMedications: data.profile.aiPreferences.allowMedications ?? false,
              allowSymptomTimeline: data.profile.aiPreferences.allowSymptomTimeline ?? false,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load AI preferences:", err);
      }
    }
    fetchAiPreferences();
  }, []);

  const handleToggleAiPref = async (key: keyof typeof aiPreferences, val: boolean) => {
    const updated = { ...aiPreferences, [key]: val };
    setAiPreferences(updated);
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      await fetch("/api/health-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aiPreferences: updated }),
      });
      toast.success("AI Preference updated");
    } catch {
      toast.error("Failed to save AI preference");
    }
  };

  const handleClearAiMemory = async () => {
    if (!confirm("Are you sure you want to clear AI health memory? This disables all AI context access and clears personal memory.")) return;
    try {
      const token = Cookies.get("token") || localStorage.getItem("token");
      const res = await fetch("/api/health-profile?clearAll=true", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAiPreferences({
          allowHealthHistory: false,
          allowMedicalReports: false,
          allowMedications: false,
          allowSymptomTimeline: false,
        });
        toast.success("AI Health Memory cleared successfully");
      }
    } catch {
      toast.error("Failed to clear AI memory");
    }
  };

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    logout();
    window.dispatchEvent(new Event("auth-change"));
    toast.success(t("auth.logoutSuccess"));
    router.push("/login");
  };

  const handleLanguageSelect = async (langCode: string) => {
    if (langCode === language) return;
    await setLanguage(langCode);
    toast.success(
      langCode === "hi"
        ? "भाषा बदलकर हिन्दी कर दी गई है"
        : "Language updated to English"
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold">{t("settings.title")}</h1>
          <p className="text-blue-100 mt-2">{t("settings.subtitle")}</p>
        </div>

        {/* Settings Container */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-8 space-y-6 border border-gray-100 dark:border-gray-800">
          {/* Language Preference Section */}
          <div className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl p-6 transition">
            <div className="flex items-start gap-4">
              <div className="text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 p-3 rounded-xl">
                <Globe size={26} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl dark:text-white">
                  {t("settings.languageSection")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {t("settings.languageDesc")}
                </p>

                {/* Radio Options */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {supportedLanguages.map((langOption) => {
                    const isSelected = language === langOption.code;
                    return (
                      <button
                        key={langOption.code}
                        type="button"
                        onClick={() => handleLanguageSelect(langOption.code)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "border-blue-600 bg-white dark:bg-gray-800 shadow-md ring-2 ring-blue-500/20"
                            : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-400"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">
                              {langOption.nativeName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {langOption.name}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2
                            size={20}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Theme Switch Card */}
          <SettingCard
            icon={!mounted ? <Moon size={24} /> : (theme === "dark" ? <Sun size={24} /> : <Moon size={24} />)}
            title={t("settings.appearance")}
            description={t("settings.appearanceDesc")}
            actionLabel={
              !mounted
                ? t("settings.configure")
                : theme === "dark"
                ? t("settings.switchToLight")
                : t("settings.switchToDark")
            }
            onAction={() => {
              if (mounted) setTheme(theme === "dark" ? "light" : "dark");
            }}
          />

          {/* Notifications Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
                <Bell size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white text-base">{t("settings.notifications")}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.notificationsDesc")}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center">
                <span>Receive Notifications</span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                />
              </div>

              {notificationsEnabled && (
                <>
                  <div className="flex justify-between items-center pl-4">
                    <span>Notification Sounds</span>
                    <input
                      type="checkbox"
                      checked={soundsEnabled}
                      onChange={(e) => setSoundsEnabled(e.target.checked)}
                      className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {soundsEnabled && (
                    <div className="space-y-3 pl-8 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between items-center">
                        <span>Medication reminders</span>
                        <input
                          type="checkbox"
                          checked={medicationSounds}
                          onChange={(e) => setMedicationSounds(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Appointment reminders</span>
                        <input
                          type="checkbox"
                          checked={appointmentSounds}
                          onChange={(e) => setAppointmentSounds(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Important alerts & emergency</span>
                        <input
                          type="checkbox"
                          checked={alertSounds}
                          onChange={(e) => setAlertSounds(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Browser notification requester */}
                  <div className="flex justify-between items-center pl-4">
                    <div className="flex flex-col">
                      <span>Browser Push Notifications</span>
                      <span className="text-[10px] text-gray-400">
                        {browserPermission === "granted"
                          ? "Permission allowed by browser"
                          : browserPermission === "denied"
                          ? "Permission blocked. Update browser settings."
                          : "Requires permission request"}
                      </span>
                    </div>
                    {browserPermission !== "granted" && browserPermission !== "denied" ? (
                      <button
                        onClick={requestBrowserPermission}
                        className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                      >
                        Enable
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 uppercase font-bold">{browserPermission}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Health AI Preferences & Data Controls (Phase 3.5) */}
          <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900/40 rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Shield size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white text-base">Health AI Preferences & Data Controls</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Control which personal health data AarogyaMitra AI is authorized to use for personalized context. All options default to OFF for your privacy.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-semibold">Allow AI to use Health History</span>
                  <span className="text-xs text-gray-400 font-normal">Past conditions and medical history</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.allowHealthHistory}
                  onChange={(e) => handleToggleAiPref("allowHealthHistory", e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-semibold">Allow AI to use Medical Reports</span>
                  <span className="text-xs text-gray-400 font-normal">Lab findings and uploaded diagnostic reports</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.allowMedicalReports}
                  onChange={(e) => handleToggleAiPref("allowMedicalReports", e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-semibold">Allow AI to use Medication Information</span>
                  <span className="text-xs text-gray-400 font-normal">Currently recorded medications and reminders</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.allowMedications}
                  onChange={(e) => handleToggleAiPref("allowMedications", e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="block font-semibold">Allow AI to use Symptom Timeline</span>
                  <span className="text-xs text-gray-400 font-normal">Chronological health events and symptom history</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.allowSymptomTimeline}
                  onChange={(e) => handleToggleAiPref("allowSymptomTimeline", e.target.checked)}
                  className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-500">Disabling permissions stops AI access without deleting stored health records.</span>
                <button
                  type="button"
                  onClick={handleClearAiMemory}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 transition"
                >
                  Clear AI Health Memory
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Card */}
          <SettingCard
            icon={<Shield size={24} />}
            title={t("settings.privacy")}
            description={t("settings.privacyDesc")}
            actionLabel={t("settings.protected")}
            onAction={() => toast.success(t("settings.privacy"))}
          />

          {/* Logout Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition hover:scale-105 shadow-md font-semibold"
            >
              <LogOut size={20} />
              {t("settings.logoutBtn")}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-200 dark:border-gray-800 rounded-2xl p-5 gap-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-center gap-4">
        <div className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-xl">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-lg dark:text-white">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {description}
          </p>
        </div>
      </div>

      <button
        onClick={onAction}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition font-medium text-sm self-start sm:self-center"
      >
        {actionLabel}
      </button>
    </div>
  );
}