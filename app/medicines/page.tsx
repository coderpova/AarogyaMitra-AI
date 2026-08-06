"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Pill, Clock, Trash2, Plus, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import {
  cacheMedicines,
  getCachedMedicines,
  saveMedicineOffline,
} from "@/lib/offlineStorage";

export default function MedicinesPage() {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    dose: "",
    time: "",
    reminder: false,
  });

  // ── Network Detection ──────────────────────────────────────────────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      fetchMedicines(); // Re-fetch from server when back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    // Offline: load from cache
    if (!navigator.onLine) {
      const cached = getCachedMedicines();
      setMedicines(cached as any[]);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/medicines", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        const meds = data.medicines || [];
        setMedicines(meds);
        // Cache for offline use
        cacheMedicines(meds);
      }
    } catch (error) {
      console.log("Medicines fetch failed, using cache:", error);
      // Fallback to cache on error
      const cached = getCachedMedicines();
      setMedicines(cached as any[]);
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = async () => {
    if (!formData.name || !formData.dose || !formData.time) {
      toast.error(t("common.required"));
      return;
    }

    // Offline: save locally and queue for sync
    if (!isOnline) {
      saveMedicineOffline(formData as Record<string, unknown>);
      const newMed = {
        ...formData,
        _id: `offline_${Date.now()}`,
        _pendingSync: true,
      };
      const updated = [...medicines, newMed];
      setMedicines(updated);
      cacheMedicines(updated);
      toast.success(t("medicines.addedSuccess") + t("medicinesExt.offlineSuffix"));
      setFormData({ name: "", dose: "", time: "", reminder: false });
      setShowForm(false);

      // Schedule reminder even when offline (browser-level)
      scheduleReminder(newMed);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(t("medicines.addedSuccess"));
        const meds = data.medicines;
        setMedicines(meds);
        // Cache updated list
        cacheMedicines(meds);
        setFormData({ name: "", dose: "", time: "", reminder: false });
        setShowForm(false);
        // Schedule reminder
        scheduleReminder(formData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(t("common.error"));
    }
  };

  const deleteMedicine = async (id: string) => {
    // Offline: remove from local cache only
    if (!isOnline) {
      const updated = medicines.filter((m) => m._id !== id);
      setMedicines(updated);
      cacheMedicines(updated);
      toast.success(t("medicines.deletedSuccess") + t("medicinesExt.offlineSuffix"));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/medicines", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        toast.success(t("medicines.deletedSuccess"));
        fetchMedicines();
      }
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Schedule browser notification for medicine reminder.
   * Works fully offline via the Web Notifications API.
   */
  const scheduleReminder = (medicine: { name: string; dose: string; time: string; reminder: boolean }) => {
    if (!medicine.reminder) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const requestAndSchedule = () => {
      if (!medicine.time) return;

      // Parse time like "08:00 AM" or "After Meal"
      const timeMatch = medicine.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3]?.toUpperCase();

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const delay = target.getTime() - now.getTime();

      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification(`💊 Medicine Reminder — AarogyaMitra`, {
            body: `Time to take ${medicine.name} (${medicine.dose})`,
            icon: "/favicon.ico",
            tag: `med_${medicine.name}`
          });
        }
      }, delay);
    };

    if (Notification.permission === "granted") {
      requestAndSchedule();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          requestAndSchedule();
        }
      });
    }
  };

  // Re-schedule reminders on load (survives page refresh)
  useEffect(() => {
    medicines.forEach((med) => {
      if (med.reminder) {
        scheduleReminder(med);
      }
    });
  }, [medicines]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-lg">{t("common.loading")}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-animation space-y-6">
        <div className={`text-white rounded-3xl p-8 shadow-lg ${isOnline ? "bg-blue-700" : "bg-gray-700"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {t("medicines.title")}
              </h1>
              <p className="text-blue-100 mt-2">{t("medicines.subtitle")}</p>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-2 bg-amber-500/30 px-3 py-2 rounded-xl text-amber-200 text-sm">
                <WifiOff size={16} />
                <span>{t("medicinesExt.offline")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Offline Notice Banner */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm">
            <WifiOff size={18} />
            <div>
              <p className="font-semibold">{t("medicinesExt.workOffline")}</p>
              <p className="text-xs mt-0.5">{t("medicinesExt.offlineDesc")}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-bold dark:text-white">
            {t("dashboard.medicineReminders")} ({medicines.length})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-medium transition shadow-md"
          >
            <Plus size={18} />
            {showForm ? t("common.cancel") : t("medicines.addMedicine")}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-8 mt-6 grid gap-4 border border-gray-200 dark:border-gray-800">
            <input
              placeholder={t("medicines.medicineName")}
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
            />

            <input
              placeholder={t("medicines.dose")}
              value={formData.dose}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dose: e.target.value,
                })
              }
              className="border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
            />

            <input
              placeholder={t("medicines.time")}
              value={formData.time}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  time: e.target.value,
                })
              }
              className="border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
            />

            <label className="flex items-center gap-2 cursor-pointer dark:text-white">
              <input
                type="checkbox"
                checked={formData.reminder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminder: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>{t("medicines.reminder")}</span>
            </label>

            <button
              onClick={addMedicine}
              className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-semibold transition"
            >
              {t("medicines.saveMedicine")}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {medicines.length > 0 ? (
            medicines.map((medicine) => (
              <div
                key={medicine._id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl shadow-lg p-6 flex flex-col justify-between ${
                  medicine._pendingSync
                    ? "border-amber-300 dark:border-amber-700"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Pill className="text-blue-600" size={24} />
                      <h2 className="text-xl font-bold dark:text-white">
                        {medicine.name}
                      </h2>
                    </div>

                    <button
                      onClick={() => deleteMedicine(medicine._id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      title={t("common.delete")}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <p className="mt-4 dark:text-gray-300 text-sm font-medium">
                    {t("medicines.dose")}: {medicine.dose}
                  </p>

                  <div className="flex items-center gap-2 mt-2 dark:text-gray-300 text-sm">
                    <Clock size={16} className="text-blue-600" />
                    <span>{medicine.time}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  {medicine.reminder && (
                    <p className="text-green-600 dark:text-green-400 font-semibold text-xs bg-green-50 dark:bg-green-950/40 px-3 py-1 rounded-full">
                      ✓ {t("medicines.reminder")}
                    </p>
                  )}
                  {medicine._pendingSync && (
                    <p className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full">
                      ⏳ Pending Sync
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-3 text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              <Pill className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400">
                {t("medicines.noMedicines")}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}